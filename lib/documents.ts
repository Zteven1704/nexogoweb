import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseApp, getFirebaseFirestore } from "@/lib/firebase";

export type DocumentFileFamily = "PDF" | "WORD" | "EXCEL" | "IMAGE" | "OTHER";

export type DocumentStatus = "ACTIVE" | "ARCHIVED" | "DELETED";

export type DocumentVisibility = "ORG_STAFF" | "CLIENT_SHARED" | "PRIVATE";

export type DocumentSource = "UPLOAD" | "GENERATED" | "IMPORT" | "CHAT";

/** Logical document at companies/{companyId}/documents/{documentId}. */
export type Document = {
  id: string;
  companyId: string;
  name: string;
  originalFileName: string;
  fileFamily: DocumentFileFamily;
  mimeType: string;
  size: number;
  checksum: string;
  folderId: string | null;
  categoryId: string | null;
  tagIds: string[];
  status: DocumentStatus;
  visibility: DocumentVisibility;
  currentVersionId: string | null;
  currentVersionNumber: number;
  storagePath: string;
  thumbnailPath: string;
  downloadUrl: string;
  source: DocumentSource;
  generator: string;
  searchTokens: string[];
  notes: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  createdBy: string;
  updatedBy: string;
  archivedAt: Date | null;
};

type FirestoreData = { [key: string]: unknown };

const fileFamilies: readonly DocumentFileFamily[] = ["PDF", "WORD", "EXCEL", "IMAGE", "OTHER"];
const documentStatuses: readonly DocumentStatus[] = ["ACTIVE", "ARCHIVED", "DELETED"];
const visibilities: readonly DocumentVisibility[] = ["ORG_STAFF", "CLIENT_SHARED", "PRIVATE"];
const sources: readonly DocumentSource[] = ["UPLOAD", "GENERATED", "IMPORT", "CHAT"];

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asFileFamily(value: unknown): DocumentFileFamily {
  return fileFamilies.includes(value as DocumentFileFamily) ? (value as DocumentFileFamily) : "OTHER";
}

function asDocumentStatus(value: unknown): DocumentStatus | null {
  return documentStatuses.includes(value as DocumentStatus) ? (value as DocumentStatus) : null;
}

function asVisibility(value: unknown): DocumentVisibility {
  return visibilities.includes(value as DocumentVisibility) ? (value as DocumentVisibility) : "ORG_STAFF";
}

function asSource(value: unknown): DocumentSource {
  return sources.includes(value as DocumentSource) ? (value as DocumentSource) : "UPLOAD";
}

