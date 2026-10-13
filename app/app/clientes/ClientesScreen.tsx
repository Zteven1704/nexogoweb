"use client";

import { FirebaseError } from "firebase/app";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { SceneFrame } from "@/components/app/DemoMedia";
import { useAuthSession } from "@/components/auth/useAuthSession";
import { Icon } from "@/components/Icon";
import {
  createCompanyClient,
  DuplicateClientError,
  getCompanyClient,
  listCompanyClients,
  parseClientContact,
  sortClientsByName,
  updateCompanyClient,
  type Client,
  type ClientStatus,
  type ClientType,
} from "@/lib/clients";
import { resolveActiveCompanyId } from "@/lib/company";

type TypeFilter = "todos" | "Empresa" | "Persona";

type ClientsLoad =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "no-company" }
  | { status: "ready"; companyId: string; clients: Client[] };

const primaryButtonClass =
  "inline-flex h-11 items-center justify-center rounded-full bg-nexo-deep px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#16345c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue";

const secondaryButtonClass =
  "inline-flex h-11 items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-semibold text-nexo-deep transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue";

const fieldClass =
  "h-11 w-full rounded-xl border border-line bg-white px-4 text-sm text-nexo-deep outline-none placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue";

const cardClass =
  "rounded-2xl border border-line bg-white shadow-[0_16px_40px_-32px_rgba(10,35,66,0.65)]";

const dateFormat = new Intl.DateTimeFormat("es", { dateStyle: "medium" });

function typeLabel(clientType: ClientType): string {
  switch (clientType) {
    case "ORG":
      return "Empresa";
    case "PERSON":
      return "Persona";
    case "PET":
      return "Mascota";
    case "ASSET":
      return "Activo";
    default:
      return "Otro";
  }
}

function contactLabel(client: Client): string {
  return client.emails[0] || client.phones[0] || client.taxId || "Sin contacto";
}

function contactDetails(client: Client): string {
  const values = [...client.emails, ...client.phones].map((item) => item.trim()).filter(Boolean);
  return values.length > 0 ? values.join(" · ") : "Sin contacto";
}

function statusLabel(status: ClientStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Activo";
    case "INACTIVE":
      return "Inactivo";
    default:
      return "Archivado";
  }
}

function formatClientDate(value: Date | null, empty: string): string {
  return value ? dateFormat.format(value) : empty;
}

function matchesType(client: Client, typeFilter: TypeFilter): boolean {
  if (typeFilter === "todos") {
    return true;
  }

  if (typeFilter === "Empresa") {
    return client.clientType === "ORG";
  }

  return client.clientType === "PERSON";
}

function loadErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "No tienes permiso para consultar los clientes de esta empresa.";
  }

  if (error instanceof FirebaseError && error.code === "unavailable") {
    return "No hay conexión con el servicio. Inténtalo de nuevo.";
  }

  return "No se pudieron cargar los clientes.";
}

