"use client";

import { FirebaseError } from "firebase/app";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { DocumentGlyph, SceneFrame } from "@/components/app/DemoMedia";
import { useAuthSession } from "@/components/auth/useAuthSession";
import { Icon } from "@/components/Icon";
import { resolveActiveCompanyId } from "@/lib/company";
import { listCompanyRecords } from "@/lib/records";
import {
  detectFileFamily,
  getCompanyDocument,
  listCompanyDocuments,
  replaceCompanyDocumentFile,
  resolveDocumentFileUrl,
  sortDocumentsByUpdated,
  updateCompanyDocumentName,
  uploadCompanyDocument,
  type Document as CompanyDocument,
  type DocumentFileFamily,
  type DocumentStatus,
} from "@/lib/documents";

type FamilyFilter = "todos" | DocumentFileFamily;

type DocumentsLoad =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "no-company" }
  | { status: "ready"; companyId: string; documents: CompanyDocument[] };

const primaryButtonClass =
  "inline-flex h-11 items-center justify-center rounded-full bg-nexo-deep px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#16345c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue";

const secondaryButtonClass =
  "inline-flex h-11 items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-semibold text-nexo-deep transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue";

const fieldClass =
  "h-11 w-full rounded-xl border border-line bg-white px-4 text-sm text-nexo-deep outline-none placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue";

const cardClass =
  "rounded-2xl border border-line bg-white shadow-[0_16px_40px_-32px_rgba(10,35,66,0.65)]";

const columnsClass = "md:grid-cols-[minmax(0,1.2fr)_6.5rem_minmax(0,1.1fr)_minmax(0,1fr)]";

const dateFormat = new Intl.DateTimeFormat("es", { dateStyle: "medium" });

const familyOptions: { value: DocumentFileFamily; label: string }[] = [
  { value: "PDF", label: "PDF" },
  { value: "WORD", label: "Word" },
  { value: "EXCEL", label: "Excel" },
  { value: "IMAGE", label: "Imagen" },
  { value: "OTHER", label: "Otro" },
];

function familyLabel(family: DocumentFileFamily): string {
  return familyOptions.find((option) => option.value === family)?.label ?? "Otro";
}

function formatBytes(size: number): string {
  if (!Number.isFinite(size) || size < 0) {
    return "—";
  }

  if (size < 1024) {
    return `${Math.round(size)} Bytes`;
  }

  const units = ["KB", "MB", "GB"] as const;
  let value = size / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const digits = value >= 10 ? 0 : 1;

  return `${value.toLocaleString("es", { maximumFractionDigits: digits, minimumFractionDigits: digits })} ${units[unitIndex]}`;
}

function formatUpdated(date: Date | null): string {
  return date ? dateFormat.format(date) : "Sin fecha";
}

function loadErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "No tienes permiso para consultar los documentos de esta empresa.";
  }

  if (error instanceof FirebaseError && error.code === "unavailable") {
    return "No hay conexión con el servicio. Inténtalo de nuevo.";
  }

  return "No se pudieron cargar los documentos.";
}