function asSize(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function asVersionNumber(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
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

function toDocument(id: string, companyId: string, data: FirestoreData): Document | null {
  const status = asDocumentStatus(data.status);

  if (!status) {
    return null;
  }

  return {
    id,
    companyId: asString(data.companyId) || companyId,
    name: asString(data.name),
    originalFileName: asString(data.originalFileName),
    fileFamily: asFileFamily(data.fileFamily),
    mimeType: asString(data.mimeType),
    size: asSize(data.size),
    checksum: asString(data.checksum),
    folderId: asNullableString(data.folderId),
    categoryId: asNullableString(data.categoryId),
    tagIds: asStringList(data.tagIds),
    status,
    visibility: asVisibility(data.visibility),
    currentVersionId: asNullableString(data.currentVersionId),
    currentVersionNumber: asVersionNumber(data.currentVersionNumber),
    storagePath: asString(data.storagePath),
    thumbnailPath: asString(data.thumbnailPath),
    downloadUrl: asString(data.downloadUrl),
    source: asSource(data.source),
    generator: asString(data.generator),
    searchTokens: asStringList(data.searchTokens),
    notes: asString(data.notes),
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
    createdBy: asString(data.createdBy),
    updatedBy: asString(data.updatedBy),
    archivedAt: asDate(data.archivedAt),
  };
}

export function sortDocumentsByUpdated(documents: Document[]): Document[] {
  return [...documents].sort((left, right) => {
    const leftTime = left.updatedAt?.getTime() ?? 0;
    const rightTime = right.updatedAt?.getTime() ?? 0;

    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return left.name.localeCompare(right.name, "es", { sensitivity: "base" });
  });
}

export type DocumentVersion = {
  id: string;
  companyId: string;
  documentId: string;
  versionNumber: number;
  storagePath: string;
  mimeType: string;
  size: number;
  checksum: string;
  changeNote: string;
  isCurrent: boolean;
  status: "ACTIVE" | "SUPERSEDED" | "RESTORED_FROM";
  createdAt: Date | null;
  updatedAt: Date | null;
  createdBy: string;
};

const pdfMimes = new Set(["application/pdf"]);
const wordMimes = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const excelMimes = new Set([
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
]);
const imageMimes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

export function familyFromMime(mimeType: string): DocumentFileFamily {
  const mime = mimeType.trim().toLowerCase();

  if (pdfMimes.has(mime)) {
    return "PDF";
  }

  if (wordMimes.has(mime)) {
    return "WORD";
  }

  if (excelMimes.has(mime)) {
    return "EXCEL";
  }

  if (imageMimes.has(mime) || mime.startsWith("image/")) {
    return "IMAGE";
  }

  return "OTHER";
}

export function familyFromFileName(fileName: string): DocumentFileFamily {
  const extension = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase() : "";

  switch (extension) {
    case "pdf":
      return "PDF";
    case "doc":
    case "docx":
      return "WORD";
    case "xls":
    case "xlsx":
    case "csv":
      return "EXCEL";
    case "jpg":
    case "jpeg":
    case "png":
    case "webp":
    case "gif":
    case "heic":
    case "heif":
      return "IMAGE";
    default:
      return "OTHER";
  }
}

export function detectFileFamily(mimeType: string, fileName: string): DocumentFileFamily {
  const fromMime = mimeType.trim() ? familyFromMime(mimeType) : "OTHER";

  if (fromMime !== "OTHER") {
    return fromMime;
  }

  return familyFromFileName(fileName);
}

export function sanitizeFileName(fileName: string): string {
  const trimmed = fileName.trim() || "file";
  const cleaned = trimmed.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");

  if (cleaned.length <= 120) {
    return cleaned;
  }

  const dot = cleaned.lastIndexOf(".");
  const extension = dot > 0 ? cleaned.slice(dot) : "";

  if (!extension || extension.length >= 120) {
    return cleaned.slice(0, 120);
  }

  return `${cleaned.slice(0, 120 - extension.length)}${extension}`;
}

function newPrefixedId(prefix: "doc" | "ver" | "lnk"): string {
  const hex = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  return `${prefix}_${hex}`;
}

function displayNameFromFile(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
  return stem.trim() || fileName;
}

function buildSearchTokens(name: string, originalFileName: string): string[] {
  return [
    ...new Set(
      [name, originalFileName]
        .map((item) => item.trim().toLocaleLowerCase("es"))
        .filter(Boolean),
    ),
  ];
}

export type UploadDocumentInput = {
  companyId: string;
  file: File;
  createdBy: string;
  displayName?: string;
  recordId?: string;
};

function primaryDocumentMissing(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

export async function uploadCompanyDocument(input: UploadDocumentInput): Promise<Document> {
  const companyId = input.companyId.trim();
  const createdBy = input.createdBy.trim();
  const file = input.file;
  const originalFileName = file.name.trim();

  if (!companyId) {
    throw new Error("No hay una empresa activa para subir el documento.");
  }

  if (!createdBy) {
    throw new Error("No hay una sesión activa.");
  }

  if (!originalFileName || file.size <= 0) {
    throw new Error("Selecciona un archivo.");
  }

  const fileFamily = detectFileFamily(file.type, originalFileName);

  if (fileFamily === "OTHER") {
    throw new Error("El archivo no es compatible. Usa PDF, Word, Excel o una imagen.");
  }

  const name = input.displayName?.trim() || displayNameFromFile(originalFileName);
  const recordId = input.recordId?.trim() ?? "";
  const documentId = newPrefixedId("doc");
  const versionId = newPrefixedId("ver");
  const storagePath = `companies/${companyId}/documents/${documentId}/v1/${sanitizeFileName(originalFileName)}`;
  const mimeType = file.type.trim() || "application/octet-stream";
  const storageRef = ref(getStorage(getFirebaseApp()), storagePath);
  let uploaded = false;
  let linkedDocumentIds: string[] | null = null;
  let assignPrimaryDocument = false;

  if (recordId) {
    const recordSnap = await getDoc(
      doc(getFirebaseFirestore(), "companies", companyId, "records", recordId),
    );

    if (!recordSnap.exists()) {
      throw new Error("No se encontró el expediente seleccionado.");
    }

    const existingIds = asStringList(recordSnap.get("documentIds"));
    linkedDocumentIds = existingIds.includes(documentId) ? existingIds : [...existingIds, documentId];
    assignPrimaryDocument = primaryDocumentMissing(recordSnap.get("primaryDocumentId"));
  }

  try {
    await uploadBytes(storageRef, file, { contentType: mimeType });
    uploaded = true;

    const database = getFirebaseFirestore();
    const documentRef = doc(database, "companies", companyId, "documents", documentId);
    const versionRef = doc(database, "companies", companyId, "documents", documentId, "versions", versionId);
    const batch = writeBatch(database);
    const now = serverTimestamp();

    batch.set(versionRef, {
      id: versionId,
      companyId,
      documentId,
      versionNumber: 1,
      storagePath,
      mimeType,
      size: file.size,
      checksum: "",
      changeNote: "Initial upload",
      isCurrent: true,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
      createdBy,
    });

    batch.set(documentRef, {
      id: documentId,
      companyId,
      name,
      originalFileName,
      fileFamily,
      mimeType,
      size: file.size,
      checksum: "",
      folderId: null,
      categoryId: null,
      tagIds: [],
      status: "ACTIVE",
      visibility: "ORG_STAFF",
      currentVersionId: versionId,
      currentVersionNumber: 1,
      storagePath,
      thumbnailPath: "",
      downloadUrl: "",
      source: "UPLOAD",
      generator: "",
      searchTokens: buildSearchTokens(name, originalFileName),
      notes: "",
      createdAt: now,
      updatedAt: now,
      createdBy,
      updatedBy: createdBy,
      archivedAt: null,
    });

    if (recordId && linkedDocumentIds) {
      const linkId = newPrefixedId("lnk");
      const recordUpdate: FirestoreData = {
        documentIds: linkedDocumentIds,
        updatedAt: now,
        updatedBy: createdBy,
      };

      if (assignPrimaryDocument) {
        recordUpdate.primaryDocumentId = documentId;
      }

      batch.set(doc(database, "companies", companyId, "document_links", linkId), {
        id: linkId,
        companyId,
        documentId,
        entityType: "RECORD",
        entityId: recordId,
        relation: "ATTACHMENT",
        createdAt: now,
        updatedAt: now,
        createdBy,
      });
      batch.update(doc(database, "companies", companyId, "records", recordId), recordUpdate);
    }

    await batch.commit();
  } catch (error) {
    if (uploaded) {
      await deleteObject(storageRef).catch(() => undefined);
    }

    throw error;
  }

  try {
    const saved = await getDoc(doc(getFirebaseFirestore(), "companies", companyId, "documents", documentId));
    const mapped = saved.exists() ? toDocument(saved.id, companyId, saved.data()) : null;

    if (mapped) {
      return mapped;
    }
  } catch {
    // The document is already stored. A follow-up read must not undo the upload.
  }

  const createdAt = new Date();

  return {
    id: documentId,
    companyId,
    name,
    originalFileName,
    fileFamily,
    mimeType,
    size: file.size,
    checksum: "",
    folderId: null,
    categoryId: null,
    tagIds: [],
    status: "ACTIVE",
    visibility: "ORG_STAFF",
    currentVersionId: versionId,
    currentVersionNumber: 1,
    storagePath,
    thumbnailPath: "",
    downloadUrl: "",
    source: "UPLOAD",
    generator: "",
    searchTokens: buildSearchTokens(name, originalFileName),
    notes: "",
    createdAt,
    updatedAt: createdAt,
    createdBy,
    updatedBy: createdBy,
    archivedAt: null,
  };
}

export async function resolveDocumentFileUrl(storagePath: string): Promise<string> {
  const path = storagePath.trim();

  if (!path) {
    throw new Error("Este documento no tiene un archivo asociado.");
  }

  return getDownloadURL(ref(getStorage(getFirebaseApp()), path));
}

export async function updateCompanyDocumentName(
  current: Document,
  name: string,
  updatedBy: string,
): Promise<Document> {
  const nextName = name.trim();
  const companyId = current.companyId.trim();
  const documentId = current.id.trim();
  const editor = updatedBy.trim();

  if (!companyId || !documentId) {
    throw new Error("No se pudo identificar el documento.");
  }

  if (!nextName) {
    throw new Error("Escribe el nombre del documento.");
  }

  if (!editor) {
    throw new Error("No hay una sesión activa.");
  }

  const database = getFirebaseFirestore();
  const documentRef = doc(database, "companies", companyId, "documents", documentId);
  const searchTokens = buildSearchTokens(nextName, current.originalFileName);

  await updateDoc(documentRef, {
    name: nextName,
    searchTokens,
    updatedAt: serverTimestamp(),
    updatedBy: editor,
  });

  const saved = await getDoc(documentRef);
  const mapped = saved.exists() ? toDocument(saved.id, companyId, saved.data()) : null;

  if (mapped) {
    return mapped;
  }

  return {
    ...current,
    name: nextName,
    searchTokens,
    updatedAt: new Date(),
    updatedBy: editor,
  };
}

export type DocumentWritePhase = "uploading" | "saving";

export async function replaceCompanyDocumentFile(input: {
  current: Document;
  file: File;
  name: string;
  updatedBy: string;
  onProgress?: (phase: DocumentWritePhase) => void;
}): Promise<Document> {
  const editor = input.updatedBy.trim();
  const nextName = input.name.trim();
  const file = input.file;
  const originalFileName = file.name.trim();

  if (!editor) {
    throw new Error("No hay una sesión activa.");
  }

  if (!nextName) {
    throw new Error("Escribe el nombre del documento.");
  }

  if (!originalFileName || file.size <= 0) {
    throw new Error("Selecciona un archivo.");
  }

  const fileFamily = detectFileFamily(file.type, originalFileName);

  if (fileFamily === "OTHER") {
    throw new Error("El archivo no es compatible. Usa PDF, Word, Excel o una imagen.");
  }

  const database = getFirebaseFirestore();
  const documentRef = doc(
    database,
    "companies",
    input.current.companyId,
    "documents",
    input.current.id,
  );
  const savedCurrent = await getDoc(documentRef);
  const fresh = savedCurrent.exists()
    ? toDocument(savedCurrent.id, input.current.companyId, savedCurrent.data())
    : null;

  if (!fresh) {
    throw new Error("No se encontró el documento.");
  }

  if (!Number.isInteger(fresh.currentVersionNumber) || fresh.currentVersionNumber < 1 || !fresh.currentVersionId) {
    throw new Error("Este documento no tiene una versión actual válida para reemplazar el archivo.");
  }

  const companyId = fresh.companyId.trim();
  const documentId = fresh.id.trim();
  const nextVersionNumber = fresh.currentVersionNumber + 1;
  const versionId = newPrefixedId("ver");
  const mimeType = file.type.trim() || "application/octet-stream";
  const storagePath = `companies/${companyId}/documents/${documentId}/v${nextVersionNumber}/${sanitizeFileName(originalFileName)}`;
  const storageRef = ref(getStorage(getFirebaseApp()), storagePath);
  let uploaded = false;

  try {
    input.onProgress?.("uploading");
    await uploadBytes(storageRef, file, { contentType: mimeType });
    uploaded = true;
    input.onProgress?.("saving");

    const previousRef = doc(
      database,
      "companies",
      companyId,
      "documents",
      documentId,
      "versions",
      fresh.currentVersionId,
    );
    const versionRef = doc(
      database,
      "companies",
      companyId,
      "documents",
      documentId,
      "versions",
      versionId,
    );
    const now = serverTimestamp();
    const searchTokens = buildSearchTokens(nextName, originalFileName);
    const batch = writeBatch(database);

    batch.update(previousRef, {
      isCurrent: false,
      status: "SUPERSEDED",
      updatedAt: now,
    });
    batch.set(versionRef, {
      id: versionId,
      companyId,
      documentId,
      versionNumber: nextVersionNumber,
      storagePath,
      mimeType,
      size: file.size,
      checksum: "",
      changeNote: "File replaced",
      isCurrent: true,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
      createdBy: editor,
    });
    batch.update(documentRef, {
      name: nextName,
      originalFileName,
      fileFamily,
      mimeType,
      size: file.size,
      storagePath,
      currentVersionId: versionId,
      currentVersionNumber: nextVersionNumber,
      searchTokens,
      updatedAt: now,
      updatedBy: editor,
    });

    await batch.commit();
  } catch (error) {
    if (uploaded) {
      try {
        await deleteObject(storageRef);
      } catch (cleanupError) {
        const saveMessage = error instanceof Error ? error.message : "No se pudo guardar la nueva versión.";
        const cleanupMessage =
          cleanupError instanceof Error ? cleanupError.message : "No se pudo retirar el archivo nuevo.";
        throw new Error(
          `${saveMessage} El archivo nuevo quedó en el almacenamiento y no se pudo retirar: ${cleanupMessage}`,
        );
      }
    }

    throw error;
  }

  const saved = await getDoc(documentRef);
  const mapped = saved.exists() ? toDocument(saved.id, companyId, saved.data()) : null;

  if (mapped) {
    return mapped;
  }

  const updatedAt = new Date();

  return {
    ...fresh,
    name: nextName,
    originalFileName,
    fileFamily,
    mimeType,
    size: file.size,
    storagePath,
    currentVersionId: versionId,
    currentVersionNumber: nextVersionNumber,
    searchTokens: buildSearchTokens(nextName, originalFileName),
    updatedAt,
    updatedBy: editor,
  };
}

export async function getCompanyDocument(companyId: string, documentId: string): Promise<Document | null> {
  const tenantId = companyId.trim();
  const id = documentId.trim();

  if (!tenantId || !id) {
    return null;
  }

  const snapshot = await getDoc(doc(getFirebaseFirestore(), "companies", tenantId, "documents", id));

  if (!snapshot.exists()) {
    return null;
  }

  const document = toDocument(snapshot.id, tenantId, snapshot.data());

  if (!document) {
    return null;
  }

  if (document.companyId !== tenantId) {
    throw new Error("Este documento no pertenece a la empresa activa.");
  }

  return document;
}

export async function listCompanyDocuments(companyId: string): Promise<Document[]> {
  const snapshot = await getDocs(
    collection(getFirebaseFirestore(), "companies", companyId, "documents"),
  );

  return sortDocumentsByUpdated(
    snapshot.docs
      .map((item) => toDocument(item.id, companyId, item.data()))
      .filter((item): item is Document => item !== null && item.status === "ACTIVE"),
  );
}
