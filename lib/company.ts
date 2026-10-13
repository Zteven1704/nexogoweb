import { doc, getDoc, getDocs, collection } from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase";

export type UserCompanyRef = {
  companyId: string;
  companyName: string;
  status: string;
  roleCodes: string[];
  isDefault: boolean;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function toCompanyRef(id: string, data: Record<string, unknown>): UserCompanyRef {
  return {
    companyId: asString(data.companyId) || id,
    companyName: asString(data.companyName),
    status: asString(data.status),
    roleCodes: asStringList(data.roleCodes),
    isDefault: data.isDefault === true,
  };
}

async function membershipIsActive(companyId: string, userId: string): Promise<boolean> {
  const snapshot = await getDoc(
    doc(getFirebaseFirestore(), "companies", companyId, "memberships", userId),
  );

  if (!snapshot.exists()) {
    return false;
  }

  return snapshot.get("status") === "ACTIVE";
}

/**
 * Active company for the signed-in user.
 * Prefers users/{userId}/company_memberships with isDefault, then confirms
 * companies/{companyId}/memberships/{userId} is ACTIVE.
 * Does not create a company.
 */
export async function resolveActiveCompanyId(userId: string): Promise<string | null> {
  const snapshot = await getDocs(
    collection(getFirebaseFirestore(), "users", userId, "company_memberships"),
  );

  const refs = snapshot.docs
    .map((item) => toCompanyRef(item.id, item.data()))
    .filter((item) => item.companyId.length > 0)
    .sort((left, right) => Number(right.isDefault) - Number(left.isDefault));

  for (const item of refs) {
    if (item.status && item.status !== "ACTIVE") {
      continue;
    }

    if (await membershipIsActive(item.companyId, userId)) {
      return item.companyId;
    }
  }

  return null;
}

export type ActiveCompanyName =
  | { status: "no-company" }
  | { status: "missing" }
  | { status: "ready"; name: string };

/**
 * Name shown for the company already selected by resolveActiveCompanyId.
 * Reads companies/{companyId}.name, the same field Configuración displays.
 */
export async function readActiveCompanyName(userId: string): Promise<ActiveCompanyName> {
  const companyId = await resolveActiveCompanyId(userId);
  if (!companyId) {
    return { status: "no-company" };
  }

  const snapshot = await getDoc(doc(getFirebaseFirestore(), "companies", companyId));
  if (!snapshot.exists()) {
    return { status: "missing" };
  }

  const name = asString(snapshot.get("name")).trim();
  if (!name) {
    return { status: "missing" };
  }

  return { status: "ready", name };
}