export function DocumentosScreen() {
  const session = useAuthSession();
  const userId = session.status === "authenticated" ? session.user.uid : null;
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<FamilyFilter>("todos");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [fileAction, setFileAction] = useState<{ id: string; kind: "open" | "download" } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [load, setLoad] = useState<DocumentsLoad>({ status: "loading" });
  const searchId = useId();
  const filterId = useId();
  const uploadTitleId = useId();
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

        const documents = await listCompanyDocuments(companyId);
        return { status: "ready", companyId, documents } as const;
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

  const documents = load.status === "ready" ? load.documents : [];
  const visibleDocuments = documents.filter((item) => {
    const haystack = [
      item.name,
      item.originalFileName,
      familyLabel(item.fileFamily),
      item.fileFamily,
      item.mimeType,
      ...item.searchTokens,
    ]
      .join(" ")
      .toLocaleLowerCase("es");
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    const matchesQuery = normalizedQuery.length === 0 || haystack.includes(normalizedQuery);
    const matchesType = typeFilter === "todos" || item.fileFamily === typeFilter;

    return matchesQuery && matchesType;
  });
  const totalSize = documents.reduce((sum, item) => sum + item.size, 0);
  const latestUpdate = documents.reduce<Date | null>((latest, item) => {
    if (!item.updatedAt) {
      return latest;
    }

    if (!latest || item.updatedAt > latest) {
      return item.updatedAt;
    }

    return latest;
  }, null);
  const stats = [
    { label: "Documentos registrados", value: load.status === "ready" ? String(documents.length) : "—" },
    { label: "Espacio", value: load.status === "ready" ? formatBytes(totalSize) : "—" },
    { label: "Última actualización", value: latestUpdate ? formatUpdated(latestUpdate) : "—" },
  ];

  const closeUpload = useCallback(() => {
    setUploadOpen(false);
  }, []);

  const uploadDocument = useCallback(
    async (file: File, displayName: string, recordId: string) => {
      if (!userId) {
        throw new Error("No hay una sesión activa.");
      }

      if (load.status === "no-company") {
        throw new Error("No hay una empresa activa para subir el documento.");
      }

      if (load.status !== "ready") {
        throw new Error("Espera a que termine de cargar el listado.");
      }

      const document = await uploadCompanyDocument({
        companyId: load.companyId,
        file,
        createdBy: userId,
        displayName,
        recordId,
      });

      setLoad((current) =>
        current.status === "ready"
          ? { ...current, documents: sortDocumentsByUpdated([document, ...current.documents]) }
          : current,
      );
      setNotice("Documento subido.");
      setUploadOpen(false);
    },
    [load, userId],
  );

  const closeDetail = useCallback(() => {
    setSelectedId(null);
  }, []);

  const closeEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const openDocumentFile = useCallback(async (item: CompanyDocument) => {
    if (!item.storagePath.trim()) {
      setActionError("Este documento no tiene un archivo asociado.");
      return;
    }

    const popup = window.open("", "_blank", "noopener,noreferrer");
    setFileAction({ id: item.id, kind: "open" });
    setActionError(null);

    try {
      const url = await resolveDocumentFileUrl(item.storagePath);

      if (popup) {
        popup.location.href = url;
      } else {
        window.location.assign(url);
      }
    } catch (error) {
      popup?.close();
      setActionError(fileActionError(error, "No se pudo abrir el documento."));
    } finally {
      setFileAction(null);
    }
  }, []);

  const downloadDocumentFile = useCallback(async (item: CompanyDocument) => {
    if (!item.storagePath.trim()) {
      setActionError("Este documento no tiene un archivo asociado.");
      return;
    }

    setFileAction({ id: item.id, kind: "download" });
    setActionError(null);

    try {
      const url = await resolveDocumentFileUrl(item.storagePath);
      const fileName = item.originalFileName || item.name || "documento";

      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("download failed");
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = fileName;
        anchor.rel = "noopener";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(objectUrl);
      } catch {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }
    } catch (error) {
      setActionError(fileActionError(error, "No se pudo descargar el documento."));
    } finally {
      setFileAction(null);
    }
  }, []);

  const saveDocumentChanges = useCallback(
    async (
      item: CompanyDocument,
      name: string,
      file: File | null,
      onProgress?: (phase: "uploading" | "saving") => void,
    ) => {
      if (!userId) {
        throw new Error("No hay una sesión activa.");
      }

      const updated = file
        ? await replaceCompanyDocumentFile({
            current: item,
            file,
            name,
            updatedBy: userId,
            onProgress,
          })
        : await updateCompanyDocumentName(item, name, userId);

      setLoad((current) =>
        current.status === "ready"
          ? {
              ...current,
              documents: sortDocumentsByUpdated(
                current.documents.map((document) => (document.id === updated.id ? updated : document)),
              ),
            }
          : current,
      );
      setNotice(
        file
          ? `Documento actualizado. Se creó la versión v${updated.currentVersionNumber}.`
          : "Documento actualizado.",
      );
      setEditingId(null);
    },
    [userId],
  );

  return (
    <section className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-balance text-nexo-deep sm:text-4xl">
            Documentos
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-pretty text-muted sm:text-lg sm:leading-8">
            Centraliza y consulta los documentos de tu empresa desde un solo lugar.
          </p>
          {notice ? (
            <p role="status" className="mt-3 text-sm font-medium text-nexo-cyan">
              {notice}
            </p>
          ) : null}
          {actionError ? (
            <p role="alert" className="mt-3 text-sm font-medium text-red-700">
              {actionError}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className={`${primaryButtonClass} w-full shrink-0 sm:w-auto`}
          onClick={() => {
            setSelectedId(null);
            setUploadOpen(true);
          }}
        >
          + Subir documento
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
            Buscar documento
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar documento..."
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
            onChange={(event) => setTypeFilter(event.target.value as FamilyFilter)}
            className={fieldClass}
          >
            <option value="todos">Todos</option>
            {familyOptions.map((option) => (
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
            <h2 className="text-base font-semibold text-nexo-deep">Listado de documentos</h2>
          </div>
          <DocumentList
            load={load}
            visibleDocuments={visibleDocuments}
            sessionMessage={session.status === "error" ? session.message : null}
            fileAction={fileAction}
            onSelect={setSelectedId}
            onOpen={openDocumentFile}
            onDownload={downloadDocumentFile}
            onEdit={(documentId) => {
              setSelectedId(null);
              setEditingId(documentId);
            }}
          />
        </div>

        <aside className={`${cardClass} overflow-hidden`}>
          <SceneFrame
            src="/images/plataforma-colaboracion.jpg"
            alt="Mesa de trabajo con computadores y documentos."
            className="h-32"
          />
          <div className="p-5 sm:p-6">
            <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-nexo-blue">
              <Icon name="file" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-nexo-deep">Documentos en contexto</h2>
            <p className="mt-2 text-sm leading-6 text-pretty text-muted">
              NexoGo permite consultar los documentos de la empresa junto con la información de sus
              expedientes.
            </p>
          </div>
        </aside>
      </div>

      {uploadOpen ? (
        <UploadDocumentoModal
          titleId={uploadTitleId}
          companyId={load.status === "ready" ? load.companyId : null}
          onClose={closeUpload}
          onUpload={uploadDocument}
        />
      ) : null}
      {selectedId && load.status === "ready" ? (
        <DocumentoDetailModal
          titleId={detailTitleId}
          companyId={load.companyId}
          documentId={selectedId}
          fileAction={fileAction}
          onOpen={openDocumentFile}
          onDownload={downloadDocumentFile}
          onClose={closeDetail}
        />
      ) : null}
      {editingId && load.status === "ready" ? (
        <EditDocumentoModal
          titleId={editTitleId}
          companyId={load.companyId}
          documentId={editingId}
          onClose={closeEdit}
          onSave={saveDocumentChanges}
        />
      ) : null}
    </section>
  );
}

function fileActionError(error: unknown, fallback: string): string {
  if (error instanceof FirebaseError) {
    if (
      error.code === "storage/unauthorized" ||
      error.code === "storage/unauthenticated" ||
      error.code === "permission-denied"
    ) {
      return "No tienes permiso para acceder a este archivo.";
    }

    if (error.code === "storage/object-not-found") {
      return "No se encontró el archivo en el almacenamiento.";
    }

    if (error.code === "not-found") {
      return "No se encontró el documento.";
    }

    if (error.code === "unavailable" || error.code === "storage/retry-limit-exceeded") {
      return "No hay conexión con el servicio. Inténtalo de nuevo.";
    }
  }

  if (error instanceof Error && error.message && error.message !== "download failed") {
    return error.message;
  }

  return fallback;
}

function DocumentList({
  load,
  visibleDocuments,
  sessionMessage,
  fileAction,
  onSelect,
  onOpen,
  onDownload,
  onEdit,
}: {
  load: DocumentsLoad;
  visibleDocuments: CompanyDocument[];
  sessionMessage: string | null;
  fileAction: { id: string; kind: "open" | "download" } | null;
  onSelect: (documentId: string) => void;
  onOpen: (item: CompanyDocument) => void;
  onDownload: (item: CompanyDocument) => void;
  onEdit: (documentId: string) => void;
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
        Cargando documentos
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
          Cuando tu cuenta tenga una membresía activa, los documentos de esa empresa aparecerán aquí.
        </p>
      </div>
    );
  }

  if (load.documents.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="text-sm font-semibold text-nexo-deep">Todavía no hay documentos</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
          Esta empresa no tiene documentos registrados.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="sr-only" role="status">
        {visibleDocuments.length} documentos visibles.
      </p>
      {visibleDocuments.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm leading-6 text-muted">
          Ningún documento coincide con la búsqueda.
        </p>
      ) : (
        <ul>
          <li className="hidden border-b border-line px-5 py-3 text-xs font-semibold tracking-wide text-muted uppercase md:grid md:grid-cols-[minmax(0,1fr)_auto] md:gap-4">
            <span className={`grid gap-4 ${columnsClass}`}>
              <span>Documento</span>
              <span>Tipo</span>
              <span>Archivo</span>
              <span>Tamaño</span>
            </span>
            <span className="sr-only">Acciones</span>
          </li>
          {visibleDocuments.map((item) => (
            <li key={item.id} className="border-b border-line px-5 py-4 last:border-b-0">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4">
                <button
                  type="button"
                  className={`grid gap-3 rounded-xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue md:items-center md:gap-4 ${columnsClass}`}
                  onClick={() => onSelect(item.id)}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <FileMark family={item.fileFamily} />
                    <span className="min-w-0">
                      <span className="block font-semibold break-all text-nexo-deep">
                        {item.name || "Sin nombre"}
                      </span>
                      <span className="mt-1 block text-sm text-muted md:hidden">
                        {item.originalFileName || "Sin archivo"}
                      </span>
                      <span className="mt-1 block text-sm text-muted">{formatUpdated(item.updatedAt)}</span>
                      <span className="mt-2 block md:hidden">
                        <TypeBadge family={item.fileFamily} />
                      </span>
                    </span>
                  </span>
                  <span className="hidden md:block">
                    <TypeBadge family={item.fileFamily} />
                  </span>
                  <span className="hidden text-sm break-all text-nexo-deep md:block">
                    {item.originalFileName || "Sin archivo"}
                  </span>
                  <span className="text-sm text-muted">{formatBytes(item.size)}</span>
                </button>
                <RowActions
                  name={item.name || "Sin nombre"}
                  busy={fileAction?.id === item.id ? fileAction.kind : null}
                  onOpen={() => onOpen(item)}
                  onDownload={() => onDownload(item)}
                  onEdit={() => onEdit(item.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function FileMark({ family }: { family: DocumentFileFamily }) {
  if (family === "PDF" || family === "WORD" || family === "EXCEL") {
    const type = family === "PDF" ? "PDF" : family === "WORD" ? "Word" : "Excel";
    return <DocumentGlyph type={type} />;
  }

  const label = family === "IMAGE" ? "IMG" : "FILE";
  const band = family === "IMAGE" ? "bg-nexo-blue" : "bg-slate-500";

  return (
    <span
      className="relative grid size-10 shrink-0 overflow-hidden rounded-lg border border-line bg-white shadow-[0_8px_18px_-14px_rgba(10,35,66,0.9)]"
      aria-hidden="true"
    >
      <span
        className="absolute top-0 right-0 size-3 bg-slate-100"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }}
      />
      <span className={`absolute inset-x-0 bottom-0 py-1 text-center text-[9px] font-bold tracking-wide text-white ${band}`}>
        {label}
      </span>
    </span>
  );
}

function TypeBadge({ family }: { family: DocumentFileFamily }) {
  const tone =
    family === "PDF"
      ? "bg-blue-50 text-nexo-blue"
      : family === "WORD" || family === "IMAGE"
        ? "bg-cyan-50 text-nexo-cyan"
        : "bg-slate-100 text-nexo-deep";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {familyLabel(family)}
    </span>
  );
}

function RowActions({
  name,
  busy,
  onOpen,
  onDownload,
  onEdit,
}: {
  name: string;
  busy: "open" | "download" | null;
  onOpen: () => void;
  onDownload: () => void;
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
            className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-nexo-deep hover:bg-slate-50 disabled:opacity-70"
            disabled={busy !== null}
            onClick={onOpen}
          >
            {busy === "open" ? "Abriendo..." : "Ver"}
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-nexo-deep hover:bg-slate-50 disabled:opacity-70"
            disabled={busy !== null}
            onClick={onDownload}
          >
            {busy === "download" ? "Preparando descarga..." : "Descargar"}
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-nexo-deep hover:bg-slate-50"
            disabled={busy !== null}
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

function uploadErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    if (error.code === "permission-denied" || error.code === "storage/unauthorized") {
      return "No tienes permiso para subir documentos en esta empresa.";
    }

    if (error.code === "unavailable" || error.code === "storage/retry-limit-exceeded") {
      return "No hay conexión con el servicio. Inténtalo de nuevo.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "No se pudo subir el documento.";
}

const acceptedFileTypes =
  ".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpeg,.jpg,.png,.webp,.gif,.heic,.heif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif";

type ExpedienteChoice =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "error" }
  | { status: "ready"; records: { id: string; title: string }[] };

function UploadDocumentoModal({
  titleId,
  companyId,
  onClose,
  onUpload,
}: {
  titleId: string;
  companyId: string | null;
  onClose: () => void;
  onUpload: (file: File, displayName: string, recordId: string) => Promise<void>;
}) {
  const nameId = useId();
  const typeId = useId();
  const expedienteId = useId();
  const fileId = useId();
  const [name, setName] = useState("");
  const [family, setFamily] = useState<DocumentFileFamily | "">("");
  const [recordId, setRecordId] = useState("");
  const [expedientes, setExpedientes] = useState<ExpedienteChoice>(
    companyId ? { status: "loading" } : { status: "empty" },
  );
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!companyId) {
      return;
    }

    let cancelled = false;

    listCompanyRecords(companyId)
      .then((records) => {
        if (cancelled) {
          return;
        }

        const visible = records.filter((record) => record.status !== "ARCHIVED");

        setExpedientes(
          visible.length === 0
            ? { status: "empty" }
            : {
                status: "ready",
                records: visible.map((record) => ({
                  id: record.id,
                  title: record.title || "Sin título",
                })),
              },
        );
      })
      .catch(() => {
        if (!cancelled) {
          setExpedientes({ status: "error" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const requestClose = useCallback(() => {
    if (!savingRef.current) {
      onClose();
    }
  }, [onClose]);

  useModalBehavior(requestClose);

  return (
    <ModalFrame titleId={titleId} eyebrow="Documentos" title="Subir documento" onClose={requestClose}>
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

          if (!file || file.size <= 0) {
            setError("Selecciona un archivo.");
            return;
          }

          const detected = detectFileFamily(file.type, file.name);

          if (detected === "OTHER") {
            setError("El archivo no es compatible. Usa PDF, Word, Excel o una imagen.");
            return;
          }

          if (family && family !== detected) {
            setError("El tipo seleccionado no coincide con el archivo.");
            return;
          }

          savingRef.current = true;
          setSaving(true);
          setError(null);
          void onUpload(file, name.trim(), recordId).catch((submitError: unknown) => {
            savingRef.current = false;
            setError(uploadErrorMessage(submitError));
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
            disabled={saving}
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
            value={family}
            onChange={(event) => setFamily(event.target.value as DocumentFileFamily | "")}
            disabled={saving}
            className={`${fieldClass} mt-2`}
          >
            <option value="">Selecciona un tipo</option>
            {familyOptions
              .filter((option) => option.value !== "OTHER")
              .map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label htmlFor={expedienteId} className="text-sm font-medium text-nexo-deep">
            Expediente
          </label>
          <select
            id={expedienteId}
            name="expediente"
            value={recordId}
            onChange={(event) => setRecordId(event.target.value)}
            disabled={saving || expedientes.status !== "ready"}
            className={`${fieldClass} mt-2`}
          >
            {expedientes.status === "loading" ? <option value="">Cargando expedientes</option> : null}
            {expedientes.status === "empty" ? <option value="">No hay expedientes</option> : null}
            {expedientes.status === "error" ? (
              <option value="">No se pudieron cargar los expedientes</option>
            ) : null}
            {expedientes.status === "ready" ? <option value="">Sin expediente</option> : null}
            {expedientes.status === "ready"
              ? expedientes.records.map((record) => (
                  <option key={record.id} value={record.id}>
                    {record.title}
                  </option>
                ))
              : null}
          </select>
        </div>
        <div className="rounded-xl border border-dashed border-line bg-background px-4 py-4">
          <label htmlFor={fileId} className="text-sm font-medium text-nexo-deep">
            Archivo
          </label>
          {file ? (
            <p className="mt-1 text-sm leading-6 break-all text-muted">
              {file.name}
              <span className="mt-1 block">{formatBytes(file.size)}</span>
            </p>
          ) : (
            <p className="mt-1 text-sm leading-6 text-muted">PDF, Word, Excel o imagen.</p>
          )}
          <input
            id={fileId}
            name="archivo"
            type="file"
            accept={acceptedFileTypes}
            disabled={saving}
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              setFile(nextFile);
              setError(null);

              if (!nextFile) {
                return;
              }

              const detected = detectFileFamily(nextFile.type, nextFile.name);
              setFamily(detected === "OTHER" ? "" : detected);
              setName((current) => {
                if (current.trim()) {
                  return current;
                }

                const dot = nextFile.name.lastIndexOf(".");
                return dot > 0 ? nextFile.name.slice(0, dot) : nextFile.name;
              });
            }}
            className="mt-3 block w-full text-sm text-nexo-deep file:mr-3 file:rounded-full file:border-0 file:bg-nexo-deep file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
        </div>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" className={secondaryButtonClass} onClick={requestClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className={`${primaryButtonClass} disabled:opacity-70`} disabled={saving}>
            {saving ? "Subiendo" : "Subir documento"}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

function documentStatusLabel(status: DocumentStatus): string {
  if (status === "ARCHIVED") {
    return "Archivado";
  }

  if (status === "DELETED") {
    return "Eliminado";
  }

  return "Activo";
}

function readErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "No tienes permiso para consultar este documento.";
  }

  if (error instanceof FirebaseError && error.code === "unavailable") {
    return "No hay conexión con el servicio. Inténtalo de nuevo.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "No se pudo consultar el documento.";
}

type DocumentRead =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; document: CompanyDocument };

function useCompanyDocument(companyId: string, documentId: string): DocumentRead {
  const [read, setRead] = useState<DocumentRead>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    getCompanyDocument(companyId, documentId)
      .then((document) => {
        if (!cancelled) {
          setRead(document ? { status: "ready", document } : { status: "missing" });
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
  }, [companyId, documentId]);

  return read;
}

function DocumentReadBody({ read }: { read: DocumentRead }) {
  if (read.status === "loading") {
    return (
      <p role="status" className="mt-5 text-sm leading-6 text-muted">
        Cargando documento
      </p>
    );
  }

  if (read.status === "missing") {
    return (
      <p role="alert" className="mt-5 text-sm leading-6 text-red-700">
        No se encontró el documento.
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

function DocumentoDetailModal({
  titleId,
  companyId,
  documentId,
  fileAction,
  onOpen,
  onDownload,
  onClose,
}: {
  titleId: string;
  companyId: string;
  documentId: string;
  fileAction: { id: string; kind: "open" | "download" } | null;
  onOpen: (item: CompanyDocument) => void;
  onDownload: (item: CompanyDocument) => void;
  onClose: () => void;
}) {
  const read = useCompanyDocument(companyId, documentId);
  useModalBehavior(onClose);
  const item = read.status === "ready" ? read.document : null;
  const busy = item && fileAction?.id === item.id ? fileAction.kind : null;

  return (
    <ModalFrame titleId={titleId} eyebrow="Documentos" title="Detalle del documento" onClose={onClose}>
      {item ? (
        <>
          <div className="mt-3 flex items-center gap-3">
            <FileMark family={item.fileFamily} />
            <p className="min-w-0 text-sm font-medium break-all text-nexo-deep">{item.name || "Sin nombre"}</p>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className={`${primaryButtonClass} disabled:opacity-70`}
              disabled={busy !== null}
              onClick={() => onOpen(item)}
            >
              {busy === "open" ? "Abriendo..." : "Ver"}
            </button>
            <button
              type="button"
              className={`${secondaryButtonClass} disabled:opacity-70`}
              disabled={busy !== null}
              onClick={() => onDownload(item)}
            >
              {busy === "download" ? "Preparando descarga..." : "Descargar"}
            </button>
          </div>
          <div className="mt-5 space-y-3">
            <DetailSection title="Información general">
              <dl className="space-y-2 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">Nombre</dt>
                  <dd className="text-right font-medium break-all text-nexo-deep">{item.name || "Sin nombre"}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">Archivo</dt>
                  <dd className="text-right font-medium break-all text-nexo-deep">
                    {item.originalFileName || "Sin archivo"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">Tipo</dt>
                  <dd>
                    <TypeBadge family={item.fileFamily} />
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">MIME</dt>
                  <dd className="text-right font-medium break-all text-nexo-deep">{item.mimeType || "Sin tipo"}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">Tamaño</dt>
                  <dd className="text-right font-medium text-nexo-deep">{formatBytes(item.size)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">Estado</dt>
                  <dd className="font-medium text-nexo-deep">{documentStatusLabel(item.status)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">Versión actual</dt>
                  <dd className="font-medium text-nexo-deep">
                    {item.currentVersionNumber >= 1 ? `v${item.currentVersionNumber}` : "Sin versión registrada"}
                  </dd>
                </div>
              </dl>
            </DetailSection>
            <DetailSection title="Actualización">
              <p className="text-sm leading-6 text-muted">
                {item.createdAt ? `Creado el ${dateFormat.format(item.createdAt)}` : "Sin fecha de creación"}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                {item.updatedAt ? `Actualizado el ${dateFormat.format(item.updatedAt)}` : "Sin fecha de actualización"}
              </p>
            </DetailSection>
            <DetailSection title="Vista previa">
              <p className="text-sm leading-6 text-muted">La vista previa todavía no está disponible.</p>
            </DetailSection>
          </div>
        </>
      ) : (
        <DocumentReadBody read={read} />
      )}
    </ModalFrame>
  );
}

function EditDocumentoModal({
  titleId,
  companyId,
  documentId,
  onClose,
  onSave,
}: {
  titleId: string;
  companyId: string;
  documentId: string;
  onClose: () => void;
  onSave: (
    item: CompanyDocument,
    name: string,
    file: File | null,
    onProgress?: (phase: "uploading" | "saving") => void,
  ) => Promise<void>;
}) {
  const read = useCompanyDocument(companyId, documentId);
  const [saving, setSaving] = useState(false);
  const requestClose = useCallback(() => {
    if (!saving) {
      onClose();
    }
  }, [onClose, saving]);
  const item = read.status === "ready" ? read.document : null;
  const blocked =
    item && item.status !== "ACTIVE"
      ? item.status === "ARCHIVED"
        ? "No se puede editar un documento archivado."
        : "No se puede editar un documento eliminado."
      : null;

  useModalBehavior(requestClose);

  return (
    <ModalFrame titleId={titleId} eyebrow="Documentos" title="Editar documento" onClose={requestClose}>
      {item && !blocked ? (
        <EditDocumentoForm item={item} saving={saving} setSaving={setSaving} onClose={requestClose} onSave={onSave} />
      ) : blocked ? (
        <p role="alert" className="mt-5 text-sm leading-6 text-red-700">
          {blocked}
        </p>
      ) : (
        <DocumentReadBody read={read} />
      )}
    </ModalFrame>
  );
}

function EditDocumentoForm({
  item,
  saving,
  setSaving,
  onClose,
  onSave,
}: {
  item: CompanyDocument;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  onClose: () => void;
  onSave: (
    item: CompanyDocument,
    name: string,
    file: File | null,
    onProgress?: (phase: "uploading" | "saving") => void,
  ) => Promise<void>;
}) {
  const nameId = useId();
  const fileId = useId();
  const [name, setName] = useState(item.name);
  const [replacement, setReplacement] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"uploading" | "saving" | null>(null);
  const savingRef = useRef(false);

  return (
    <>
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

          if (!name.trim()) {
            setError("Escribe el nombre del documento.");
            return;
          }

          if (replacement && (replacement.size <= 0 || detectFileFamily(replacement.type, replacement.name) === "OTHER")) {
            setError("El archivo no es compatible. Usa PDF, Word, Excel o una imagen.");
            return;
          }

          savingRef.current = true;
          setSaving(true);
          setPhase(replacement ? "uploading" : "saving");
          setError(null);
          void onSave(item, name.trim(), replacement, setPhase).catch((submitError: unknown) => {
            savingRef.current = false;
            setPhase(null);
            setError(fileActionError(submitError, "No se pudo actualizar el documento."));
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
            disabled={saving}
            className={`${fieldClass} mt-2`}
          />
        </div>
        <section className="rounded-xl border border-line bg-background px-4 py-3">
          <h3 className="text-sm font-semibold text-nexo-deep">Archivo</h3>
          <p className="mt-2 text-sm text-muted">Archivo actual</p>
          <p className="text-sm font-medium break-all text-nexo-deep">{item.originalFileName || "Sin archivo"}</p>
          <p className="mt-2 text-sm text-muted">Versión actual</p>
          <p className="text-sm font-medium text-nexo-deep">
            {item.currentVersionNumber >= 1 ? `v${item.currentVersionNumber}` : "Sin versión registrada"}
          </p>
          <p className="mt-2 text-sm text-muted">Tamaño</p>
          <p className="text-sm font-medium text-nexo-deep">{formatBytes(item.size)}</p>
          <label
            htmlFor={fileId}
            className={`${secondaryButtonClass} mt-4 ${saving ? "pointer-events-none opacity-70" : "cursor-pointer"}`}
          >
            Reemplazar archivo
          </label>
          <input
            id={fileId}
            name="reemplazo"
            type="file"
            accept={acceptedFileTypes}
            disabled={saving}
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              setReplacement(nextFile);
              setError(null);
            }}
            className="sr-only"
          />
          {replacement ? (
            <div className="mt-4">
              <p className="text-sm text-muted">Nuevo archivo</p>
              <p className="text-sm font-medium break-all text-nexo-deep">{replacement.name}</p>
              <p className="mt-2 text-sm text-muted">Tamaño</p>
              <p className="text-sm font-medium text-nexo-deep">{formatBytes(replacement.size)}</p>
              <p className="mt-3 text-sm leading-6 text-muted">
                Al guardar se creará una nueva versión del documento. El archivo anterior se conserva.
              </p>
            </div>
          ) : null}
        </section>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className={`${primaryButtonClass} disabled:opacity-70`} disabled={saving}>
            {saving ? (phase === "uploading" ? "Subiendo archivo..." : "Guardando cambios...") : "Guardar cambios"}
          </button>
        </div>
      </form>
    </>
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
