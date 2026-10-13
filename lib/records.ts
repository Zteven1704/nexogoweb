import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase";

export type RecordType =
  | "CLINICAL_HISTORY"
  | "CONTRACT"
  | "INVOICE"
  | "REPORT"
  | "TECHNICAL_DOC"
  | "ATTACHMENT_PACK"
  | "NOTE"
  | "CUSTOM";

export type RecordStatus = "DRAFT" | "FINAL" | "ARCHIVED";

export type RecordConfidentiality = "STANDARD" | "SENSITIVE" | "LEGAL_HOLD";

export type RecordParty = {
  role: string;
  name: string;
  contactId: string | null;
  clientId: string | null;
};

export type RecordSection = {
  id: string;
  key: string;
  title: string;
  body: string;
  data: { [key: string]: unknown };
};

/** Platform record stored at companies/{companyId}/records/{recordId}. */
export type Record = {
  id: string;
  companyId: string;
  clientId: string;
  appointmentId: string | null;
  saleId: string | null;
  title: string;
  recordType: RecordType;
  category: string;
  status: RecordStatus;
  summary: string;
  serviceDate: Date | null;
  validFrom: Date | null;
  validTo: Date | null;
  currency: string;
  amount: number | null;
  parties: RecordParty[];
  sections: RecordSection[];
  industryPayload: { [key: string]: unknown };
  documentIds: string[];
  primaryDocumentId: string | null;
  tags: string[];
  confidentiality: RecordConfidentiality;
  authoredBy: string;
  finalizedBy: string | null;
  finalizedAt: Date | null;
  templateId: string | null;
  templateVersion: string | null;
  searchTokens: string[];
  legacySource: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  createdBy: string;
  updatedBy: string;
  archivedAt: Date | null;
};

type FirestoreData = { [key: string]: unknown };

const recordTypes: readonly RecordType[] = [
  "CLINICAL_HISTORY",
  "CONTRACT",
  "INVOICE",
  "REPORT",
  "TECHNICAL_DOC",
  "ATTACHMENT_PACK",
  "NOTE",
  "CUSTOM",
];

const recordStatuses: readonly RecordStatus[] = ["DRAFT", "FINAL", "ARCHIVED"];

const confidentialities: readonly RecordConfidentiality[] = ["STANDARD", "SENSITIVE", "LEGAL_HOLD"];

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

function asRecordType(value: unknown): RecordType {
  return recordTypes.includes(value as RecordType) ? (value as RecordType) : "CUSTOM";
}

function asRecordStatus(value: unknown): RecordStatus {
  return recordStatuses.includes(value as RecordStatus) ? (value as RecordStatus) : "DRAFT";
}

function asConfidentiality(value: unknown): RecordConfidentiality {
  return confidentialities.includes(value as RecordConfidentiality)
    ? (value as RecordConfidentiality)
    : "STANDARD";
}

function asAmount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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

function asMap(value: unknown): { [key: string]: unknown } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return value as { [key: string]: unknown };
}

function asParty(value: unknown): RecordParty | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const party = value as FirestoreData;

  return {
    role: asString(party.role),
    name: asString(party.name),
    contactId: asNullableString(party.contactId),
    clientId: asNullableString(party.clientId),
  };
}

function asSection(value: unknown): RecordSection | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const section = value as FirestoreData;

  return {
    id: asString(section.id),
    key: asString(section.key),
    title: asString(section.title),
    body: asString(section.body),
    data: asMap(section.data),
  };
}