export function ClientesScreen() {
  const session = useAuthSession();
  const userId = session.status === "authenticated" ? session.user.uid : null;
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [load, setLoad] = useState<ClientsLoad>({ status: "loading" });
  const titleId = useId();
  const detailTitleId = useId();
  const editTitleId = useId();
  const searchId = useId();
  const filterId = useId();

  useEffect(() => {
    if (!userId) {
      return;
    }

    let cancelled = false;

    resolveActiveCompanyId(userId)
      .then(async (companyId) => {
        if (!companyId) {
          return { status: "no-company" } as const;
        }

        const clients = await listCompanyClients(companyId);
        return { status: "ready", companyId, clients } as const;
      })
      .then((result) => {
        if (!cancelled) {
          setLoad(result);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoad({ status: "error", message: loadErrorMessage(error) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const clients = load.status === "ready" ? load.clients : [];
  const visibleClients = clients.filter((client) => {
    const haystack = [
      client.displayName,
      typeLabel(client.clientType),
      contactLabel(client),
      client.taxId,
      ...client.emails,
      ...client.phones,
      ...client.searchTokens,
    ]
      .join(" ")
      .toLocaleLowerCase("es");
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    const matchesQuery = normalizedQuery.length === 0 || haystack.includes(normalizedQuery);
    return matchesQuery && matchesType(client, typeFilter);
  });
  const latestUpdate = clients.reduce<Date | null>((latest, client) => {
    if (!client.updatedAt) {
      return latest;
    }

    if (!latest || client.updatedAt > latest) {
      return client.updatedAt;
    }

    return latest;
  }, null);
  const stats = [
    { label: "Clientes registrados", value: load.status === "ready" ? String(clients.length) : "—" },
    {
      label: "Activos",
      value: load.status === "ready" ? String(clients.filter((client) => client.status === "ACTIVE").length) : "—",
    },
    {
      label: "Última actualización",
      value: latestUpdate ? dateFormat.format(latestUpdate) : "—",
    },
  ];

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const createClient = useCallback(
    async (input: { displayName: string; clientType: "ORG" | "PERSON"; emails: string[]; phones: string[] }) => {
      if (!userId) {
        throw new Error("No hay una sesión activa.");
      }

      if (load.status === "no-company") {
        throw new Error("No hay una empresa activa para registrar el cliente.");
      }

      if (load.status !== "ready") {
        throw new Error("Espera a que termine de cargar el listado.");
      }

      const client = await createCompanyClient(
        {
          companyId: load.companyId,
          displayName: input.displayName,
          clientType: input.clientType,
          emails: input.emails,
          phones: input.phones,
          createdBy: userId,
        },
        load.clients,
      );

      setLoad((current) =>
        current.status === "ready"
          ? { ...current, clients: sortClientsByName([...current.clients, client]) }
          : current,
      );
      setNotice("Cliente creado.");
      setModalOpen(false);
    },
    [load, userId],
  );

  const updateClient = useCallback(
    async (input: {
      clientId: string;
      displayName: string;
      clientType: ClientType;
      emails: string[];
      phones: string[];
    }) => {
      if (!userId) {
        throw new Error("No hay una sesión activa.");
      }

      if (load.status === "no-company") {
        throw new Error("No hay una empresa activa para modificar el cliente.");
      }

      if (load.status !== "ready") {
        throw new Error("Espera a que termine de cargar el listado.");
      }

      const client = await updateCompanyClient(
        {
          companyId: load.companyId,
          clientId: input.clientId,
          displayName: input.displayName,
          clientType: input.clientType,
          emails: input.emails,
          phones: input.phones,
          updatedBy: userId,
        },
        load.clients,
      );

      setLoad((current) =>
        current.status === "ready"
          ? {
              ...current,
              clients: sortClientsByName(current.clients.map((item) => (item.id === client.id ? client : item))),
            }
          : current,
      );
      setNotice("Cliente actualizado.");
      setEditingId(null);
    },
    [load, userId],
  );

  return (
    <section className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-balance text-nexo-deep sm:text-4xl">
            Clientes
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-pretty text-muted sm:text-lg sm:leading-8">
            Centraliza la información de las personas y organizaciones con las que trabaja tu
            empresa.
          </p>
          {notice ? (
            <p role="status" className="mt-3 text-sm font-medium text-nexo-cyan">
              {notice}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className={`${primaryButtonClass} w-full shrink-0 sm:w-auto`}
          onClick={() => setModalOpen(true)}
        >
          + Nuevo cliente
        </button>
      </div>

      <ul className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-3">
        {stats.map((stat) => (
          <li key={stat.label}>
            <article className={`${cardClass} p-5`}>
              <p className="text-sm font-medium text-muted">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-nexo-deep">{stat.value}</p>
            </article>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <label htmlFor={searchId} className="sr-only">
            Buscar cliente
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar cliente..."
            autoComplete="off"
            className={fieldClass}
          />
        </div>
        <div className="sm:w-52">
          <label htmlFor={filterId} className="sr-only">
            Filtrar por tipo
          </label>
          <select
            id={filterId}
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
            className={fieldClass}
          >
            <option value="todos">Filtrar: todos</option>
            <option value="Empresa">Filtrar: empresa</option>
            <option value="Persona">Filtrar: persona</option>
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start">
        <div className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold text-nexo-deep">Listado de clientes</h2>
          </div>
          <ClientList
            load={load}
            visibleClients={visibleClients}
            sessionMessage={session.status === "error" ? session.message : null}
            onView={setViewingId}
            onEdit={setEditingId}
          />
        </div>

        <aside className={`${cardClass} overflow-hidden`}>
          <SceneFrame
            src="/images/sector-consultorias.jpg"
            alt="Profesionales revisando documentos en una reunión de trabajo."
            className="h-32"
          />
          <div className="p-5 sm:p-6">
            <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-nexo-blue">
              <Icon name="users" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-nexo-deep">Organiza mejor la información</h2>
            <p className="mt-2 text-sm leading-6 text-pretty text-muted">
              NexoGo conecta clientes, expedientes y documentos para mantener la información
              empresarial organizada y accesible.
            </p>
          </div>
        </aside>
      </div>

      {modalOpen ? (
        <NewClientModal titleId={titleId} onClose={closeModal} onCreate={createClient} />
      ) : null}
      {viewingId && load.status === "ready" ? (
        <ClientDetailModal
          titleId={detailTitleId}
          companyId={load.companyId}
          clientId={viewingId}
          onClose={() => setViewingId(null)}
        />
      ) : null}
      {editingId && load.status === "ready" ? (
        <EditClientModal
          titleId={editTitleId}
          companyId={load.companyId}
          clientId={editingId}
          onClose={() => setEditingId(null)}
          onSave={updateClient}
        />
      ) : null}
    </section>
  );
}

function ClientList({
  load,
  visibleClients,
  sessionMessage,
  onView,
  onEdit,
}: {
  load: ClientsLoad;
  visibleClients: Client[];
  sessionMessage: string | null;
  onView: (clientId: string) => void;
  onEdit: (clientId: string) => void;
}) {
  if (sessionMessage) {
    return (
      <p role="alert" className="px-5 py-12 text-center text-sm leading-6 text-red-700">
        {sessionMessage}
      </p>
    );
  }

  if (load.status === "loading") {
    return (
      <p role="status" className="px-5 py-12 text-center text-sm leading-6 text-muted">
        Cargando clientes
      </p>
    );
  }

  if (load.status === "error") {
    return (
      <p role="alert" className="px-5 py-12 text-center text-sm leading-6 text-red-700">
        {load.message}
      </p>
    );
  }

  if (load.status === "no-company") {
    return (
      <div className="px-5 py-12 text-center">
        <p className="text-sm font-semibold text-nexo-deep">No hay una empresa activa</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
          Cuando tu cuenta tenga una membresía activa, los clientes de esa empresa aparecerán aquí.
        </p>
      </div>
    );
  }

  if (load.clients.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="text-sm font-semibold text-nexo-deep">Todavía no hay clientes</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
          Esta empresa no tiene clientes registrados.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="sr-only" role="status">
        {visibleClients.length} clientes visibles.
      </p>
      {visibleClients.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm leading-6 text-muted">
          Ningún cliente coincide con la búsqueda.
        </p>
      ) : (
        <ul>
          <li className="hidden border-b border-line px-5 py-3 text-xs font-semibold tracking-wide text-muted uppercase md:grid md:grid-cols-[minmax(0,1.5fr)_7.5rem_minmax(0,1fr)_auto] md:gap-4">
            <span>Nombre</span>
            <span>Tipo</span>
            <span>Contacto</span>
            <span className="sr-only">Acciones</span>
          </li>
          {visibleClients.map((client) => (
            <li key={client.id} className="border-b border-line px-5 py-4 last:border-b-0">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_7.5rem_minmax(0,1fr)_auto] md:items-center md:gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <ClientMark client={client} />
                  <div className="min-w-0">
                    <p className="font-semibold text-nexo-deep">{client.displayName || "Sin nombre"}</p>
                    <div className="mt-1 md:hidden">
                      <TypeBadge type={typeLabel(client.clientType)} />
                    </div>
                  </div>
                </div>
                <div className="hidden md:block">
                  <TypeBadge type={typeLabel(client.clientType)} />
                </div>
                <p className="text-sm break-all text-muted">{contactLabel(client)}</p>
                <RowActions
                  name={client.displayName || "Sin nombre"}
                  onView={() => onView(client.id)}
                  onEdit={() => onEdit(client.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ClientMark({ client }: { client: Client }) {
  const avatarUrl = client.media.avatarUrl;
  const rounded = client.clientType === "PERSON" || client.clientType === "PET" ? "rounded-full" : "rounded-xl";
  const frameClass = `relative block size-10 shrink-0 overflow-hidden border border-line bg-white shadow-[0_8px_18px_-14px_rgba(10,35,66,0.9)] ${rounded}`;

  if (avatarUrl.startsWith("https://") || avatarUrl.startsWith("http://")) {
    return (
      <span className={frameClass}>
        {/* eslint-disable-next-line @next/next/no-img-element -- avatar URLs come from Firestore and are not local images */}
        <img src={avatarUrl} alt="" className="size-full object-cover" />
      </span>
    );
  }

  const initials = client.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("es") ?? "")
    .join("");

  return (
    <span
      className={`grid size-10 shrink-0 place-items-center border border-line text-xs font-semibold text-nexo-deep ${rounded} ${
        client.clientType === "ORG" ? "bg-blue-50" : "bg-cyan-50"
      }`}
      aria-hidden="true"
    >
      {initials || "—"}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        type === "Empresa" ? "bg-blue-50 text-nexo-blue" : "bg-cyan-50 text-nexo-cyan"
      }`}
    >
      {type}
    </span>
  );
}

function RowActions({
  name,
  onView,
  onEdit,
}: {
  name: string;
  onView: () => void;
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative justify-self-start md:justify-self-end">
      <button
        type="button"
        className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-white px-3.5 text-sm font-semibold text-nexo-deep transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        Acciones
        <span className="sr-only"> de {name}</span>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={`Acciones para ${name}`}
          className="absolute top-full left-0 z-20 mt-2 w-52 rounded-xl border border-line bg-white p-1.5 shadow-[0_16px_40px_-24px_rgba(10,35,66,0.45)] md:right-0 md:left-auto"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-nexo-deep hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onView();
            }}
          >
            Ver
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-nexo-deep hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            Editar
          </button>
        </div>
      ) : null}
    </div>
  );
}

function writeErrorMessage(error: unknown, action: "crear" | "guardar"): string {
  if (error instanceof DuplicateClientError) {
    return error.message;
  }

  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return action === "crear"
      ? "No tienes permiso para crear clientes en esta empresa."
      : "No tienes permiso para modificar este cliente.";
  }

  if (error instanceof FirebaseError && error.code === "unavailable") {
    return "No hay conexión con el servicio. Inténtalo de nuevo.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return action === "crear" ? "No se pudo crear el cliente." : "No se pudo guardar el cliente.";
}

function readErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "No tienes permiso para consultar este cliente.";
  }

  if (error instanceof FirebaseError && error.code === "unavailable") {
    return "No hay conexión con el servicio. Inténtalo de nuevo.";
  }

  return "No se pudo consultar el cliente.";
}

function NewClientModal({
  titleId,
  onClose,
  onCreate,
}: {
  titleId: string;
  onClose: () => void;
  onCreate: (input: {
    displayName: string;
    clientType: "ORG" | "PERSON";
    emails: string[];
    phones: string[];
  }) => Promise<void>;
}) {
  const nameId = useId();
  const typeId = useId();
  const contactId = useId();
  const [name, setName] = useState("");
  const [type, setType] = useState<"Empresa" | "Persona">("Empresa");
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, saving]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end p-4 sm:place-items-center">
      <button
        type="button"
        className="absolute inset-0 bg-nexo-deep/40"
        aria-label="Cerrar"
        onClick={() => {
          if (!saving) {
            onClose();
          }
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg rounded-2xl border border-line bg-white p-5 shadow-[0_24px_60px_-28px_rgba(10,35,66,0.55)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-nexo-cyan uppercase">
              Clientes
            </p>
            <h2 id={titleId} className="mt-1 text-xl font-semibold text-nexo-deep">
              Nuevo cliente
            </h2>
          </div>
          <button
            type="button"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line text-nexo-deep hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue"
            onClick={onClose}
            disabled={saving}
          >
            <span className="sr-only">Cerrar</span>
            <span aria-hidden="true" className="text-lg leading-none">
              ×
            </span>
          </button>
        </div>
        {error ? (
          <p role="alert" className="mt-3 text-sm leading-6 text-red-700">
            {error}
          </p>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted">Registra el cliente en la empresa activa.</p>
        )}
        <form
          className="mt-5 space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (savingRef.current) {
              return;
            }

            const displayName = name.trim();
            if (!displayName) {
              setError("Escribe el nombre del cliente.");
              return;
            }

            const parsedContact = parseClientContact(contact);
            if ("error" in parsedContact) {
              setError(parsedContact.error);
              return;
            }

            savingRef.current = true;
            setSaving(true);
            setError(null);
            void onCreate({
              displayName,
              clientType: type === "Persona" ? "PERSON" : "ORG",
              emails: parsedContact.emails,
              phones: parsedContact.phones,
            }).catch((submitError: unknown) => {
              savingRef.current = false;
              setError(writeErrorMessage(submitError, "crear"));
              setSaving(false);
            });
          }}
        >
          <div>
            <label htmlFor={nameId} className="text-sm font-medium text-nexo-deep">
              Nombre
            </label>
            <input
              id={nameId}
              name="nombre"
              type="text"
              autoComplete="off"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className={`${fieldClass} mt-2`}
            />
          </div>
          <div>
            <label htmlFor={typeId} className="text-sm font-medium text-nexo-deep">
              Tipo
            </label>
            <select
              id={typeId}
              name="tipo"
              value={type}
              onChange={(event) => setType(event.target.value as "Empresa" | "Persona")}
              className={`${fieldClass} mt-2`}
            >
              <option value="Empresa">Empresa</option>
              <option value="Persona">Persona</option>
            </select>
          </div>
          <div>
            <label htmlFor={contactId} className="text-sm font-medium text-nexo-deep">
              Contacto
            </label>
            <input
              id={contactId}
              name="contacto"
              type="text"
              autoComplete="off"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              className={`${fieldClass} mt-2`}
            />
          </div>
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className={`${primaryButtonClass} disabled:opacity-70`} disabled={saving}>
              {saving ? "Guardando" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const editableClientTypes: readonly ClientType[] = ["PERSON", "ORG", "PET", "ASSET", "CUSTOM"];

type ClientRead =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; client: Client };

function useClientDialog(onClose: () => void) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);
}

function ClientDialog({
  titleId,
  title,
  onClose,
  children,
}: {
  titleId: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end p-4 sm:place-items-center">
      <button type="button" className="absolute inset-0 bg-nexo-deep/40" aria-label="Cerrar" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[min(100%,40rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-white p-5 shadow-[0_24px_60px_-28px_rgba(10,35,66,0.55)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-nexo-cyan uppercase">Clientes</p>
            <h2 id={titleId} className="mt-1 text-xl font-semibold text-nexo-deep">
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line text-nexo-deep hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue"
            onClick={onClose}
          >
            <span className="sr-only">Cerrar</span>
            <span aria-hidden="true" className="text-lg leading-none">
              ×
            </span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function useCompanyClient(companyId: string, clientId: string): ClientRead {
  const [read, setRead] = useState<ClientRead>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    getCompanyClient(companyId, clientId)
      .then((client) => {
        if (!cancelled) {
          setRead(client ? { status: "ready", client } : { status: "missing" });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setRead({ status: "error", message: readErrorMessage(error) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, companyId]);

  return read;
}

function ClientDetailModal({
  titleId,
  companyId,
  clientId,
  onClose,
}: {
  titleId: string;
  companyId: string;
  clientId: string;
  onClose: () => void;
}) {
  const read = useCompanyClient(companyId, clientId);
  useClientDialog(onClose);

  return (
    <ClientDialog titleId={titleId} title="Detalle del cliente" onClose={onClose}>
      <ClientReadBody read={read} />
    </ClientDialog>
  );
}

function ClientReadBody({ read }: { read: ClientRead }) {
  if (read.status === "loading") {
    return (
      <p role="status" className="mt-5 text-sm leading-6 text-muted">
        Cargando cliente
      </p>
    );
  }

  if (read.status === "missing") {
    return (
      <p role="alert" className="mt-5 text-sm leading-6 text-red-700">
        No se encontró el cliente.
      </p>
    );
  }

  if (read.status === "error") {
    return (
      <p role="alert" className="mt-5 text-sm leading-6 text-red-700">
        {read.message}
      </p>
    );
  }

  const client = read.client;

  return (
    <dl className="mt-5 space-y-3 text-sm">
      <DetailRow label="Nombre" value={client.displayName || "Sin nombre"} />
      <div className="flex items-center justify-between gap-4">
        <dt className="text-muted">Tipo</dt>
        <dd>
          <TypeBadge type={typeLabel(client.clientType)} />
        </dd>
      </div>
      <DetailRow label="Contacto" value={contactDetails(client)} />
      <DetailRow label="Estado" value={statusLabel(client.status)} />
      <DetailRow label="Creado" value={formatClientDate(client.createdAt, "Sin fecha de creación")} />
      <DetailRow label="Actualizado" value={formatClientDate(client.updatedAt, "Sin fecha de actualización")} />
      {client.archivedAt ? <DetailRow label="Archivado" value={dateFormat.format(client.archivedAt)} /> : null}
    </dl>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium break-all text-nexo-deep">{value}</dd>
    </div>
  );
}

function EditClientModal({
  titleId,
  companyId,
  clientId,
  onClose,
  onSave,
}: {
  titleId: string;
  companyId: string;
  clientId: string;
  onClose: () => void;
  onSave: (input: {
    clientId: string;
    displayName: string;
    clientType: ClientType;
    emails: string[];
    phones: string[];
  }) => Promise<void>;
}) {
  const read = useCompanyClient(companyId, clientId);
  const [saving, setSaving] = useState(false);
  const requestClose = useCallback(() => {
    if (!saving) {
      onClose();
    }
  }, [onClose, saving]);

  useClientDialog(requestClose);

  return (
    <ClientDialog titleId={titleId} title="Editar cliente" onClose={requestClose}>
      {read.status === "ready" ? (
        <EditClientForm client={read.client} saving={saving} setSaving={setSaving} onSave={onSave} onClose={requestClose} />
      ) : (
        <ClientReadBody read={read} />
      )}
    </ClientDialog>
  );
}

function EditClientForm({
  client,
  saving,
  setSaving,
  onSave,
  onClose,
}: {
  client: Client;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  onSave: (input: {
    clientId: string;
    displayName: string;
    clientType: ClientType;
    emails: string[];
    phones: string[];
  }) => Promise<void>;
  onClose: () => void;
}) {
  const nameId = useId();
  const typeId = useId();
  const contactId = useId();
  const [name, setName] = useState(client.displayName);
  const [clientType, setClientType] = useState<ClientType>(client.clientType);
  const [contact, setContact] = useState(client.emails[0] || client.phones[0] || "");
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const keepsPhone = client.emails.length > 0 && client.phones.length > 0;

  return (
    <form
      className="mt-5 space-y-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (savingRef.current) {
          return;
        }

        const displayName = name.trim();
        if (!displayName) {
          setError("Escribe el nombre del cliente.");
          return;
        }

        const parsedContact = parseClientContact(contact);
        if ("error" in parsedContact) {
          setError(parsedContact.error);
          return;
        }

        savingRef.current = true;
        setSaving(true);
        setError(null);
        void onSave({
          clientId: client.id,
          displayName,
          clientType,
          emails: parsedContact.emails,
          phones: parsedContact.phones,
        }).catch((submitError: unknown) => {
          savingRef.current = false;
          setError(writeErrorMessage(submitError, "guardar"));
          setSaving(false);
        });
      }}
    >
      {error ? (
        <p role="alert" className="text-sm leading-6 text-red-700">
          {error}
        </p>
      ) : (
        <p className="text-sm leading-6 text-muted">Actualiza los datos de este cliente.</p>
      )}
      <div>
        <label htmlFor={nameId} className="text-sm font-medium text-nexo-deep">
          Nombre
        </label>
        <input
          id={nameId}
          name="nombre"
          type="text"
          autoComplete="off"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className={`${fieldClass} mt-2`}
        />
      </div>
      <div>
        <label htmlFor={typeId} className="text-sm font-medium text-nexo-deep">
          Tipo
        </label>
        <select
          id={typeId}
          name="tipo"
          value={clientType}
          onChange={(event) => setClientType(event.target.value as ClientType)}
          className={`${fieldClass} mt-2`}
        >
          {editableClientTypes.map((type) => (
            <option key={type} value={type}>
              {typeLabel(type)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={contactId} className="text-sm font-medium text-nexo-deep">
          Contacto
        </label>
        <input
          id={contactId}
          name="contacto"
          type="text"
          autoComplete="off"
          value={contact}
          onChange={(event) => setContact(event.target.value)}
          className={`${fieldClass} mt-2`}
        />
        {keepsPhone ? (
          <p className="mt-2 text-sm leading-6 text-muted">El teléfono registrado se conserva.</p>
        ) : null}
      </div>
      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button type="submit" className={`${primaryButtonClass} disabled:opacity-70`} disabled={saving}>
          {saving ? "Guardando" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
