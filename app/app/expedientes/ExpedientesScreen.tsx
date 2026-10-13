"use client";

import { FirebaseError } from "firebase/app";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ExpedienteMark, SceneFrame, type ExpedienteVisual } from "@/components/app/DemoMedia";
import { useAuthSession } from "@/components/auth/useAuthSession";
import { Icon } from "@/components/Icon";
import { listCompanyClients, type Client } from "@/lib/clients";
import { resolveActiveCompanyId } from "@/lib/company";
import {
  createCompanyRecord,
  DuplicateRecordError,
  getCompanyRecord,
  listCompanyRecords,
  sortRecordsByUpdated,
  updateCompanyRecord,
  type Record as CompanyRecord,
  type RecordStatus,
  type RecordType,
} from "@/lib/records";

type StatusFilter = "todos" | "DRAFT" | "FINAL";
type TypeFilter = "todos" | RecordType;

type RecordsLoad =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "no-company" }
  | { status: "ready"; companyId: string; records: CompanyRecord[]; clients: Client[] };

const primaryButtonClass =
  "inline-flex h-11 items-center justify-center rounded-full bg-nexo-deep px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#16345c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue";

const secondaryButtonClass =
  "inline-flex h-11 items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-semibold text-nexo-deep transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue";

const fieldClass =
  "h-11 w-full rounded-xl border border-line bg-white px-4 text-sm text-nexo-deep outline-none placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue";

const cardClass =
  "rounded-2xl border border-line bg-white shadow-[0_16px_40px_-32px_rgba(10,35,66,0.65)]";

const columnsClass =
  "md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_8.5rem_minmax(0,1fr)]";

const dateFormat = new Intl.DateTimeFormat("es", { dateStyle: "medium" });

const recordTypeOptions: { value: RecordType; label: string }[] = [
  { value: "CLINICAL_HISTORY", label: "Historia clínica" },
  { value: "CONTRACT", label: "Contrato" },
  { value: "INVOICE", label: "Factura" },
  { value: "REPORT", label: "Informe" },
  { value: "TECHNICAL_DOC", label: "Documento técnico" },
  { value: "ATTACHMENT_PACK", label: "Adjuntos" },
  { value: "NOTE", label: "Nota" },
  { value: "CUSTOM", label: "Otro" },
];

function typeLabel(recordType: RecordType): string {
  return recordTypeOptions.find((option) => option.value === recordType)?.label ?? "Otro";
}

function statusLabel(status: RecordStatus): string {
  if (status === "FINAL") {
    return "Final";
  }

  if (status === "ARCHIVED") {
    return "Archivado";
  }

  return "Borrador";
}

function expedienteTone(recordType: RecordType): ExpedienteVisual {
  if (recordType === "CONTRACT" || recordType === "INVOICE") {
    return "comercial";
  }

  if (recordType === "NOTE" || recordType === "ATTACHMENT_PACK" || recordType === "CUSTOM") {
    return "demo";
  }

  return "administrativo";
}

function recordInfo(record: CompanyRecord): string {
  return record.summary || record.category || typeLabel(record.recordType);
}

function loadErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "No tienes permiso para consultar los expedientes de esta empresa.";
  }

  if (error instanceof FirebaseError && error.code === "unavailable") {
    return "No hay conexión con el servicio. Inténtalo de nuevo.";
  }

  return "No se pudieron cargar los expedientes.";
}

