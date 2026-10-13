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

export type ClientType = "PERSON" | "ORG" | "PET" | "ASSET" | "CUSTOM";

export type ClientStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export type ClientAddress = {
  label: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  country: string;
  postalCode: string;
  isPrimary: boolean;
};

export type ClientMedia = {
  avatarUrl: string;
  avatarDocumentId: string;
};

export type Client = {
  id: string;
  companyId: string;
  displayName: string;
  clientType: ClientType;
  status: ClientStatus;
  primaryContactId: string | null;
  emails: string[];
  phones: string[];
  addresses: ClientAddress[];
  taxId: string;
  tags: string[];
  media: ClientMedia;
  profile: Record<string, unknown>;
  searchTokens: string[];
  linkedUserId: string | null;
  notes: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  createdBy: string;
  updatedBy: string;
  archivedAt: Date | null;
};

const clientTypes: readonly ClientType[] = ["PERSON", "ORG", "PET", "ASSET", "CUSTOM"];
const clientStatuses: readonly ClientStatus[] = ["ACTIVE", "INACTIVE", "ARCHIVED"];

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

function asClientType(value: unknown): ClientType {
  return clientTypes.includes(value as ClientType) ? (value as ClientType) : "CUSTOM";
}

function asClientStatus(value: unknown): ClientStatus {
  return clientStatuses.includes(value as ClientStatus) ? (value as ClientStatus) : "ACTIVE";
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

function asAddress(value: unknown): ClientAddress | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const address = value as Record<string, unknown>;

  return {
    label: asString(address.label),
    line1: asString(address.line1),
    line2: asString(address.line2),
    city: asString(address.city),
    region: asString(address.region),
    country: asString(address.country),
    postalCode: asString(address.postalCode),
    isPrimary: address.isPrimary === true,
  };
}

function asMedia(value: unknown): ClientMedia {
  if (typeof value !== "object" || value === null) {
    return { avatarUrl: "", avatarDocumentId: "" };
  }

  const media = value as Record<string, unknown>;

  return {
    avatarUrl: asString(media.avatarUrl),
    avatarDocumentId: asString(media.avatarDocumentId),
  };
}

