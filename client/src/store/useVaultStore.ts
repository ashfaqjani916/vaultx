import { create } from 'zustand';
import type { UserRole, DID, Credential, ClaimDefinition, ClaimRequest, VerificationRequest, AuditLog, ActivityItem } from '@/types';

interface VaultState {
  // Wallet
  walletConnected: boolean;
  walletAddress: string;
  currentRole: UserRole;
  setWalletConnection: (connected: boolean, address?: string) => void;
  
  // Identity
  did: DID | null;
  
  // Data
  credentials: Credential[];
  claimDefinitions: ClaimDefinition[];
  claimRequests: ClaimRequest[];
  verificationRequests: VerificationRequest[];
  auditLogs: AuditLog[];
  activities: ActivityItem[];
  
  // Actions
  connectWallet: () => void;
  disconnectWallet: () => void;
  setRole: (role: UserRole) => void;
  generateDID: () => void;
  addClaimDefinition: (claim: Omit<ClaimDefinition, 'id' | 'status'>) => void;
  submitClaimRequest: (req: Omit<ClaimRequest, 'id' | 'status' | 'submittedDate' | 'approvals'>) => void;
  updateClaimRequestStatus: (id: string, status: ClaimRequest['status'], remarks?: string) => void;
  issueCredential: (requestId: string) => void;
  createVerificationRequest: (req: Omit<VerificationRequest, 'id' | 'status' | 'createdDate'>) => void;
}

const mockCredentials: Credential[] = [
  {
    id: 'cred-001', claimType: 'Citizenship', issuerDid: 'did:vaultx:issuer001',
    issuerName: 'National Identity Authority', holderDid: 'did:vaultx:user001',
    issuedDate: '2025-01-15', status: 'active',
    hash: '0x7a3b...f291', attributes: { nationality: 'United States', dateOfBirth: '1990-05-12' }
  },
  {
    id: 'cred-002', claimType: 'Employment', issuerDid: 'did:vaultx:issuer002',
    issuerName: 'TechCorp Inc.', holderDid: 'did:vaultx:user001',
    issuedDate: '2025-03-20', status: 'active',
    hash: '0x9c4d...a832', attributes: { employer: 'TechCorp Inc.', position: 'Senior Engineer', startDate: '2023-06-01' }
  },
  {
    id: 'cred-003', claimType: 'Education', issuerDid: 'did:vaultx:issuer003',
    issuerName: 'MIT', holderDid: 'did:vaultx:user001',
    issuedDate: '2024-06-15', status: 'active',
    hash: '0x2e8f...b471', attributes: { degree: 'M.S. Computer Science', year: '2024' }
  },
];

const mockClaimDefs: ClaimDefinition[] = [
  { id: 'def-001', name: 'Citizenship', description: 'National citizenship verification', requiredDocs: ['Passport', 'Birth Certificate'], photoRequired: true, geoRequired: false, biometricRequired: true, approvalsNeeded: 2, status: 'active' },
  { id: 'def-002', name: 'Employment', description: 'Employment status verification', requiredDocs: ['Employment Letter', 'Pay Stub'], photoRequired: false, geoRequired: false, biometricRequired: false, approvalsNeeded: 1, status: 'active' },
  { id: 'def-003', name: 'Education', description: 'Academic credential verification', requiredDocs: ['Diploma', 'Transcript'], photoRequired: true, geoRequired: false, biometricRequired: false, approvalsNeeded: 1, status: 'active' },
];

const mockClaimRequests: ClaimRequest[] = [
  { id: 'req-001', citizenDid: 'did:vaultx:user002', citizenName: 'Alice Johnson', claimType: 'Citizenship', claimDefinitionId: 'def-001', documents: ['passport.pdf'], status: 'pending', submittedDate: '2025-12-01', approvals: 0 },
  { id: 'req-002', citizenDid: 'did:vaultx:user003', citizenName: 'Bob Smith', claimType: 'Employment', claimDefinitionId: 'def-002', documents: ['employment_letter.pdf'], status: 'in_review', submittedDate: '2025-11-28', approvals: 1 },
  { id: 'req-003', citizenDid: 'did:vaultx:user004', citizenName: 'Carol Davis', claimType: 'Education', claimDefinitionId: 'def-003', documents: ['diploma.pdf', 'transcript.pdf'], status: 'approved', submittedDate: '2025-11-20', approvals: 1 },
];

