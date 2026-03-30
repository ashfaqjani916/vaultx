import type { UserRole } from "@/types";

export type SsiUser = {
  did: string;
  signingPublicKey: string;
  encryptionPublicKey: string;
  wallet: string;
  role: number;
  active: boolean;
  createdAt: bigint;
  updatedAt: bigint;
  revokedAt: bigint;
  createdByDid: string;
  revokedByDid: string;
};

export type SsiClaim = {
  claimId: string;
  claimType: string;
  description: string;
  documentRequired: boolean;
  photoRequired: boolean;
  geolocationRequired: boolean;
  biometricRequired: boolean;
  numberOfApprovalsNeeded: bigint;
  status: number;
  createdAt: bigint;
  approvedAt: bigint;
  createdByDid: string;
  approvedByDid: string;
};

export type OnchainUserRole = UserRole;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const pick = <T>(value: unknown, key: string, index: number, fallback: T): T => {
  const record = asRecord(value);
  const direct = record[key] ?? record[index];
  return (direct as T) ?? fallback;
};

const asBigInt = (value: unknown): bigint => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string" && value.length > 0) {
    try {
      return BigInt(value);
    } catch {
      return 0n;
    }
  }
  return 0n;
};

export const isEmptyDid = (did: string | null | undefined) =>
  !did || did.trim().length === 0;

export function parseSsiUser(raw: unknown): SsiUser {
  return {
    did: String(pick(raw, "did", 0, "")),
    signingPublicKey: String(pick(raw, "signingPublicKey", 1, "")),
    encryptionPublicKey: String(pick(raw, "encryptionPublicKey", 2, "")),
    wallet: String(pick(raw, "wallet", 3, "")),
    role: Number(pick(raw, "role", 4, 0)),
    active: Boolean(pick(raw, "active", 5, false)),
    createdAt: asBigInt(pick(raw, "createdAt", 6, 0n)),
    updatedAt: asBigInt(pick(raw, "updatedAt", 7, 0n)),
    revokedAt: asBigInt(pick(raw, "revokedAt", 8, 0n)),
    createdByDid: String(pick(raw, "createdByDid", 9, "")),
    revokedByDid: String(pick(raw, "revokedByDid", 10, "")),
  };
}

export function parseSsiClaim(raw: unknown): SsiClaim {
  return {
    claimId: String(pick(raw, "claimId", 0, "")),
    claimType: String(pick(raw, "claimType", 1, "")),
    description: String(pick(raw, "description", 2, "")),
    documentRequired: Boolean(pick(raw, "documentRequired", 3, false)),
    photoRequired: Boolean(pick(raw, "photoRequired", 4, false)),
    geolocationRequired: Boolean(pick(raw, "geolocationRequired", 5, false)),
    biometricRequired: Boolean(pick(raw, "biometricRequired", 6, false)),
    numberOfApprovalsNeeded: asBigInt(pick(raw, "numberOfApprovalsNeeded", 7, 0n)),
    status: Number(pick(raw, "status", 8, 0)),
    createdAt: asBigInt(pick(raw, "createdAt", 9, 0n)),
    approvedAt: asBigInt(pick(raw, "approvedAt", 10, 0n)),
    createdByDid: String(pick(raw, "createdByDid", 11, "")),
    approvedByDid: String(pick(raw, "approvedByDid", 12, "")),
  };
}

export function claimStatusLabel(status: number): "active" | "pending" | "rejected" | "deprecated" {
  if (status === 1) return "active";
  if (status === 2) return "rejected";
  if (status === 3) return "deprecated";
  return "pending";
}

export function roleIndexToUserRole(role: number): OnchainUserRole {
  if (role === 1) return "approver";
  if (role === 2) return "verifier";
  if (role === 3) return "governance";
  return "citizen";
}

export function userRoleToRoleIndex(role: OnchainUserRole): number {
  if (role === "approver") return 1;
  if (role === "verifier") return 2;
  if (role === "governance") return 3;
  return 0;
}

export function userRoleLabel(role: OnchainUserRole | null): string {
  if (role === "approver") return "Approver";
  if (role === "verifier") return "Verifier";
  if (role === "governance") return "Governance";
  if (role === "citizen") return "Citizen";
  return "Unregistered";
}
