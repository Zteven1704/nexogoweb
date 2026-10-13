import { FirebaseError } from "firebase/app";
import { doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { getFirebaseApp, getFirebaseAuth, getFirebaseFirestore } from "@/lib/firebase";

/** Android and the web store the profile photo at profile_images/{uid}.jpg. */
export const profilePhotoMaxBytes = 10 * 1024 * 1024;

const profilePhotoTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

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

export function profilePhotoRejection(file: File): string | null {
  const type = file.type.toLowerCase();
  if (!profilePhotoTypes.has(type)) {
    return "Elige una imagen JPEG, PNG o WebP.";
  }

  if (file.size <= 0 || file.size >= profilePhotoMaxBytes) {
    return "La imagen debe pesar menos de 10 MB.";
  }

  return null;
}

function isJpeg(file: File): boolean {
  const type = file.type.toLowerCase();
  return type === "image/jpeg" || type === "image/jpg";
}

async function fileToJpeg(file: File): Promise<Blob> {
  if (isJpeg(file)) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ProfileError("No se pudo leer la imagen.");
  }

  const maxEdge = 2048;
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new ProfileError("No se pudo preparar la imagen.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.92);
  });
  if (!blob || blob.size <= 0) {
    throw new ProfileError("No se pudo convertir la imagen a JPEG.");
  }
  if (blob.size >= profilePhotoMaxBytes) {
    throw new ProfileError("La imagen debe pesar menos de 10 MB.");
  }

  return blob;
}

export async function uploadOwnProfilePhoto(uid: string, file: File): Promise<UserProfile> {
  const rejection = profilePhotoRejection(file);
  if (rejection) {
    throw new ProfileError(rejection);
  }

  const currentUser = getFirebaseAuth().currentUser;
  const userId = uid.trim();
  if (!currentUser || !userId || currentUser.uid !== userId) {
    throw new ProfileError("No hay una sesión activa.");
  }

  const profile = profileRef(userId);
  const existing = await getDoc(profile);
  if (!existing.exists()) {
    throw new ProfileError("Guarda primero el nombre y el teléfono. Después podrás cambiar la foto.");
  }

  const jpeg = await fileToJpeg(file);
  const storageRef = ref(getStorage(getFirebaseApp()), `profile_images/${currentUser.uid}.jpg`);

  let downloadUrl = "";
  try {
    await uploadBytes(storageRef, jpeg, { contentType: "image/jpeg" });
    downloadUrl = await getDownloadURL(storageRef);
  } catch (error) {
    if (error instanceof FirebaseError && error.code === "storage/unauthorized") {
      throw new ProfileError("No tienes permiso para cambiar la foto.");
    }
    if (error instanceof FirebaseError && error.code === "storage/unauthenticated") {
      throw new ProfileError("Tu sesión expiró. Vuelve a iniciar sesión.");
    }
    throw error;
  }

  await updateDoc(profile, {
    profileImageUrl: downloadUrl,
    fechaActualizacion: serverTimestamp(),
  });

  const saved = await getDoc(profile);
  if (!saved.exists()) {
    throw new ProfileError("No se pudo guardar la foto en el perfil.");
  }

  return mapProfile(saved.id, saved.data());
}