export function ExpedientesScreen() {
  const session = useAuthSession();
  const userId = session.status === "authenticated" ? session.user.uid : null;
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [clientFilter, setClientFilter] = useState("todos");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("todos");
  const [createOpen, setCreateOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [load, setLoad] = useState<RecordsLoad>({ status: "loading" });
  const searchId = useId();
  const statusFilterId = useId();
  const clientFilterId = useId();
  const typeFilterId = useId();
  const createTitleId = useId();
  const detailTitleId = useId();
  const editTitleId = useId();

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

        const [records, clients] = await Promise.all([
          listCompanyRecords(companyId),
          listCompanyClients(companyId),
        ]);

        return { status: "ready", companyId, records, clients } as const;
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

  const records = load.status === "ready" ? load.records : [];
  const clients = load.status === "ready" ? load.clients : [];
  const clientNames = useMemo(() => {
    const names = new Map<string, string>();
    const source = load.status === "ready" ? load.clients : [];

    for (const client of source) {
      if (client.displayName) {
        names.set(client.id, client.displayName);
      }
    }

    return names;
  }, [load]);

  const visibleRecords = records.filter((record) => {
    const clientName = clientNames.get(record.clientId) ?? "";
    const haystack = [
      record.title,
      record.summary,
      record.category,
      typeLabel(record.recordType),
      statusLabel(record.status),
      clientName,
      ...record.tags,
      ...record.searchTokens,
    ]
      .join(" ")
      .toLocaleLowerCase("es");
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    const matchesQuery = normalizedQuery.length === 0 || haystack.includes(normalizedQuery);
    const matchesStatus = statusFilter === "todos" || record.status === statusFilter;
    const matchesClient = clientFilter === "todos" || record.clientId === clientFilter;
    const matchesType = typeFilter === "todos" || record.recordType === typeFilter;

    return matchesQuery && matchesStatus && matchesClient && matchesType;
  });
  const stats = [
    { label: "Expedientes activos", value: load.status === "ready" ? String(records.length) : "—" },
    {
      label: "Borradores",
      value: load.status === "ready" ? String(records.filter((record) => record.status === "DRAFT").length) : "—",
    },
    {
      label: "Finalizados",
      value: load.status === "ready" ? String(records.filter((record) => record.status === "FINAL").length) : "—",
    },
  ];

  const closeCreate = useCallback(() => {
    setCreateOpen(false);
  }, []);

  const createRecord = useCallback(
    async (input: { clientId: string; title: string; recordType: RecordType; summary: string }) => {
      if (!userId) {
        throw new Error("No hay una sesión activa.");
      }

      if (load.status === "no-company") {
        throw new Error("No hay una empresa activa para registrar el expediente.");
      }

      if (load.status !== "ready") {
        throw new Error("Espera a que termine de cargar el listado.");
      }

      const record = await createCompanyRecord(
        {
          companyId: load.companyId,
          clientId: input.clientId,
          title: input.title,
          recordType: input.recordType,
          summary: input.summary,
          createdBy: userId,
        },
        load.records,
      );

      setLoad((current) =>
        current.status === "ready"
          ? { ...current, records: sortRecordsByUpdated([...current.records, record]) }
          : current,
      );
      setNotice("Expediente creado.");
      setCreateOpen(false);
    },
    [load, userId],
  );

  const updateRecord = useCallback(
    async (input: { recordId: string; title: string; recordType: RecordType; summary: string }) => {
      if (!userId) {
        throw new Error("No hay una sesión activa.");
      }

      if (load.status === "no-company") {
        throw new Error("No hay una empresa activa para modificar el expediente.");
      }

      if (load.status !== "ready") {
        throw new Error("Espera a que termine de cargar el listado.");
      }

      const record = await updateCompanyRecord(
        {
          companyId: load.companyId,
          recordId: input.recordId,
          title: input.title,
          recordType: input.recordType,
          summary: input.summary,
          updatedBy: userId,
        },
        load.records,
      );

      setLoad((current) =>
        current.status === "ready"
          ? {
              ...current,
              records: sortRecordsByUpdated(
                current.records.map((item) => (item.id === record.id ? record : item)),
              ),
            }
          : current,
      );
      setNotice("Expediente actualizado.");
      setEditingId(null);
    },
    [load, userId],
  );

  const closeDetail = useCallback(() => {
    setSelectedId(null);
  }, []);

  const closeEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  return (
    <section className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-balance text-nexo-deep sm:text-4xl">
            Expedientes
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-pretty text-muted sm:text-lg sm:leading-8">
            Organiza la información y documentación relacionada con cada cliente en un solo lugar.
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
          onClick={() => {
            setSelectedId(null);
            setCreateOpen(true);
          }}
        >
          + Nuevo expediente
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

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="min-w-0 flex-1">
          <label htmlFor={searchId} className="sr-only">
            Buscar expediente
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar expediente..."
            autoComplete="off"
            className={fieldClass}
          />
        </div>
        <div className="sm:w-48">
          <label htmlFor={statusFilterId} className="sr-only">
            Filtrar por estado
          </label>
          <select
            id={statusFilterId}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className={fieldClass}
          >
            <option value="todos">Todos</option>
            <option value="DRAFT">Borradores</option>
            <option value="FINAL">Finalizados</option>
          </select>
        </div>
        <div className="sm:w-56">
          <label htmlFor={clientFilterId} className="sr-only">
            Filtrar por cliente
          </label>
          <select
            id={clientFilterId}
            value={clientFilter}
            onChange={(event) => setClientFilter(event.target.value)}
            className={fieldClass}
          >
            <option value="todos">Todos los clientes</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.displayName || "Sin nombre"}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:w-56">
          <label htmlFor={typeFilterId} className="sr-only">
            Filtrar por tipo
          </label>
          <select
            id={typeFilterId}
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
            className={fieldClass}
          >
            <option value="todos">Todos los tipos</option>
            {recordTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start">
        <div className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold text-nexo-deep">Listado de expedientes</h2>
          </div>
          <RecordList
            load={load}
            visibleRecords={visibleRecords}
            clientNames={clientNames}
            sessionMessage={session.status === "error" ? session.message : null}
            onSelect={setSelectedId}
            onEdit={setEditingId}
          />
        </div>

        <aside className={`${cardClass} overflow-hidden`}>
          <SceneFrame
            src="/images/cta-colaboracion.jpg"
            alt="Equipo organizando el trabajo en una oficina."
            className="h-32"
          />
          <div className="p-5 sm:p-6">
            <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-nexo-blue">
              <Icon name="folder" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-nexo-deep">El espacio de cada cliente</h2>
            <p className="mt-2 text-sm leading-6 text-pretty text-muted">
              Un expediente reúne, en un solo lugar, la información relacionada con un cliente.
            </p>
          </div>
        </aside>
      </div>

      {createOpen ? (
        <NewExpedienteModal
          titleId={createTitleId}
          clients={clients}
          onClose={closeCreate}
          onCreate={createRecord}
        />
      ) : null}
      {selectedId && load.status === "ready" ? (
        <ExpedienteDetailModal
          titleId={detailTitleId}
          companyId={load.companyId}
          recordId={selectedId}
          clientNames={clientNames}
          onClose={closeDetail}
        />
      ) : null}
      {editingId && load.status === "ready" ? (
        <EditExpedienteModal
          titleId={editTitleId}
          companyId={load.companyId}
          recordId={editingId}
          clientNames={clientNames}
          onClose={closeEdit}
          onSave={updateRecord}
        />
      ) : null}
    </section>
  );
}

function RecordList({
  load,
  visibleRecords,
  clientNames,
  sessionMessage,
  onSelect,
  onEdit,
}: {
  load: RecordsLoad;
  visibleRecords: CompanyRecord[];
  clientNames: Map<string, string>;
  sessionMessage: string | null;
  onSelect: (recordId: string) => void;
  onEdit: (recordId: string) => void;
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
        Cargando expedientes
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
          Cuando tu cuenta tenga una membresía activa, los expedientes de esa empresa aparecerán aquí.
        </p>
      </div>
    );
  }

  if (load.records.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="text-sm font-semibold text-nexo-deep">Todavía no hay expedientes</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
          Esta empresa no tiene expedientes registrados.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="sr-only" role="status">
        {visibleRecords.length} expedientes visibles.
      </p>
      {visibleRecords.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm leading-6 text-muted">
          Ningún expediente coincide con la búsqueda.
        </p>
      ) : (
        <ul>
          <li className="hidden border-b border-line px-5 py-3 text-xs font-semibold tracking-wide text-muted uppercase md:grid md:grid-cols-[minmax(0,1fr)_auto] md:gap-4">
            <span className={`grid gap-4 ${columnsClass}`}>
              <span>Expediente</span>
              <span>Cliente</span>
              <span>Estado</span>
              <span>Información</span>
            </span>
            <span className="sr-only">Acciones</span>
          </li>
          {visibleRecords.map((record) => {
            const clientName = clientNames.get(record.clientId) ?? "Cliente no disponible";

            return (
              <li key={record.id} className="border-b border-line px-5 py-4 last:border-b-0">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4">
                  <button
                    type="button"
                    className={`grid gap-3 rounded-xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue md:items-center md:gap-4 ${columnsClass}`}
                    onClick={() => onSelect(record.id)}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <ExpedienteMark tone={expedienteTone(record.recordType)} />
                      <span className="min-w-0">
                        <span className="block font-semibold text-nexo-deep">
                          {record.title || "Sin título"}
                        </span>
                        <span className="mt-1 flex items-center gap-2 text-sm text-muted md:hidden">
                          <ClientInitials name={clientName} />
                          <span className="min-w-0">{clientName}</span>
                        </span>
                        <span className="mt-2 block md:hidden">
                          <StatusBadge status={record.status} />
                        </span>
                      </span>
                    </span>
                    <span className="hidden min-w-0 items-center gap-2 text-sm text-nexo-deep md:flex">
                      <ClientInitials name={clientName} />
                      <span className="min-w-0">{clientName}</span>
                    </span>
                    <span className="hidden md:block">
                      <StatusBadge status={record.status} />
                    </span>
                    <span className="text-sm text-muted">{recordInfo(record)}</span>
                  </button>
                  <RowActions
                    name={record.title || "Sin título"}
                    onView={() => onSelect(record.id)}
                    onEdit={() => onEdit(record.id)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function ClientInitials({ name }: { name: string }) {
  const initials =
    name === "Cliente no disponible"
      ? ""
      : name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toLocaleUpperCase("es") ?? "")
          .join("");

  return (
    <span
      className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-cyan-50 text-[10px] font-semibold text-nexo-deep"
      aria-hidden="true"
    >
      {initials || "—"}
    </span>
  );
}

function StatusBadge({ status }: { status: RecordStatus }) {
  const tone = status === "FINAL" ? "bg-blue-50 text-nexo-blue" : "bg-cyan-50 text-nexo-cyan";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {statusLabel(status)}
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

function useModalBehavior(onClose: () => void) {
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

function ModalFrame({
  titleId,
  eyebrow,
  title,
  onClose,
  children,
}: {
  titleId: string;
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end p-4 sm:place-items-center">
      <button
        type="button"
        className="absolute inset-0 bg-nexo-deep/40"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[min(100%,40rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-white p-5 shadow-[0_24px_60px_-28px_rgba(10,35,66,0.55)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-nexo-cyan uppercase">{eyebrow}</p>
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

function writeErrorMessage(error: unknown, action: "crear" | "guardar"): string {
  if (error instanceof DuplicateRecordError) {
    return error.message;
  }

  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return action === "crear"
      ? "No tienes permiso para crear expedientes en esta empresa."
      : "No tienes permiso para modificar este expediente.";
  }

  if (error instanceof FirebaseError && error.code === "unavailable") {
    return "No hay conexión con el servicio. Inténtalo de nuevo.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return action === "crear" ? "No se pudo crear el expediente." : "No se pudo guardar el expediente.";
}

function readErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "No tienes permiso para consultar este expediente.";
  }

  if (error instanceof FirebaseError && error.code === "unavailable") {
    return "No hay conexión con el servicio. Inténtalo de nuevo.";
  }

  return "No se pudo consultar el expediente.";
}

function NewExpedienteModal({
  titleId,
  clients,
  onClose,
  onCreate,
}: {
  titleId: string;
  clients: Client[];
  onClose: () => void;
  onCreate: (input: { clientId: string; title: string; recordType: RecordType; summary: string }) => Promise<void>;
}) {
  const titleFieldId = useId();
  const clientFieldId = useId();
  const typeFieldId = useId();
  const descriptionFieldId = useId();
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [recordType, setRecordType] = useState<RecordType | "">("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const requestClose = useCallback(() => {
    if (!savingRef.current) {
      onClose();
    }
  }, [onClose]);

  useModalBehavior(requestClose);

  return (
    <ModalFrame titleId={titleId} eyebrow="Expedientes" title="Nuevo expediente" onClose={requestClose}>
      {error ? (
        <p role="alert" className="mt-3 text-sm leading-6 text-red-700">
          {error}
        </p>
      ) : null}
      <form
        className="mt-5 space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (savingRef.current) {
            return;
          }

          const nextTitle = title.trim();
          if (!nextTitle) {
            setError("Escribe el título del expediente.");
            return;
          }

          if (!clientId) {
            setError("Selecciona un cliente.");
            return;
          }

          if (!recordType) {
            setError("Selecciona un tipo de expediente.");
            return;
          }

          savingRef.current = true;
          setSaving(true);
          setError(null);
          void onCreate({
            clientId,
            title: nextTitle,
            recordType,
            summary: summary.trim(),
          }).catch((submitError: unknown) => {
            savingRef.current = false;
            setError(writeErrorMessage(submitError, "crear"));
            setSaving(false);
          });
        }}
      >
        <div>
          <label htmlFor={titleFieldId} className="text-sm font-medium text-nexo-deep">
            Título
          </label>
          <input
            id={titleFieldId}
            name="titulo"
            type="text"
            autoComplete="off"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={`${fieldClass} mt-2`}
          />
        </div>
        <div>
          <label htmlFor={clientFieldId} className="text-sm font-medium text-nexo-deep">
            Cliente
          </label>
          <select
            id={clientFieldId}
            name="cliente"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            className={`${fieldClass} mt-2`}
          >
            <option value="">Selecciona un cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.displayName || "Sin nombre"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={typeFieldId} className="text-sm font-medium text-nexo-deep">
            Tipo de expediente
          </label>
          <select
            id={typeFieldId}
            name="tipo"
            value={recordType}
            onChange={(event) => setRecordType(event.target.value as RecordType | "")}
            className={`${fieldClass} mt-2`}
          >
            <option value="">Selecciona un tipo</option>
            {recordTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={descriptionFieldId} className="text-sm font-medium text-nexo-deep">
            Descripción
          </label>
          <textarea
            id={descriptionFieldId}
            name="descripcion"
            rows={3}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-nexo-deep outline-none placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue"
          />
        </div>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" className={secondaryButtonClass} onClick={requestClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className={`${primaryButtonClass} disabled:opacity-70`} disabled={saving}>
            {saving ? "Creando" : "Crear expediente"}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

type RecordRead =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; record: CompanyRecord };

function useCompanyRecord(companyId: string, recordId: string): RecordRead {
  const [read, setRead] = useState<RecordRead>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    getCompanyRecord(companyId, recordId)
      .then((record) => {
        if (!cancelled) {
          setRead(record ? { status: "ready", record } : { status: "missing" });
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
  }, [companyId, recordId]);

  return read;
}

function RecordReadBody({ read }: { read: RecordRead }) {
  if (read.status === "loading") {
    return (
      <p role="status" className="mt-5 text-sm leading-6 text-muted">
        Cargando expediente
      </p>
    );
  }

  if (read.status === "missing") {
    return (
      <p role="alert" className="mt-5 text-sm leading-6 text-red-700">
        No se encontró el expediente.
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

  return null;
}

function ExpedienteDetailModal({
  titleId,
  companyId,
  recordId,
  clientNames,
  onClose,
}: {
  titleId: string;
  companyId: string;
  recordId: string;
  clientNames: Map<string, string>;
  onClose: () => void;
}) {
  const read = useCompanyRecord(companyId, recordId);
  useModalBehavior(onClose);
  const record = read.status === "ready" ? read.record : null;
  const clientName = record ? (clientNames.get(record.clientId) ?? "Cliente no disponible") : "";
  const documentCount = record?.documentIds.length ?? 0;

  return (
    <ModalFrame titleId={titleId} eyebrow="Expedientes" title="Detalle del expediente" onClose={onClose}>
      {record ? (
        <>
          <div className="mt-3 flex items-center gap-3">
            <ExpedienteMark tone={expedienteTone(record.recordType)} />
            <p className="min-w-0 text-sm font-medium text-nexo-deep">{record.title || "Sin título"}</p>
          </div>
          <div className="mt-5 space-y-3">
            <DetailSection title="Información general">
              <dl className="space-y-2 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">Título</dt>
                  <dd className="text-right font-medium text-nexo-deep">{record.title || "Sin título"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">Estado</dt>
                  <dd>
                    <StatusBadge status={record.status} />
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">Tipo</dt>
                  <dd className="text-right font-medium text-nexo-deep">{typeLabel(record.recordType)}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">Información</dt>
                  <dd className="text-right font-medium text-nexo-deep">{recordInfo(record)}</dd>
                </div>
              </dl>
            </DetailSection>
            <DetailSection title="Cliente asociado">
              <p className="flex items-center gap-2 text-sm font-medium text-nexo-deep">
                <ClientInitials name={clientName} />
                <span className="min-w-0">{clientName}</span>
              </p>
            </DetailSection>
            <DetailSection title="Documentos">
              <p className="text-sm leading-6 text-muted">
                {documentCount === 0
                  ? "Sin documentos"
                  : documentCount === 1
                    ? "1 documento vinculado"
                    : `${documentCount} documentos vinculados`}
              </p>
            </DetailSection>
            <DetailSection title="Actividad">
              <p className="text-sm leading-6 text-muted">
                {record.createdAt ? `Creado el ${dateFormat.format(record.createdAt)}` : "Sin fecha de creación"}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                {record.updatedAt
                  ? `Actualizado el ${dateFormat.format(record.updatedAt)}`
                  : "Sin fecha de actualización"}
              </p>
            </DetailSection>
          </div>
        </>
      ) : (
        <RecordReadBody read={read} />
      )}
    </ModalFrame>
  );
}

function EditExpedienteModal({
  titleId,
  companyId,
  recordId,
  clientNames,
  onClose,
  onSave,
}: {
  titleId: string;
  companyId: string;
  recordId: string;
  clientNames: Map<string, string>;
  onClose: () => void;
  onSave: (input: { recordId: string; title: string; recordType: RecordType; summary: string }) => Promise<void>;
}) {
  const read = useCompanyRecord(companyId, recordId);
  const [saving, setSaving] = useState(false);
  const requestClose = useCallback(() => {
    if (!saving) {
      onClose();
    }
  }, [onClose, saving]);

  useModalBehavior(requestClose);

  const record = read.status === "ready" ? read.record : null;
  const archived = record?.status === "ARCHIVED";

  return (
    <ModalFrame titleId={titleId} eyebrow="Expedientes" title="Editar expediente" onClose={requestClose}>
      {record && !archived ? (
        <EditExpedienteForm
          record={record}
          clientName={clientNames.get(record.clientId) ?? "Cliente no disponible"}
          saving={saving}
          setSaving={setSaving}
          onClose={requestClose}
          onSave={onSave}
        />
      ) : archived ? (
        <p role="alert" className="mt-5 text-sm leading-6 text-red-700">
          No se puede editar un expediente archivado.
        </p>
      ) : (
        <RecordReadBody read={read} />
      )}
    </ModalFrame>
  );
}

function EditExpedienteForm({
  record,
  clientName,
  saving,
  setSaving,
  onClose,
  onSave,
}: {
  record: CompanyRecord;
  clientName: string;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  onClose: () => void;
  onSave: (input: { recordId: string; title: string; recordType: RecordType; summary: string }) => Promise<void>;
}) {
  const titleFieldId = useId();
  const typeFieldId = useId();
  const descriptionFieldId = useId();
  const [title, setTitle] = useState(record.title);
  const [recordType, setRecordType] = useState<RecordType>(record.recordType);
  const [summary, setSummary] = useState(record.summary);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  return (
    <form
      className="mt-5 space-y-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (savingRef.current) {
          return;
        }

        const nextTitle = title.trim();
        if (!nextTitle) {
          setError("Escribe el título del expediente.");
          return;
        }

        if (!recordType) {
          setError("Selecciona un tipo de expediente.");
          return;
        }

        savingRef.current = true;
        setSaving(true);
        setError(null);
        void onSave({
          recordId: record.id,
          title: nextTitle,
          recordType,
          summary: summary.trim(),
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
        <p className="text-sm leading-6 text-muted">Actualiza los datos de este expediente.</p>
      )}
      <div>
        <p className="text-sm font-medium text-nexo-deep">Cliente</p>
        <p className="mt-2 text-sm text-muted">{clientName}</p>
      </div>
      <div>
        <p className="text-sm font-medium text-nexo-deep">Estado</p>
        <div className="mt-2">
          <StatusBadge status={record.status} />
        </div>
      </div>
      <div>
        <label htmlFor={titleFieldId} className="text-sm font-medium text-nexo-deep">
          Título
        </label>
        <input
          id={titleFieldId}
          name="titulo"
          type="text"
          autoComplete="off"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={`${fieldClass} mt-2`}
        />
      </div>
      <div>
        <label htmlFor={typeFieldId} className="text-sm font-medium text-nexo-deep">
          Tipo de expediente
        </label>
        <select
          id={typeFieldId}
          name="tipo"
          value={recordType}
          onChange={(event) => setRecordType(event.target.value as RecordType)}
          className={`${fieldClass} mt-2`}
        >
          {recordTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={descriptionFieldId} className="text-sm font-medium text-nexo-deep">
          Descripción
        </label>
        <textarea
          id={descriptionFieldId}
          name="descripcion"
          rows={3}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-nexo-deep outline-none placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue"
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
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-background px-4 py-3">
      <h3 className="text-sm font-semibold text-nexo-deep">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}