function toRecord(id: string, companyId: string, data: FirestoreData): Record {
  return {
    id,
    companyId: asString(data.companyId) || companyId,
    clientId: asString(data.clientId),
    appointmentId: asNullableString(data.appointmentId),
    saleId: asNullableString(data.saleId),
    title: asString(data.title),
    recordType: asRecordType(data.recordType),
    category: asString(data.category),
    status: asRecordStatus(data.status),
    summary: asString(data.summary),
    serviceDate: asDate(data.serviceDate),
    validFrom: asDate(data.validFrom),
    validTo: asDate(data.validTo),
    currency: asString(data.currency),
    amount: asAmount(data.amount),
    parties: Array.isArray(data.parties)
      ? data.parties.map(asParty).filter((item): item is RecordParty => item !== null)
      : [],
    sections: Array.isArray(data.sections)
      ? data.sections.map(asSection).filter((item): item is RecordSection => item !== null)
      : [],
    industryPayload: asMap(data.industryPayload),
    documentIds: asStringList(data.documentIds),
    primaryDocumentId: asNullableString(data.primaryDocumentId),
    tags: asStringList(data.tags),
    confidentiality: asConfidentiality(data.confidentiality),
    authoredBy: asString(data.authoredBy),
    finalizedBy: asNullableString(data.finalizedBy),
    finalizedAt: asDate(data.finalizedAt),
    templateId: asNullableString(data.templateId),
    templateVersion: asNullableString(data.templateVersion),
    searchTokens: asStringList(data.searchTokens),
    legacySource: asNullableString(data.legacySource),
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
    createdBy: asString(data.createdBy),
    updatedBy: asString(data.updatedBy),
    archivedAt: asDate(data.archivedAt),
  };
}

export function sortRecordsByUpdated(records: Record[]): Record[] {
  return [...records].sort((left, right) => {
    const leftTime = left.updatedAt?.getTime() ?? 0;
    const rightTime = right.updatedAt?.getTime() ?? 0;

    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return left.title.localeCompare(right.title, "es", { sensitivity: "base" });
  });
}

export async function listCompanyRecords(companyId: string): Promise<Record[]> {
  const snapshot = await getDocs(
    collection(getFirebaseFirestore(), "companies", companyId, "records"),
  );

  return sortRecordsByUpdated(
    snapshot.docs
      .map((item) => toRecord(item.id, companyId, item.data()))
      .filter((item) => item.status !== "ARCHIVED"),
  );
}

export type CreateRecordInput = {
  companyId: string;
  clientId: string;
  title: string;
  recordType: RecordType;
  summary: string;
  createdBy: string;
};

export class DuplicateRecordError extends Error {
  constructor() {
    super("Ese expediente ya está registrado.");
    this.name = "DuplicateRecordError";
  }
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase("es");
}

function sameRecordIdentity(
  record: Pick<Record, "title" | "clientId" | "recordType" | "status">,
  input: CreateRecordInput,
): boolean {
  return (
    record.status !== "ARCHIVED" &&
    record.clientId === input.clientId &&
    record.recordType === input.recordType &&
    normalizeText(record.title) === normalizeText(input.title)
  );
}

function buildSearchTokens(title: string, summary: string): string[] {
  return [
    ...new Set(
      [title, summary]
        .map((item) => item.trim().toLocaleLowerCase("es"))
        .filter(Boolean),
    ),
  ];
}

export async function createCompanyRecord(
  input: CreateRecordInput,
  knownRecords: Record[] = [],
): Promise<Record> {
  const companyId = input.companyId.trim();
  const clientId = input.clientId.trim();
  const title = input.title.trim();
  const summary = input.summary.trim();
  const createdBy = input.createdBy.trim();

  if (!companyId) {
    throw new Error("No hay una empresa activa para registrar el expediente.");
  }

  if (!clientId) {
    throw new Error("Selecciona un cliente.");
  }

  if (!title) {
    throw new Error("Escribe el título del expediente.");
  }

  const draft: CreateRecordInput = {
    ...input,
    companyId,
    clientId,
    title,
    summary,
    createdBy,
  };

  if (knownRecords.some((record) => sameRecordIdentity(record, draft))) {
    throw new DuplicateRecordError();
  }

  const database = getFirebaseFirestore();
  const records = collection(database, "companies", companyId, "records");
  const existing = await getDocs(query(records, where("title", "==", title)));

  if (existing.docs.some((item) => sameRecordIdentity(toRecord(item.id, companyId, item.data()), draft))) {
    throw new DuplicateRecordError();
  }

  const reference = doc(records);
  const now = Timestamp.now();
  const searchTokens = buildSearchTokens(title, summary);

  await setDoc(reference, {
    id: reference.id,
    companyId,
    clientId,
    appointmentId: null,
    saleId: null,
    title,
    recordType: input.recordType,
    category: "",
    status: "DRAFT",
    summary,
    serviceDate: now,
    validFrom: null,
    validTo: null,
    currency: "",
    amount: null,
    parties: [],
    sections: [],
    industryPayload: {},
    documentIds: [],
    primaryDocumentId: null,
    tags: [],
    confidentiality: "STANDARD",
    authoredBy: createdBy,
    finalizedBy: null,
    finalizedAt: null,
    templateId: null,
    templateVersion: null,
    searchTokens,
    legacySource: null,
    createdAt: now,
    updatedAt: now,
    createdBy,
    updatedBy: createdBy,
    archivedAt: null,
  });

  return {
    id: reference.id,
    companyId,
    clientId,
    appointmentId: null,
    saleId: null,
    title,
    recordType: input.recordType,
    category: "",
    status: "DRAFT",
    summary,
    serviceDate: now.toDate(),
    validFrom: null,
    validTo: null,
    currency: "",
    amount: null,
    parties: [],
    sections: [],
    industryPayload: {},
    documentIds: [],
    primaryDocumentId: null,
    tags: [],
    confidentiality: "STANDARD",
    authoredBy: createdBy,
    finalizedBy: null,
    finalizedAt: null,
    templateId: null,
    templateVersion: null,
    searchTokens,
    legacySource: null,
    createdAt: now.toDate(),
    updatedAt: now.toDate(),
    createdBy,
    updatedBy: createdBy,
    archivedAt: null,
  };
}