const mockActivities: ActivityItem[] = [
  { id: 'act-1', type: 'credential', message: 'Citizenship credential issued', timestamp: '2 hours ago' },
  { id: 'act-2', type: 'claim', message: 'New claim request from Alice Johnson', timestamp: '4 hours ago' },
  { id: 'act-3', type: 'verification', message: 'Employment verification completed', timestamp: '1 day ago' },
  { id: 'act-4', type: 'identity', message: 'DID created successfully', timestamp: '2 days ago' },
  { id: 'act-5', type: 'credential', message: 'Education credential shared', timestamp: '3 days ago' },
];

const mockAuditLogs: AuditLog[] = [
  { id: 'log-1', action: 'CREDENTIAL_ISSUED', actor: 'did:vaultx:issuer001', target: 'did:vaultx:user001', timestamp: '2025-12-01T10:00:00Z', details: 'Citizenship credential issued' },
  { id: 'log-2', action: 'CLAIM_APPROVED', actor: 'did:vaultx:approver001', target: 'req-001', timestamp: '2025-11-30T15:30:00Z', details: 'Citizenship claim approved' },
  { id: 'log-3', action: 'DID_CREATED', actor: 'did:vaultx:user005', target: 'did:vaultx:user005', timestamp: '2025-11-29T09:00:00Z', details: 'New DID registered' },
  { id: 'log-4', action: 'VERIFICATION_COMPLETED', actor: 'did:vaultx:verifier001', target: 'did:vaultx:user001', timestamp: '2025-11-28T14:00:00Z', details: 'Employment proof verified' },
];

export const useVaultStore = create<VaultState>((set, get) => ({
  walletConnected: false,
  walletAddress: '',
  currentRole: 'citizen',
  did: null,
  credentials: mockCredentials,
  claimDefinitions: mockClaimDefs,
  claimRequests: mockClaimRequests,
  verificationRequests: [],
  auditLogs: mockAuditLogs,
  activities: mockActivities,

  setWalletConnection: (connected, address = '') => set((state) => ({
    walletConnected: connected,
    walletAddress: connected ? address : '',
    did: connected ? state.did : null,
  })),

  connectWallet: () => set({
    walletConnected: true,
    walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
  }),

  disconnectWallet: () => set({
    walletConnected: false,
    walletAddress: '',
    did: null,
  }),

  setRole: (role) => set({ currentRole: role }),

  generateDID: () => {
    const id = `did:vaultx:${Math.random().toString(36).slice(2, 14)}`;
    set({
      did: {
        id,
        method: 'vaultx',
        publicKey: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        encryptionKey: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        created: new Date().toISOString(),
        status: 'active',
      },
    });
  },

  addClaimDefinition: (claim) => set((s) => ({
    claimDefinitions: [...s.claimDefinitions, { ...claim, id: `def-${Date.now()}`, status: 'active' as const }],
  })),

  submitClaimRequest: (req) => set((s) => ({
    claimRequests: [...s.claimRequests, { ...req, id: `req-${Date.now()}`, status: 'pending', submittedDate: new Date().toISOString().slice(0, 10), approvals: 0 }],
  })),

  updateClaimRequestStatus: (id, status, remarks) => set((s) => ({
    claimRequests: s.claimRequests.map((r) => r.id === id ? { ...r, status, remarks: remarks || r.remarks, approvals: status === 'approved' ? r.approvals + 1 : r.approvals } : r),
  })),

  issueCredential: (requestId) => {
    const state = get();
    const req = state.claimRequests.find((r) => r.id === requestId);
    if (!req) return;
    const newCred: Credential = {
      id: `cred-${Date.now()}`,
      claimType: req.claimType,
      issuerDid: state.did?.id || 'did:vaultx:issuer001',
      issuerName: 'VaultX Authority',
      holderDid: req.citizenDid,
      issuedDate: new Date().toISOString().slice(0, 10),
      status: 'active',
      hash: `0x${Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      attributes: {},
    };
    set((s) => ({
      credentials: [...s.credentials, newCred],
      claimRequests: s.claimRequests.map((r) => r.id === requestId ? { ...r, status: 'issued' as const } : r),
    }));
  },

  createVerificationRequest: (req) => set((s) => ({
    verificationRequests: [...s.verificationRequests, { ...req, id: `vreq-${Date.now()}`, status: 'pending', createdDate: new Date().toISOString().slice(0, 10) }],
  })),
}));
