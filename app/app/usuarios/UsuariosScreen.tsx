"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useAuthSession } from "@/components/auth/useAuthSession";
import {
  assignableRoleCodes,
  changeMemberRole,
  formatUserError,
  getCompanyUserAccess,
  inviteCompanyUser,
  listCompanyMembers,
  listPendingCompanyInvites,
  membershipStatusLabel,
  primaryRoleCode,
  revokeCompanyInvite,
  roleCodeLabel,
  setMemberStatus,
  type AssignableRoleCode,
  type CompanyInvite,
  type CompanyMembership,
} from "@/lib/users";

const primaryButtonClass =
  "inline-flex h-11 items-center justify-center rounded-full bg-nexo-deep px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#16345c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClass =
  "inline-flex h-11 items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-semibold text-nexo-deep transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue disabled:cursor-not-allowed disabled:opacity-60";

const fieldClass =
  "h-11 w-full rounded-xl border border-line bg-white px-4 text-sm text-nexo-deep outline-none placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue";

const cardClass =
  "rounded-2xl border border-line bg-white shadow-[0_16px_40px_-32px_rgba(10,35,66,0.65)]";

const columnsClass =
  "md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_8rem_7.5rem_9rem]";

type RoleFilter = "todos" | AssignableRoleCode | "SUPER_ADMIN";

type ReadyData = {
  companyId: string;
  companyName: string;
  actor: CompanyMembership;
  members: CompanyMembership[];
  invites: CompanyInvite[];
  invitesError: string;
};

type ScreenState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "denied"; message: string }
  | { status: "ready"; data: ReadyData };

async function fetchUsers(userId: string): Promise<ScreenState> {
  const access = await getCompanyUserAccess(userId);
  if (!access.companyId || !access.actor) {
    return {
      status: "error",
      message: "No hay una empresa activa para este usuario.",
    };
  }
  if (!access.canManage) {
    return {
      status: "denied",
      message: "Se requiere un rol de administrador para gestionar los usuarios de la empresa.",
    };
  }

  const members = await listCompanyMembers(access.companyId);
  let invites: CompanyInvite[] = [];
  let invitesError = "";
  try {
    invites = await listPendingCompanyInvites(access.companyId);
  } catch (error) {
    invitesError = formatUserError(error, "No se pudieron cargar las invitaciones.");
  }

  return {
    status: "ready",
    data: {
      companyId: access.companyId,
      companyName: access.companyName,
      actor: access.actor,
      members,
      invites,
      invitesError,
    },
  };
}

type ConfirmAction =
  | { kind: "suspend" | "revoke"; member: CompanyMembership }
  | { kind: "revoke-invite"; invite: CompanyInvite };

