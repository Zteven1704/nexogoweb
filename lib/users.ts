import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import { resolveActiveCompanyId } from "@/lib/company";
import { getFirebaseFirestore } from "@/lib/firebase";

export const membershipStatuses = [
  "INVITED",
  "PENDING",
  "ACTIVE",
  "SUSPENDED",
  "REVOKED",
] as const;

export type MembershipStatus = (typeof membershipStatuses)[number];

export const inviteStatuses = ["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"] as const;

export type InviteStatus = (typeof inviteStatuses)[number];

export const companyRoleCodes = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "EMPLOYEE",
  "CLIENT",
] as const;

export type CompanyRoleCode = (typeof companyRoleCodes)[number];

export const assignableRoleCodes = ["ADMIN", "MANAGER", "EMPLOYEE", "CLIENT"] as const;

export type AssignableRoleCode = (typeof assignableRoleCodes)[number];

export const membershipScopeTypes = ["COMPANY", "BRANCH", "TEAM", "ASSIGNED", "OWN"] as const;

export type MembershipScopeType = (typeof membershipScopeTypes)[number];

export const assignmentStatuses = ["ACTIVE", "SUSPENDED", "REVOKED"] as const;

export type AssignmentStatus = (typeof assignmentStatuses)[number];

export type CompanyMembership = {
  userId: string;
  companyId: string;
  roleCodes: string[];
  customRoleIds: string[];
  status: MembershipStatus;
  scopeType: MembershipScopeType;
  branchIds: string[];
  linkedClientId: string | null;
  isDefault: boolean;
  title: string;
  email: string;
  displayName: string;
  invitedBy: string;
  approvedBy: string;
  inviteId: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  lastAccessAt: Date | null;
};

export type CompanyInvite = {
  id: string;
  companyId: string;
  companyName: string;
  email: string;
  displayName: string;
  roleCodes: string[];
  status: InviteStatus;
  invitedBy: string;
  invitedByName: string;
  acceptedByUserId: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type CompanyUserAccess = {
  companyId: string | null;
  companyName: string;
  actor: CompanyMembership | null;
  canManage: boolean;
};

export class UserManagementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserManagementError";
  }
}

const roleLabels: Record<CompanyRoleCode, string> = {
  SUPER_ADMIN: "Super administrador",
  ADMIN: "Administrador",
  MANAGER: "Manager",
  EMPLOYEE: "Empleado",
  CLIENT: "Cliente",
};

const statusLabels: Record<MembershipStatus, string> = {
  ACTIVE: "Activo",
  SUSPENDED: "Desactivado",
  REVOKED: "Sin acceso",
  PENDING: "Pendiente",
  INVITED: "Invitado",
};

export function membershipStatusLabel(status: string): string {
  return statusLabels[status as MembershipStatus] ?? status;
}

export function roleCodeLabel(code: string): string {
  return roleLabels[code as CompanyRoleCode] ?? code;
}

export function primaryRoleCode(roleCodes: string[]): string {
  return roleCodes[0] ?? "";
}

export function canManageUsers(roleCodes: string[]): boolean {
  return roleCodes.includes("ADMIN") || roleCodes.includes("SUPER_ADMIN");
}

