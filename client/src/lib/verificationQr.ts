export type VerificationQrPayload = {
  verificationRequestId: string;
  verifierDid: string;
  citizenDid: string;
  requestedClaims: string[];
  nonce: string;
  createdAt: number;
  expiresAt: number;
};

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const asStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[];
  return value.map((item) => String(item).trim()).filter(Boolean);
};

const asNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

export function buildVerificationQrPayload(
  payload: VerificationQrPayload,
): string {
  return JSON.stringify(payload);
}

export function parseVerificationQrPayload(raw: string): {
  payload: VerificationQrPayload | null;
  error: string | null;
} {
  const source = raw.trim();
  if (!source) {
    return { payload: null, error: "Paste or scan a QR payload first." };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(source) as Record<string, unknown>;
  } catch {
    return { payload: null, error: "QR payload is not valid JSON." };
  }

  const verificationRequestId =
    asString(parsed.verificationRequestId) || asString(parsed.id);
  const verifierDid = asString(parsed.verifierDid) || asString(parsed.verifier);
  const citizenDid = asString(parsed.citizenDid);
  const requestedClaims = (() => {
    const directClaims = asStringArray(parsed.requestedClaims);
    if (directClaims.length > 0) return directClaims;
    return asStringArray(parsed.claims);
  })();
  const nonce = asString(parsed.nonce);
  const createdAt = asNumber(parsed.createdAt);
  const expiresAt = asNumber(parsed.expiresAt);

  if (!verificationRequestId) {
    return {
      payload: null,
      error: "QR payload is missing verificationRequestId.",
    };
  }

  if (!verifierDid) {
    return { payload: null, error: "QR payload is missing verifierDid." };
  }

  if (requestedClaims.length === 0) {
    return {
      payload: null,
      error: "QR payload does not include any requested credentials.",
    };
  }

  return {
    payload: {
      verificationRequestId,
      verifierDid,
      citizenDid,
      requestedClaims,
      nonce,
      createdAt,
      expiresAt,
    },
    error: null,
  };
}
