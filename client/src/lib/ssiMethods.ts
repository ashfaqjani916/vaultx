const USER_TUPLE =
  "(string did,string signingPublicKey,string encryptionPublicKey,address wallet,uint8 role,bool active,uint256 createdAt,uint256 updatedAt,uint256 revokedAt,string createdByDid,string revokedByDid)";
const CLAIM_TUPLE =
  "(string claimId,string claimType,string description,bool documentRequired,bool photoRequired,bool geolocationRequired,bool biometricRequired,uint256 numberOfApprovalsNeeded,uint8 status,uint256 createdAt,uint256 approvedAt,string createdByDid,string approvedByDid)";
const CLAIM_REQUEST_TUPLE =
  "(string requestId,string claimId,string citizenDid,string documentHash,string photoHash,string geolocationHash,string biometricHash,uint8 status,string[] approverDids,string finalApproverDid,uint256 createdAt,uint256 updatedAt,uint256 expiresAt)";
const VERIFICATION_TUPLE =
  "(string verificationId,string requestId,string approverDid,uint8 status,string remarks,uint256 verifiedAt)";
const CREDENTIAL_TUPLE =
  "(string credentialId,string claimId,string requestId,string citizenDid,string credentialHash,uint8 status,uint256 issuedAt,uint256 expiresAt,uint256 revokedAt,string[] signatures)";
const CREDENTIAL_REVOCATION_TUPLE =
  "(string credentialId,string revokedByDid,string reason,uint256 revokedAt)";
const VERIFICATION_REQUEST_TUPLE =
  "(string verificationRequestId,string verifierDid,string citizenDid,string[] requestedClaims,uint8 status,uint256 createdAt,uint256 expiresAt)";
const PRESENTATION_TUPLE =
  "(string presentationId,string verificationRequestId,string citizenDid,string verifierDid,string[] credentialIds,string proof,string nonce,uint256 createdAt,uint256 expiresAt)";
const APPROVAL_TUPLE = "(string approverDid,bool approved,uint256 approvedAt)";

export const ssiMethods = {
  owner: "function owner() view returns (address)",
  registerUser: `function registerUser(${USER_TUPLE} user)`,
  userAddressToDId:
    "function userAddressToDId(address wallet) view returns (string)",
  getUser: `function getUser(string did) view returns ${USER_TUPLE}`,
  deactivateUser: "function deactivateUser(string did)",
  updateUser: `function updateUser(${USER_TUPLE} user)`,

  createClaim: `function createClaim(${CLAIM_TUPLE} claim)`,
  getClaim: `function getClaim(string claimId) view returns ${CLAIM_TUPLE}`,
  approveClaim: "function approveClaim(string claimId,string governanceDid)",
  rejectClaim: "function rejectClaim(string claimId,string governanceDid)",

  createClaimRequest: `function createClaimRequest(${CLAIM_REQUEST_TUPLE} request)`,
  getClaimRequest: `function getClaimRequest(string requestId) view returns ${CLAIM_REQUEST_TUPLE}`,
  reviewClaimRequest:
    "function reviewClaimRequest(string requestId,string approverDid)",
  approveClaimRequest:
    "function approveClaimRequest(string requestId,string approverDid)",
  rejectClaimRequest:
    "function rejectClaimRequest(string requestId)",
  submitApproval:
    "function submitApproval(string requestId,bytes signature)",
  getMessageHash:
    "function getMessageHash(string requestId,string claimId,string citizenDid) view returns (bytes32)",

  submitVerification: `function submitVerification(${VERIFICATION_TUPLE} verification)`,
  getVerificationsForRequest: `function getVerificationsForRequest(string requestId) view returns (${VERIFICATION_TUPLE}[])`,

  issueCredential: `function issueCredential(${CREDENTIAL_TUPLE} credential)`,
  getCredential: `function getCredential(string credentialId) view returns ${CREDENTIAL_TUPLE}`,
  getCredentialsByCitizen: `function getCredentialsByCitizen(string citizenDid) view returns (${CREDENTIAL_TUPLE}[])`,

  revokeCredential: `function revokeCredential(${CREDENTIAL_REVOCATION_TUPLE} revocation)`,
  isCredentialRevoked:
    "function isCredentialRevoked(string credentialId) view returns (bool)",

  createVerificationRequest: `function createVerificationRequest(${VERIFICATION_REQUEST_TUPLE} request)`,
  getVerificationRequest: `function getVerificationRequest(string requestId) view returns ${VERIFICATION_REQUEST_TUPLE}`,

  submitPresentation: `function submitPresentation(${PRESENTATION_TUPLE} presentation)`,
  verifyPresentation:
    "function verifyPresentation(string presentationId) view returns (bool)",

  getApprovals: `function getApprovals(string requestId) view returns (${APPROVAL_TUPLE}[])`,

  // Governance helpers
  getApproverAddresses:
    "function getApproverAddresses() view returns (address[])",
  getAllRequestIds:
    "function getAllRequestIds() view returns (string[])",
  assignApproversToRequest:
    "function assignApproversToRequest(string requestId,string[] _approverDids)",
} as const;

export type SSIMethodName = keyof typeof ssiMethods;
