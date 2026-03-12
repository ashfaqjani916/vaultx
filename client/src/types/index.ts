export type UserRole = 'citizen' | 'approver' | 'verifier' | 'governance';

export interface DID {
  id: string;
  method: string;
  publicKey: string;
  encryptionKey: string;
  created: string;
  status: 'active' | 'revoked' | 'deactivated';
}

export interface Credential {
  id: string;
  claimType: string;
  issuerDid: string;
  issuerName: string;
  holderDid: string;
  issuedDate: string;
  expiryDate?: string;
  status: 'active' | 'revoked' | 'expired' | 'pending';
  hash: string;
  attributes: Record<string, string>;
}

export interface ClaimDefinition {
  id: string;
  name: string;
  description: string;
  requiredDocs: string[];
  photoRequired: boolean;
  geoRequired: boolean;
  biometricRequired: boolean;
  approvalsNeeded: number;
  status: 'active' | 'draft' | 'deprecated';
}

export interface ClaimRequest {
  id: string;
  citizenDid: string;
  citizenName: string;
  claimType: string;
  claimDefinitionId: string;
  documents: string[];
  photo?: string;
  location?: { lat: number; lng: number };
  status: 'pending' | 'in_review' | 'approved' | 'issued' | 'rejected';
  submittedDate: string;
  remarks?: string;
  approvals: number;
}

export interface VerificationRequest {
  id: string;
  verifierDid: string;
  verifierName: string;
  requestedClaims: string[];
  purpose: string;
  expiryTime: string;
  qrCode?: string;
  status: 'pending' | 'completed' | 'expired';
  createdDate: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  target: string;
  timestamp: string;
  details: string;
}

export interface ActivityItem {
  id: string;
  type: 'credential' | 'claim' | 'verification' | 'identity';
  message: string;
  timestamp: string;
}
