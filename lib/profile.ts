import { FirebaseError } from "firebase/app";
import { doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase";

/**
 * Android writes profile photos to profile_images/{uid}.jpg.
 * Current Storage rules only allow users/{userId}/profile/{fileName}
 * and deny every other path. Web must not upload until those rules match.
 */
export const profilePhotoBlockedReason =
  "La foto no se puede cambiar desde la web: las reglas de Storage no permiten profile_images/{uid}.jpg.";

export type UserProfile = {
  uid: string;
  nombre: string;
  correo: string;
  telefono: string;
  whatsapp: string;
  profileImageUrl: string;
  rol: string | null;
  isActive: boolean | null;
  fechaRegistro: Date | null;
  fechaActualizacion: Date | null;
};

export type OwnProfile =
  | { status: "missing"; uid: string }
  | { status: "ready"; profile: UserProfile };

export class ProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileError";
  }
}

const roleLabels: Record<string, string> = {
  ADMIN: "Administrador",
  VET: "Médico Veterinario",
  VET_ASSISTANT: "Auxiliar Veterinario",
  USER: "Usuario",
};

export function legacyRoleLabel(role: string): string {
  return roleLabels[role] ?? role;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asDate(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();
    return date instanceof Date ? date : null;
  }

  return null;
}

function readRole(data: Record<string, unknown>): string | null {
  const role = asString(data.rol) || asString(data.role) || asString(data.Rol) || asString(data.Role);
  return role || null;
}

function mapProfile(uid: string, data: Record<string, unknown>): UserProfile {
  return {
    uid: asString(data.uid) || uid,
    nombre: asString(data.nombre),
    correo: asString(data.correo),
    telefono: asString(data.telefono),
    whatsapp: asString(data.whatsapp),
    profileImageUrl: asString(data.profileImageUrl),
    rol: readRole(data),
    isActive: typeof data.isActive === "boolean" ? data.isActive : null,
    fechaRegistro: asDate(data.fechaRegistro),
    fechaActualizacion: asDate(data.fechaActualizacion),
  };
}

function profileRef(uid: string) {
  return doc(getFirebaseFirestore(), "usuarios", uid);
}

export function formatProfileError(error: unknown, fallback: string): string {
  if (error instanceof ProfileError) {
    return error.message;
  }

  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "No tienes permiso para acceder a tu perfil.";
  }

  if (error instanceof FirebaseError && error.code === "unavailable") {
    return "No hay conexión con el servidor. Inténtalo de nuevo.";
  }

  return fallback;
}

export async function getOwnProfile(uid: string): Promise<OwnProfile> {
  const userId = uid.trim();
  if (!userId) {
    throw new ProfileError("No hay una sesión activa.");
  }

  const snapshot = await getDoc(profileRef(userId));
  if (!snapshot.exists()) {
    return { status: "missing", uid: userId };
  }

  return { status: "ready", profile: mapProfile(snapshot.id, snapshot.data()) };
}

export async function saveOwnProfile(input: {
  uid: string;
  authEmail: string;
  nombre: string;
  telefono: string;
  whatsapp: string;
}): Promise<UserProfile> {
  const uid = input.uid.trim();
  const nombre = input.nombre.trim();
  const telefono = input.telefono.trim();
  const whatsapp = input.whatsapp.trim();

  if (!uid) {
    throw new ProfileError("No hay una sesión activa.");
  }

  if (!nombre) {
    throw new ProfileError("Escribe el nombre.");
  }

  if (!telefono) {
    throw new ProfileError("Escribe el teléfono.");
  }

  const ref = profileRef(uid);
  const current = await getDoc(ref);

  if (current.exists()) {
    await updateDoc(ref, {
      nombre,
      telefono,
      whatsapp,
      fechaActualizacion: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      uid,
      nombre,
      correo: input.authEmail.trim(),
      telefono,
      whatsapp,
      rol: "USER",
      estado: "aprobado",
      isApproved: true,
      isProfessional: false,
      specialization: "",
      licenseNumber: "",
      language: "es",
      isActive: true,
      fechaRegistro: serverTimestamp(),
      fechaActualizacion: serverTimestamp(),
    });
  }

  const saved = await getDoc(ref);
  if (!saved.exists()) {
    throw new ProfileError("No se pudo guardar el perfil.");
  }

  return mapProfile(saved.id, saved.data());
}