function formatWhen(value: Date | null): string {
  if (!value) {
    return "Sin registro";
  }

  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function memberName(member: CompanyMembership): string {
  return member.displayName.trim() || member.email;
}

function statusClass(status: string): string {
  if (status === "ACTIVE") {
    return "bg-emerald-50 text-emerald-800";
  }
  if (status === "SUSPENDED" || status === "REVOKED") {
    return "bg-slate-100 text-slate-600";
  }
  return "bg-amber-50 text-amber-800";
}

export function UsuariosScreen() {
  const session = useAuthSession();
  const [screen, setScreen] = useState<ScreenState>({ status: "loading" });
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("todos");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<CompanyMembership | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const searchId = useId();
  const filterId = useId();

  useEffect(() => {
    if (session.status !== "authenticated") {
      return;
    }

    const userId = session.user.uid;
    let cancelled = false;
    fetchUsers(userId)
      .then((result) => {
        if (!cancelled) {
          setScreen(result);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setScreen({
            status: "error",
            message: formatUserError(error, "No se pudieron cargar los usuarios."),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  const refresh = useCallback(async () => {
    if (session.status !== "authenticated") {
      return;
    }
    setScreen(await fetchUsers(session.user.uid));
  }, [session]);

  const visibleMembers =
    screen.status === "ready"
      ? screen.data.members.filter((member) => {
          const role = primaryRoleCode(member.roleCodes);
          const haystack = `${memberName(member)} ${member.email} ${roleCodeLabel(role)} ${membershipStatusLabel(member.status)}`.toLocaleLowerCase(
            "es",
          );
          const normalizedQuery = query.trim().toLocaleLowerCase("es");
          const matchesQuery = normalizedQuery.length === 0 || haystack.includes(normalizedQuery);
          const matchesRole = roleFilter === "todos" || role === roleFilter;
          return matchesQuery && matchesRole;
        })
      : [];

  if (session.status === "loading" || screen.status === "loading") {
    return <StatusPanel message="Cargando usuarios" />;
  }

  if (screen.status === "error") {
    return <StatusPanel message={screen.message} />;
  }

  if (screen.status === "denied") {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-nexo-deep">Usuarios</h1>
        <p className="text-sm leading-6 text-slate-600">{screen.message}</p>
      </section>
    );
  }

  const { data } = screen;
  const activeCount = data.members.filter((member) => member.status === "ACTIVE").length;

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-nexo-deep">Usuarios</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Administra las personas y los accesos de tu empresa.
          </p>
        </div>
        <button type="button" className={primaryButtonClass} onClick={() => setInviteOpen(true)}>
          + Invitar usuario
        </button>
      </header>

      <dl className="grid gap-3 sm:grid-cols-3">
        <Stat label="Usuarios" value={String(data.members.length)} />
        <Stat label="Activos" value={String(activeCount)} />
        <Stat label="Invitaciones" value={String(data.invites.length)} />
      </dl>

      {notice ? <p className="text-sm font-medium text-nexo-cyan">{notice}</p> : null}
      {actionError ? <p className="text-sm font-medium text-red-700">{actionError}</p> : null}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <label className="sr-only" htmlFor={searchId}>
          Buscar usuarios
        </label>
        <input
          id={searchId}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre, correo o rol"
          className={fieldClass}
        />
        <label className="sr-only" htmlFor={filterId}>
          Filtrar por rol
        </label>
        <select
          id={filterId}
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
          className={fieldClass}
        >
          <option value="todos">Todos los roles</option>
          <option value="SUPER_ADMIN">Super administrador</option>
          {assignableRoleCodes.map((code) => (
            <option key={code} value={code}>
              {roleCodeLabel(code)}
            </option>
          ))}
        </select>
      </div>

      <section className={cardClass}>
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-nexo-deep">Usuarios</h2>
        </div>
        {visibleMembers.length === 0 ? (
          <p className="px-5 py-10 text-sm text-slate-600">
            {data.members.length === 0
              ? "Todavía no hay usuarios en esta empresa."
              : "Ningún usuario coincide con la búsqueda."}
          </p>
        ) : (
          <ul>
            <li className={`hidden border-b border-line px-5 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase md:grid ${columnsClass}`}>
              <span>Nombre</span>
              <span>Email</span>
              <span>Rol</span>
              <span>Estado</span>
              <span>Último acceso</span>
            </li>
            {visibleMembers.map((member) => (
              <li key={member.userId} className="border-b border-line px-5 py-4 last:border-b-0">
                <div className={`grid gap-3 ${columnsClass}`}>
                  <div>
                    <p className="font-semibold text-nexo-deep">{memberName(member)}</p>
                    <p className="mt-1 text-sm text-slate-500 md:hidden">{member.email}</p>
                  </div>
                  <p className="hidden self-center text-sm text-slate-600 md:block">{member.email || "—"}</p>
                  <p className="self-center text-sm text-nexo-deep">
                    {roleCodeLabel(primaryRoleCode(member.roleCodes)) || "Sin rol"}
                  </p>
                  <p className="self-center">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(member.status)}`}>
                      {membershipStatusLabel(member.status)}
                    </span>
                  </p>
                  <p className="self-center text-sm text-slate-600">{formatWhen(member.lastAccessAt)}</p>
                </div>
                <MemberActions
                  member={member}
                  isSelf={member.userId === data.actor.userId}
                  onChangeRole={() => {
                    setActionError("");
                    setRoleTarget(member);
                  }}
                  onActivate={() => {
                    void runMemberAction({
                      member,
                      actorId: data.actor.userId,
                      companyId: data.companyId,
                      status: "ACTIVE",
                      setNotice,
                      setActionError,
                      refresh,
                    });
                  }}
                  onSuspend={() => {
                    setActionError("");
                    setConfirm({ kind: "suspend", member });
                  }}
                  onRevoke={() => {
                    setActionError("");
                    setConfirm({ kind: "revoke", member });
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cardClass}>
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-nexo-deep">Invitaciones pendientes</h2>
        </div>
        {data.invitesError ? (
          <p className="px-5 py-10 text-sm font-medium text-red-700">{data.invitesError}</p>
        ) : data.invites.length === 0 ? (
          <p className="px-5 py-10 text-sm text-slate-600">No hay invitaciones pendientes.</p>
        ) : (
          <ul>
            {data.invites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-col gap-3 border-b border-line px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-nexo-deep">{invite.email}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {roleCodeLabel(primaryRoleCode(invite.roleCodes)) || "Sin rol"} · Pendiente ·{" "}
                    {formatWhen(invite.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-sm font-semibold text-red-700 hover:underline"
                  onClick={() => {
                    setActionError("");
                    setConfirm({ kind: "revoke-invite", invite });
                  }}
                >
                  Revocar invitación
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {inviteOpen ? (
        <InviteModal
          companyId={data.companyId}
          companyName={data.companyName}
          actor={data.actor}
          onClose={() => setInviteOpen(false)}
          onCreated={async () => {
            setInviteOpen(false);
            setNotice("Invitación creada.");
            setActionError("");
            try {
              await refresh();
            } catch (error) {
              setActionError(
                formatUserError(error, "La invitación se creó, pero no se pudo actualizar la lista."),
              );
            }
          }}
        />
      ) : null}

      {roleTarget ? (
        <RoleModal
          member={roleTarget}
          companyId={data.companyId}
          actorId={data.actor.userId}
          onClose={() => setRoleTarget(null)}
          onSaved={async () => {
            setRoleTarget(null);
            setNotice("Rol actualizado.");
            setActionError("");
            try {
              await refresh();
            } catch (error) {
              setActionError(formatUserError(error, "El rol se actualizó, pero no se pudo actualizar la lista."));
            }
          }}
          onFailed={async (message) => {
            setActionError(message);
            try {
              await refresh();
            } catch {
              // El mensaje de la acción ya explica el fallo.
            }
          }}
        />
      ) : null}

      {confirm ? (
        <ConfirmModal
          action={confirm}
          companyId={data.companyId}
          actorId={data.actor.userId}
          onClose={() => setConfirm(null)}
          onDone={async (message) => {
            setConfirm(null);
            setNotice(message);
            setActionError("");
            await refresh();
          }}
          onError={async (message) => {
            setConfirm(null);
            setNotice("");
            setActionError(message);
            try {
              await refresh();
            } catch {
              // El mensaje de la acción ya explica el fallo.
            }
          }}
        />
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${cardClass} px-5 py-4`}>
      <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-1 font-display text-2xl font-semibold text-nexo-deep">{value}</dd>
    </div>
  );
}

function StatusPanel({ message }: { message: string }) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm text-slate-600">{message}</p>
    </section>
  );
}

function MemberActions({
  member,
  isSelf,
  onChangeRole,
  onActivate,
  onSuspend,
  onRevoke,
}: {
  member: CompanyMembership;
  isSelf: boolean;
  onChangeRole: () => void;
  onActivate: () => void;
  onSuspend: () => void;
  onRevoke: () => void;
}) {
  const isSuperAdmin = member.roleCodes.includes("SUPER_ADMIN");
  const canChangeRole = member.status !== "REVOKED" && !isSuperAdmin;
  const canActivate = member.status !== "ACTIVE";
  const canSuspend = member.status === "ACTIVE" && !isSelf && !isSuperAdmin;
  const canRevoke = member.status !== "REVOKED" && !isSelf && !isSuperAdmin;

  if (!canChangeRole && !canActivate && !canSuspend && !canRevoke) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
      {canChangeRole ? (
        <button type="button" className="text-sm font-semibold text-nexo-blue hover:underline" onClick={onChangeRole}>
          Cambiar rol
        </button>
      ) : null}
      {canActivate ? (
        <button type="button" className="text-sm font-semibold text-nexo-blue hover:underline" onClick={onActivate}>
          Activar
        </button>
      ) : null}
      {canSuspend ? (
        <button type="button" className="text-sm font-semibold text-nexo-blue hover:underline" onClick={onSuspend}>
          Desactivar
        </button>
      ) : null}
      {canRevoke ? (
        <button type="button" className="text-sm font-semibold text-red-700 hover:underline" onClick={onRevoke}>
          Revocar acceso
        </button>
      ) : null}
    </div>
  );
}

async function runMemberAction(input: {
  member: CompanyMembership;
  actorId: string;
  companyId: string;
  status: "ACTIVE";
  setNotice: (value: string) => void;
  setActionError: (value: string) => void;
  refresh: () => Promise<void>;
}) {
  input.setActionError("");
  input.setNotice("");
  try {
    await setMemberStatus({
      companyId: input.companyId,
      userId: input.member.userId,
      status: input.status,
      actorId: input.actorId,
    });
    input.setNotice("Usuario activado.");
    await input.refresh();
  } catch (error) {
    input.setActionError(formatUserError(error, "No se pudo activar el usuario."));
    await input.refresh().catch(() => undefined);
  }
}

function ModalFrame({
  title,
  titleId,
  onClose,
  children,
}: {
  title: string;
  titleId: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-nexo-deep/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-display text-xl font-semibold text-nexo-deep">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line text-nexo-deep hover:bg-slate-50"
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

function InviteModal({
  companyId,
  companyName,
  actor,
  onClose,
  onCreated,
}: {
  companyId: string;
  companyName: string;
  actor: CompanyMembership;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const titleId = useId();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [roleCode, setRoleCode] = useState<AssignableRoleCode>("EMPLOYEE");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (savingRef.current) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      await inviteCompanyUser({
        companyId,
        companyName,
        email,
        displayName: name,
        roleCode,
        invitedBy: actor.userId,
        invitedByName: memberName(actor),
      });
      await onCreated();
    } catch (caught) {
      setError(formatUserError(caught, "No se pudo crear la invitación."));
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <ModalFrame title="Invitar usuario" titleId={titleId} onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <p className="text-sm leading-6 text-slate-600">
          Se guarda una invitación pendiente para esta empresa. No se envía un correo.
        </p>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-nexo-deep">
          Email
          <input
            required
            type="email"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-nexo-deep">
          Nombre
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-nexo-deep">
          Rol
          <select
            required
            value={roleCode}
            onChange={(event) => setRoleCode(event.target.value as AssignableRoleCode)}
            className={fieldClass}
          >
            {assignableRoleCodes.map((code) => (
              <option key={code} value={code}>
                {roleCodeLabel(code)}
              </option>
            ))}
          </select>
        </label>
        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        <div className="mt-2 flex justify-end gap-3">
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className={primaryButtonClass} disabled={saving}>
            {saving ? "Guardando..." : "Invitar usuario"}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

function RoleModal({
  member,
  companyId,
  actorId,
  onClose,
  onSaved,
  onFailed,
}: {
  member: CompanyMembership;
  companyId: string;
  actorId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onFailed: (message: string) => Promise<void>;
}) {
  const titleId = useId();
  const current = primaryRoleCode(member.roleCodes);
  const initial = (assignableRoleCodes as readonly string[]).includes(current)
    ? (current as AssignableRoleCode)
    : "EMPLOYEE";
  const [roleCode, setRoleCode] = useState<AssignableRoleCode>(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (savingRef.current) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      await changeMemberRole({
        companyId,
        userId: member.userId,
        roleCode,
        updatedBy: actorId,
      });
      await onSaved();
    } catch (caught) {
      const message = formatUserError(caught, "No se pudo cambiar el rol.");
      setError(message);
      savingRef.current = false;
      setSaving(false);
      await onFailed(message);
    }
  }

  return (
    <ModalFrame title="Cambiar rol" titleId={titleId} onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <p className="text-sm text-slate-600">{memberName(member)}</p>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-nexo-deep">
          Rol
          <select
            value={roleCode}
            onChange={(event) => setRoleCode(event.target.value as AssignableRoleCode)}
            className={fieldClass}
          >
            {assignableRoleCodes.map((code) => (
              <option key={code} value={code}>
                {roleCodeLabel(code)}
              </option>
            ))}
          </select>
        </label>
        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        <div className="mt-2 flex justify-end gap-3">
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className={primaryButtonClass} disabled={saving}>
            {saving ? "Guardando..." : "Guardar rol"}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

function ConfirmModal({
  action,
  companyId,
  actorId,
  onClose,
  onDone,
  onError,
}: {
  action: ConfirmAction;
  companyId: string;
  actorId: string;
  onClose: () => void;
  onDone: (message: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const titleId = useId();
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const copy =
    action.kind === "suspend"
      ? {
          title: "Desactivar",
          body: "¿Quieres desactivar el acceso de este usuario?",
          confirm: "Desactivar",
        }
      : action.kind === "revoke"
        ? {
            title: "Revocar acceso",
            body: "El usuario conservará su información, pero perderá el acceso a esta empresa.",
            confirm: "Revocar acceso",
          }
        : {
            title: "Revocar invitación",
            body: "La invitación quedará sin efecto. No se elimina el registro.",
            confirm: "Revocar",
          };

  async function confirmAction() {
    if (savingRef.current) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      if (action.kind === "revoke-invite") {
        await revokeCompanyInvite({
          inviteId: action.invite.id,
          companyId,
          actorId,
        });
        await onDone("Invitación revocada.");
        return;
      }

      await setMemberStatus({
        companyId,
        userId: action.member.userId,
        status: action.kind === "suspend" ? "SUSPENDED" : "REVOKED",
        actorId,
      });
      await onDone(action.kind === "suspend" ? "Usuario desactivado." : "Acceso revocado.");
    } catch (error) {
      onError(
        formatUserError(
          error,
          action.kind === "revoke-invite"
            ? "No se pudo revocar la invitación."
            : "No se pudo actualizar el acceso.",
        ),
      );
    }
  }

  return (
    <ModalFrame title={copy.title} titleId={titleId} onClose={onClose}>
      <p className="text-sm leading-6 text-slate-600">{copy.body}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button type="button" className={primaryButtonClass} onClick={() => void confirmAction()} disabled={saving}>
          {saving ? "Guardando..." : copy.confirm}
        </button>
      </div>
    </ModalFrame>
  );
}
