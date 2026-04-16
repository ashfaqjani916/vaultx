import type { UserRole } from "@/types";

export type SsiUser = {
  did: string;
  signingPublicKey: string;
  encryptionPublicKey: string;
  wallet: string;
  role: number;
  active: boolean;
  isApproved: boolean;
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
    isApproved: Boolean(pick(raw, "isApproved", 6, false)),
    createdAt: asBigInt(pick(raw, "createdAt", 7, 0n)),
    updatedAt: asBigInt(pick(raw, "updatedAt", 8, 0n)),
    revokedAt: asBigInt(pick(raw, "revokedAt", 9, 0n)),
    createdByDid: String(pick(raw, "createdByDid", 10, "")),
    revokedByDid: String(pick(raw, "revokedByDid", 11, "")),
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

// ─── ClaimRequest ────────────────────────────────────────────────────────────

export type SsiClaimRequest = {
  requestId: string;
  claimId: string;
  citizenDid: string;
  documentHash: string;
  photoHash: string;
  geolocationHash: string;
  biometricHash: string;
  /** 0=PENDING 1=IN_REVIEW 2=APPROVED 3=ISSUED 4=REJECTED 5=EXPIRED */
  status: number;
  approverDids: string[];
  finalApproverDid: string;
  createdAt: bigint;
  updatedAt: bigint;
  expiresAt: bigint;
};

const asStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return (value as unknown[]).map(String);
  return [];
};

export function parseSsiClaimRequest(raw: unknown): SsiClaimRequest {
  return {
    requestId: String(pick(raw, "requestId", 0, "")),
    claimId: String(pick(raw, "claimId", 1, "")),
    citizenDid: String(pick(raw, "citizenDid", 2, "")),
    documentHash: String(pick(raw, "documentHash", 3, "")),
    photoHash: String(pick(raw, "photoHash", 4, "")),
    geolocationHash: String(pick(raw, "geolocationHash", 5, "")),
    biometricHash: String(pick(raw, "biometricHash", 6, "")),
    status: Number(pick(raw, "status", 7, 0)),
    approverDids: asStringArray(pick(raw, "approverDids", 8, [])),
    finalApproverDid: String(pick(raw, "finalApproverDid", 9, "")),
    createdAt: asBigInt(pick(raw, "createdAt", 10, 0n)),
    updatedAt: asBigInt(pick(raw, "updatedAt", 11, 0n)),
    expiresAt: asBigInt(pick(raw, "expiresAt", 12, 0n)),
  };
}

export function claimRequestStatusLabel(
  status: number
): "pending" | "in_review" | "approved" | "issued" | "rejected" | "expired" {
  if (status === 1) return "in_review";
  if (status === 2) return "approved";
  if (status === 3) return "issued";
  if (status === 4) return "rejected";
  if (status === 5) return "expired";
  return "pending";
}

// ─── Credential ──────────────────────────────────────────────────────────────

export type SsiCredential = {
  credentialId: string;
  claimId: string;
  requestId: string;
  citizenDid: string;
  credentialHash: string;
  /** 0=ACTIVE 1=REVOKED 2=EXPIRED */
  status: number;
  issuedAt: bigint;
  expiresAt: bigint;
  revokedAt: bigint;
  signatures: string[];
};

export function parseSsiCredential(raw: unknown): SsiCredential {
  return {
    credentialId: String(pick(raw, "credentialId", 0, "")),
    claimId: String(pick(raw, "claimId", 1, "")),
    requestId: String(pick(raw, "requestId", 2, "")),
    citizenDid: String(pick(raw, "citizenDid", 3, "")),
    credentialHash: String(pick(raw, "credentialHash", 4, "")),
    status: Number(pick(raw, "status", 5, 0)),
    issuedAt: asBigInt(pick(raw, "issuedAt", 6, 0n)),
    expiresAt: asBigInt(pick(raw, "expiresAt", 7, 0n)),
    revokedAt: asBigInt(pick(raw, "revokedAt", 8, 0n)),
    signatures: asStringArray(pick(raw, "signatures", 9, [])),
  };
}

export function credentialStatusLabel(status: number): "active" | "revoked" | "expired" {
  if (status === 1) return "revoked";
  if (status === 2) return "expired";
  return "active";
}

// ─── VerificationRequest ─────────────────────────────────────────────────────

export type SsiVerificationRequest = {
  verificationRequestId: string;
  verifierDid: string;
  citizenDid: string;
  requestedClaims: string[];
  nonce: string;
  /** 0=REQUESTED 1=APPROVED 2=REJECTED */
  status: number;
  createdAt: bigint;
  expiresAt: bigint;
  presentationId: string;
  fulfilled: boolean;
};

export function parseSsiVerificationRequest(raw: unknown): SsiVerificationRequest {
  return {
    verificationRequestId: String(pick(raw, "verificationRequestId", 0, "")),
    verifierDid: String(pick(raw, "verifierDid", 1, "")),
    citizenDid: String(pick(raw, "citizenDid", 2, "")),
    requestedClaims: asStringArray(pick(raw, "requestedClaims", 3, [])),
    nonce: String(pick(raw, "nonce", 4, "")),
    status: Number(pick(raw, "status", 5, 0)),
    createdAt: asBigInt(pick(raw, "createdAt", 6, 0n)),
    expiresAt: asBigInt(pick(raw, "expiresAt", 7, 0n)),
    presentationId: String(pick(raw, "presentationId", 8, "")),
    fulfilled: Boolean(pick(raw, "fulfilled", 9, false)),
  };
}

export function verificationRequestStatusLabel(status: number): "requested" | "approved" | "rejected" {
  if (status === 1) return "approved";
  if (status === 2) return "rejected";
  return "requested";
}