export function memberSortName(member: CompanyMembership): string {
  return (member.displayName || member.email).toLocaleLowerCase("es");
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function asDate(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  return null;
}

function asMembershipStatus(value: unknown): MembershipStatus {
  return membershipStatuses.includes(value as MembershipStatus)
    ? (value as MembershipStatus)
    : "PENDING";
}

function asInviteStatus(value: unknown): InviteStatus {
  return inviteStatuses.includes(value as InviteStatus) ? (value as InviteStatus) : "PENDING";
}

function asScopeType(value: unknown): MembershipScopeType {
  return membershipScopeTypes.includes(value as MembershipScopeType)
    ? (value as MembershipScopeType)
    : "COMPANY";
}

function mapMembership(id: string, data: DocumentData): CompanyMembership {
  const linked = data.linkedClientId;
  return {
    userId: asString(data.userId) || id,
    companyId: asString(data.companyId),
    roleCodes: asStringList(data.roleCodes),
    customRoleIds: asStringList(data.customRoleIds),
    status: asMembershipStatus(data.status),
    scopeType: asScopeType(data.scopeType),
    branchIds: asStringList(data.branchIds),
    linkedClientId: typeof linked === "string" && linked.length > 0 ? linked : null,
    isDefault: data.isDefault === true,
    title: asString(data.title),
    email: asString(data.email),
    displayName: asString(data.displayName),
    invitedBy: asString(data.invitedBy),
    approvedBy: asString(data.approvedBy),
    inviteId: asString(data.inviteId),
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
    lastAccessAt: asDate(data.lastAccessAt),
  };
}

function mapInvite(id: string, data: DocumentData): CompanyInvite {
  return {
    id,
    companyId: asString(data.companyId),
    companyName: asString(data.companyName),
    email: asString(data.email),
    displayName: asString(data.displayName),
    roleCodes: asStringList(data.roleCodes),
    status: asInviteStatus(data.status),
    invitedBy: asString(data.invitedBy),
    invitedByName: asString(data.invitedByName),
    acceptedByUserId: asString(data.acceptedByUserId),
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
  };
}

function membershipRef(companyId: string, userId: string) {
  return doc(getFirebaseFirestore(), "companies", companyId, "memberships", userId);
}

function assignmentRef(companyId: string, userId: string) {
  return doc(getFirebaseFirestore(), "companies", companyId, "role_assignments", userId);
}

function mirrorRef(userId: string, companyId: string) {
  return doc(getFirebaseFirestore(), "users", userId, "company_memberships", companyId);
}

function isAssignableRole(roleCode: string): roleCode is AssignableRoleCode {
  return (assignableRoleCodes as readonly string[]).includes(roleCode);
}

function assignmentStatusFor(status: MembershipStatus): AssignmentStatus {
  if (status === "ACTIVE") {
    return "ACTIVE";
  }

  if (status === "REVOKED") {
    return "REVOKED";
  }

  return "SUSPENDED";
}

export function formatUserError(error: unknown, fallback: string): string {
  if (error instanceof UserManagementError) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String(error.code);
    if (code === "permission-denied") {
      return "No tienes permiso para realizar esta acción.";
    }
    if (code === "unauthenticated") {
      return "Tu sesión expiró. Vuelve a iniciar sesión.";
    }
    if (code === "unavailable") {
      return "No hay conexión con el servidor. Inténtalo de nuevo.";
    }
    if (code === "not-found") {
      return "No se encontró el registro.";
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export async function getCompanyUserAccess(userId: string): Promise<CompanyUserAccess> {
  const companyId = await resolveActiveCompanyId(userId);
  if (!companyId) {
    return { companyId: null, companyName: "", actor: null, canManage: false };
  }

  const [membershipSnap, mirrorSnap] = await Promise.all([
    getDoc(membershipRef(companyId, userId)),
    getDoc(mirrorRef(userId, companyId)),
  ]);

  const actor = membershipSnap.exists() ? mapMembership(membershipSnap.id, membershipSnap.data()) : null;
  let companyName = mirrorSnap.exists() ? asString(mirrorSnap.get("companyName")) : "";
  if (!companyName) {
    try {
      const companySnap = await getDoc(doc(getFirebaseFirestore(), "companies", companyId));
      companyName = companySnap.exists() ? asString(companySnap.get("name")) : "";
    } catch {
      companyName = "";
    }
  }

  return {
    companyId,
    companyName,
    actor,
    canManage: actor ? canManageUsers(actor.roleCodes) : false,
  };
}

export async function listCompanyMembers(companyId: string): Promise<CompanyMembership[]> {
  const snapshot = await getDocs(
    collection(getFirebaseFirestore(), "companies", companyId, "memberships"),
  );

  return snapshot.docs
    .map((item) => mapMembership(item.id, item.data()))
    .sort((left, right) => {
      const activeOrder = Number(left.status !== "ACTIVE") - Number(right.status !== "ACTIVE");
      if (activeOrder !== 0) {
        return activeOrder;
      }

      return memberSortName(left).localeCompare(memberSortName(right), "es");
    });
}

export async function listPendingCompanyInvites(companyId: string): Promise<CompanyInvite[]> {
  const snapshot = await getDocs(
    query(collection(getFirebaseFirestore(), "company_invites"), where("companyId", "==", companyId)),
  );

  return snapshot.docs
    .map((item) => mapInvite(item.id, item.data()))
    .filter((item) => item.status === "PENDING")
    .sort((left, right) => (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0));
}

export async function inviteCompanyUser(input: {
  companyId: string;
  companyName: string;
  email: string;
  displayName: string;
  roleCode: string;
  invitedBy: string;
  invitedByName: string;
}): Promise<CompanyInvite> {
  const companyId = input.companyId.trim();
  const email = input.email.trim().toLowerCase();
  await requireActiveManager(companyId, input.invitedBy);
  if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
    throw new UserManagementError("Ingresa un correo válido.");
  }
  if (!isAssignableRole(input.roleCode)) {
    throw new UserManagementError("Selecciona un rol válido.");
  }

  const members = await listCompanyMembers(companyId);
  if (members.some((member) => member.email.trim().toLowerCase() === email)) {
    throw new UserManagementError("Ese correo ya tiene una membresía en esta empresa.");
  }

  const pending = await listPendingCompanyInvites(companyId);
  if (pending.some((item) => item.email.trim().toLowerCase() === email)) {
    throw new UserManagementError("Ya existe una invitación pendiente para este correo.");
  }

  const id = `inv_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
  const invite = {
    id,
    companyId,
    companyName: input.companyName,
    email,
    displayName: input.displayName.trim(),
    roleCodes: [input.roleCode],
    status: "PENDING",
    invitedBy: input.invitedBy,
    invitedByName: input.invitedByName,
    acceptedByUserId: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(getFirebaseFirestore(), "company_invites", id), invite);
  const saved = await getDoc(doc(getFirebaseFirestore(), "company_invites", id));
  return saved.exists()
    ? mapInvite(saved.id, saved.data())
    : mapInvite(id, { ...invite, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
}

export async function revokeCompanyInvite(input: {
  inviteId: string;
  companyId: string;
  actorId: string;
}): Promise<void> {
  const companyId = input.companyId.trim();
  const inviteId = input.inviteId.trim();
  await requireActiveManager(companyId, input.actorId);

  if (!inviteId) {
    throw new UserManagementError("No se encontró la invitación.");
  }

  const snapshot = await getDoc(doc(getFirebaseFirestore(), "company_invites", inviteId));
  if (!snapshot.exists()) {
    throw new UserManagementError("No se encontró la invitación.");
  }

  const invite = mapInvite(snapshot.id, snapshot.data());
  if (invite.companyId !== companyId) {
    throw new UserManagementError("Esta invitación no pertenece a la empresa activa.");
  }
  if (invite.status !== "PENDING") {
    throw new UserManagementError("Esta invitación ya no está pendiente.");
  }

  await updateDoc(snapshot.ref, {
    status: "REVOKED",
    updatedAt: serverTimestamp(),
  });
}

async function requireMember(companyId: string, userId: string): Promise<CompanyMembership> {
  const snapshot = await getDoc(membershipRef(companyId, userId));
  if (!snapshot.exists()) {
    throw new UserManagementError("No se encontró el usuario en esta empresa.");
  }

  const member = mapMembership(snapshot.id, snapshot.data());
  if (member.companyId && member.companyId !== companyId) {
    throw new UserManagementError("Este usuario no pertenece a la empresa activa.");
  }

  return member;
}

async function requireActiveManager(companyId: string, actorId: string): Promise<CompanyMembership> {
  const actor = actorId.trim();
  if (!companyId) {
    throw new UserManagementError("No hay una empresa activa.");
  }
  if (!actor) {
    throw new UserManagementError("No hay una sesión activa.");
  }

  const membership = await requireMember(companyId, actor);
  if (membership.status !== "ACTIVE" || !canManageUsers(membership.roleCodes)) {
    throw new UserManagementError("Se requiere un rol de administrador para gestionar los usuarios de la empresa.");
  }

  return membership;
}

async function syncMirror(userId: string, companyId: string, fields: Record<string, unknown>): Promise<void> {
  try {
    await updateDoc(mirrorRef(userId, companyId), fields);
  } catch {
    // Android trata el espejo como best-effort: las Rules solo permiten al propio usuario.
  }
}

async function upsertAssignment(
  companyId: string,
  userId: string,
  roleCodes: string[],
  status: AssignmentStatus,
  assignedBy: string,
): Promise<void> {
  await setDoc(
    assignmentRef(companyId, userId),
    {
      id: userId,
      userId,
      companyId,
      roleCodes: roleCodes.length > 0 ? roleCodes : ["EMPLOYEE"],
      customRoleIds: [],
      status,
      assignedAt: serverTimestamp(),
      assignedBy,
      updatedAt: serverTimestamp(),
      notes: "",
    },
    { merge: true },
  );
}

export async function changeMemberRole(input: {
  companyId: string;
  userId: string;
  roleCode: string;
  updatedBy: string;
}): Promise<void> {
  const companyId = input.companyId.trim();
  const userId = input.userId.trim();
  await requireActiveManager(companyId, input.updatedBy);
  if (!isAssignableRole(input.roleCode)) {
    throw new UserManagementError("Selecciona un rol válido.");
  }

  const existing = await requireMember(companyId, userId);
  if (existing.roleCodes.includes("SUPER_ADMIN")) {
    throw new UserManagementError("No se puede cambiar el rol de un super administrador.");
  }
  if (existing.status === "REVOKED") {
    throw new UserManagementError("Primero debes reactivar el acceso del usuario.");
  }

  const roleCodes = [input.roleCode];
  await updateDoc(membershipRef(companyId, userId), {
    roleCodes,
    updatedAt: serverTimestamp(),
    approvedBy: input.updatedBy || existing.approvedBy,
  });
  await syncMirror(userId, companyId, {
    roleCodes,
    status: existing.status,
  });

  try {
    await upsertAssignment(
      companyId,
      userId,
      roleCodes,
      assignmentStatusFor(existing.status),
      input.updatedBy,
    );
  } catch (error) {
    throw new UserManagementError(
      `El rol de la membresía se actualizó, pero no se pudo actualizar la asignación de rol. ${formatUserError(error, "")}`.trim(),
    );
  }
}

export async function setMemberStatus(input: {
  companyId: string;
  userId: string;
  status: Extract<MembershipStatus, "ACTIVE" | "SUSPENDED" | "REVOKED">;
  actorId: string;
}): Promise<void> {
  const companyId = input.companyId.trim();
  const userId = input.userId.trim();
  const actorId = input.actorId.trim();
  await requireActiveManager(companyId, actorId);
  if (userId === actorId && input.status !== "ACTIVE") {
    throw new UserManagementError(
      input.status === "SUSPENDED"
        ? "No puedes desactivar tu propio acceso."
        : "No puedes revocar tu propio acceso.",
    );
  }

  const existing = await requireMember(companyId, userId);
  const fields: Record<string, unknown> = {
    status: input.status,
    updatedAt: serverTimestamp(),
  };
  if (input.status === "ACTIVE") {
    fields.approvedBy = actorId;
  }

  await updateDoc(membershipRef(companyId, userId), fields);
  await syncMirror(userId, companyId, { status: input.status });

  try {
    await upsertAssignment(
      companyId,
      userId,
      existing.roleCodes,
      assignmentStatusFor(input.status),
      actorId,
    );
  } catch (error) {
    throw new UserManagementError(
      `El estado del usuario se actualizó, pero no se pudo actualizar la asignación de rol. ${formatUserError(error, "")}`.trim(),
    );
  }
}