export async function getCompanyRecord(companyId: string, recordId: string): Promise<Record | null> {
  const tenantId = companyId.trim();
  const id = recordId.trim();

  if (!tenantId || !id) {
    return null;
  }

  const snapshot = await getDoc(doc(getFirebaseFirestore(), "companies", tenantId, "records", id));

  if (!snapshot.exists()) {
    return null;
  }

  const record = toRecord(snapshot.id, tenantId, snapshot.data());

  if (record.companyId !== tenantId) {
    throw new Error("Este expediente no pertenece a la empresa activa.");
  }

  return record;
}

export type UpdateRecordInput = {
  companyId: string;
  recordId: string;
  title: string;
  recordType: RecordType;
  summary: string;
  updatedBy: string;
};

export async function updateCompanyRecord(
  input: UpdateRecordInput,
  knownRecords: Record[] = [],
): Promise<Record> {
  const companyId = input.companyId.trim();
  const recordId = input.recordId.trim();
  const title = input.title.trim();
  const summary = input.summary.trim();
  const updatedBy = input.updatedBy.trim();

  if (!companyId || !recordId) {
    throw new Error("No se pudo identificar el expediente.");
  }

  if (!title) {
    throw new Error("Escribe el título del expediente.");
  }

  if (!recordTypes.includes(input.recordType)) {
    throw new Error("Selecciona un tipo de expediente.");
  }

  if (!updatedBy) {
    throw new Error("No hay una sesión activa.");
  }

  const current = await getCompanyRecord(companyId, recordId);

  if (!current) {
    throw new Error("No se encontró el expediente.");
  }

  if (current.status === "ARCHIVED") {
    throw new Error("No se puede editar un expediente archivado.");
  }

  const draft: CreateRecordInput = {
    companyId,
    clientId: current.clientId,
    title,
    recordType: input.recordType,
    summary,
    createdBy: updatedBy,
  };

  if (knownRecords.some((record) => record.id !== recordId && sameRecordIdentity(record, draft))) {
    throw new DuplicateRecordError();
  }

  const database = getFirebaseFirestore();
  const records = collection(database, "companies", companyId, "records");
  const existing = await getDocs(query(records, where("title", "==", title)));

  if (
    existing.docs.some((item) => {
      if (item.id === recordId) {
        return false;
      }

      return sameRecordIdentity(toRecord(item.id, companyId, item.data()), draft);
    })
  ) {
    throw new DuplicateRecordError();
  }

  const reference = doc(records, recordId);
  const now = Timestamp.now();
  const searchTokens = [
    ...new Set(
      [
        ...buildSearchTokens(title, summary),
        ...current.tags,
        current.category,
      ]
        .map((item) => item.trim().toLocaleLowerCase("es"))
        .filter(Boolean),
    ),
  ];

  await updateDoc(reference, {
    title,
    recordType: input.recordType,
    summary,
    searchTokens,
    updatedAt: now,
    updatedBy,
  });

  return {
    ...current,
    title,
    recordType: input.recordType,
    summary,
    searchTokens,
    updatedAt: now.toDate(),
    updatedBy,
  };
}