function asProfile(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function toClient(id: string, companyId: string, data: Record<string, unknown>): Client {
  return {
    id,
    companyId: asString(data.companyId) || companyId,
    displayName: asString(data.displayName),
    clientType: asClientType(data.clientType),
    status: asClientStatus(data.status),
    primaryContactId: asNullableString(data.primaryContactId),
    emails: asStringList(data.emails),
    phones: asStringList(data.phones),
    addresses: Array.isArray(data.addresses)
      ? data.addresses.map(asAddress).filter((item): item is ClientAddress => item !== null)
      : [],
    taxId: asString(data.taxId),
    tags: asStringList(data.tags),
    media: asMedia(data.media),
    profile: asProfile(data.profile),
    searchTokens: asStringList(data.searchTokens),
    linkedUserId: asNullableString(data.linkedUserId),
    notes: asString(data.notes),
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
    createdBy: asString(data.createdBy),
    updatedBy: asString(data.updatedBy),
    archivedAt: asDate(data.archivedAt),
  };
}

export function sortClientsByName(clients: Client[]): Client[] {
  return [...clients].sort((left, right) =>
    left.displayName.localeCompare(right.displayName, "es", { sensitivity: "base" }),
  );
}

export async function listCompanyClients(companyId: string): Promise<Client[]> {
  const snapshot = await getDocs(
    collection(getFirebaseFirestore(), "companies", companyId, "clients"),
  );

  return sortClientsByName(
    snapshot.docs
      .map((item) => toClient(item.id, companyId, item.data()))
      .filter((client) => client.status !== "ARCHIVED"),
  );
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseClientContact(
  value: string,
): { emails: string[]; phones: string[] } | { error: string } {
  const contact = value.trim();

  if (!contact) {
    return { emails: [], phones: [] };
  }

  if (contact.includes("@")) {
    if (!emailPattern.test(contact)) {
      return { error: "Escribe un correo válido." };
    }

    return { emails: [contact], phones: [] };
  }

  const digits = contact.replace(/\D/g, "");

  if (/^[\d\s()+.-]+$/.test(contact) && digits.length >= 7 && digits.length <= 15) {
    return { emails: [], phones: [contact] };
  }

  return { error: "El contacto debe ser un correo o un teléfono." };
}

export type CreateClientInput = {
  companyId: string;
  displayName: string;
  clientType: "PERSON" | "ORG";
  emails: string[];
  phones: string[];
  createdBy: string;
};

export class DuplicateClientError extends Error {
  constructor() {
    super("Ese cliente ya está registrado.");
    this.name = "DuplicateClientError";
  }
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase("es");
}

function sameClientIdentity(
  client: Pick<Client, "displayName" | "clientType" | "emails" | "phones" | "status">,
  input: { displayName: string; clientType: ClientType; emails: string[]; phones: string[] },
): boolean {
  if (client.status === "ARCHIVED" || client.clientType !== input.clientType) {
    return false;
  }

  if (normalizeName(client.displayName) !== normalizeName(input.displayName)) {
    return false;
  }

  const email = input.emails[0]?.trim().toLocaleLowerCase("es") ?? "";
  const phone = (input.phones[0] ?? "").replace(/\D/g, "");
  const emailMatch =
    email.length > 0 && client.emails.some((item) => item.trim().toLocaleLowerCase("es") === email);
  const phoneMatch =
    phone.length > 0 && client.phones.some((item) => item.replace(/\D/g, "") === phone);

  if (!email && !phone) {
    return client.emails.length === 0 && client.phones.length === 0;
  }

  if (email && phone) {
    return emailMatch && phoneMatch;
  }

  return email ? emailMatch : phoneMatch;
}

function buildSearchTokens(displayName: string, emails: string[], phones: string[]): string[] {
  return [
    ...new Set(
      [displayName, ...emails, ...phones]
        .map((item) => item.trim().toLocaleLowerCase("es"))
        .filter(Boolean),
    ),
  ];
}

export async function createCompanyClient(
  input: CreateClientInput,
  knownClients: Client[] = [],
): Promise<Client> {
  const displayName = input.displayName.trim();
  const companyId = input.companyId.trim();

  if (!companyId) {
    throw new Error("No hay una empresa activa para registrar el cliente.");
  }

  if (!displayName) {
    throw new Error("Escribe el nombre del cliente.");
  }

  const draft: CreateClientInput = { ...input, companyId, displayName };

  if (knownClients.some((client) => sameClientIdentity(client, draft))) {
    throw new DuplicateClientError();
  }

  const database = getFirebaseFirestore();
  const clients = collection(database, "companies", companyId, "clients");
  const existing = await getDocs(query(clients, where("displayName", "==", displayName)));

  if (existing.docs.some((item) => sameClientIdentity(toClient(item.id, companyId, item.data()), draft))) {
    throw new DuplicateClientError();
  }

  const reference = doc(clients);
  const now = Timestamp.now();
  const emails = input.emails.map((item) => item.trim()).filter(Boolean);
  const phones = input.phones.map((item) => item.trim()).filter(Boolean);
  const createdBy = input.createdBy.trim();

  await setDoc(reference, {
    id: reference.id,
    companyId,
    displayName,
    clientType: input.clientType,
    status: "ACTIVE",
    primaryContactId: null,
    emails,
    phones,
    addresses: [],
    taxId: "",
    tags: [],
    media: { avatarUrl: "", avatarDocumentId: "" },
    profile: {},
    searchTokens: buildSearchTokens(displayName, emails, phones),
    linkedUserId: null,
    notes: "",
    createdAt: now,
    updatedAt: now,
    createdBy,
    updatedBy: createdBy,
    archivedAt: null,
  });

  return {
    id: reference.id,
    companyId,
    displayName,
    clientType: input.clientType,
    status: "ACTIVE",
    primaryContactId: null,
    emails,
    phones,
    addresses: [],
    taxId: "",
    tags: [],
    media: { avatarUrl: "", avatarDocumentId: "" },
    profile: {},
    searchTokens: buildSearchTokens(displayName, emails, phones),
    linkedUserId: null,
    notes: "",
    createdAt: now.toDate(),
    updatedAt: now.toDate(),
    createdBy,
    updatedBy: createdBy,
    archivedAt: null,
  };
}

export async function getCompanyClient(companyId: string, clientId: string): Promise<Client | null> {
  const id = clientId.trim();
  const tenantId = companyId.trim();

  if (!tenantId || !id) {
    return null;
  }

  const snapshot = await getDoc(doc(getFirebaseFirestore(), "companies", tenantId, "clients", id));

  if (!snapshot.exists()) {
    return null;
  }

  return toClient(snapshot.id, tenantId, snapshot.data());
}

export type UpdateClientInput = {
  companyId: string;
  clientId: string;
  displayName: string;
  clientType: ClientType;
  emails: string[];
  phones: string[];
  updatedBy: string;
};

export async function updateCompanyClient(
  input: UpdateClientInput,
  knownClients: Client[] = [],
): Promise<Client> {
  const companyId = input.companyId.trim();
  const clientId = input.clientId.trim();
  const displayName = input.displayName.trim();
  const updatedBy = input.updatedBy.trim();

  if (!companyId || !clientId) {
    throw new Error("No se pudo identificar el cliente.");
  }

  if (!displayName) {
    throw new Error("Escribe el nombre del cliente.");
  }

  if (!clientTypes.includes(input.clientType)) {
    throw new Error("Selecciona un tipo de cliente.");
  }

  if (!updatedBy) {
    throw new Error("No hay una sesión activa.");
  }

  const current = await getCompanyClient(companyId, clientId);

  if (!current) {
    throw new Error("No se encontró el cliente.");
  }

  const emails = input.emails.map((item) => item.trim()).filter(Boolean);
  const phones = input.phones.map((item) => item.trim()).filter(Boolean);
  const contacts = applyContactEdit(current, { emails, phones });
  const identity = {
    displayName,
    clientType: input.clientType,
    emails: contacts.emails,
    phones: contacts.phones,
  };

  if (knownClients.some((client) => client.id !== clientId && sameClientIdentity(client, identity))) {
    throw new DuplicateClientError();
  }

  const database = getFirebaseFirestore();
  const clients = collection(database, "companies", companyId, "clients");
  const existing = await getDocs(query(clients, where("displayName", "==", displayName)));

  if (
    existing.docs.some((item) => {
      if (item.id === clientId) {
        return false;
      }

      return sameClientIdentity(toClient(item.id, companyId, item.data()), identity);
    })
  ) {
    throw new DuplicateClientError();
  }

  const reference = doc(clients, clientId);
  const now = Timestamp.now();
  const searchTokens = [
    ...new Set(
      [...buildSearchTokens(displayName, contacts.emails, contacts.phones), current.taxId.trim().toLocaleLowerCase("es")].filter(
        Boolean,
      ),
    ),
  ];

  await updateDoc(reference, {
    displayName,
    clientType: input.clientType,
    emails: contacts.emails,
    phones: contacts.phones,
    searchTokens,
    updatedAt: now,
    updatedBy,
  });

  return {
    ...current,
    displayName,
    clientType: input.clientType,
    emails: contacts.emails,
    phones: contacts.phones,
    searchTokens,
    updatedAt: now.toDate(),
    updatedBy,
  };
}

function applyContactEdit(
  current: Pick<Client, "emails" | "phones">,
  parsed: { emails: string[]; phones: string[] },
): { emails: string[]; phones: string[] } {
  const displayedIsEmail = current.emails.length > 0;

  if (parsed.emails.length === 0 && parsed.phones.length === 0) {
    return displayedIsEmail
      ? { emails: current.emails.slice(1), phones: current.phones }
      : { emails: current.emails, phones: current.phones.slice(1) };
  }

  if (parsed.emails[0]) {
    return {
      emails: displayedIsEmail ? [parsed.emails[0], ...current.emails.slice(1)] : [parsed.emails[0], ...current.emails],
      phones: displayedIsEmail ? current.phones : current.phones.slice(1),
    };
  }

  return {
    emails: displayedIsEmail ? current.emails.slice(1) : current.emails,
    phones: displayedIsEmail ? [parsed.phones[0], ...current.phones] : [parsed.phones[0], ...current.phones.slice(1)],
  };
}
