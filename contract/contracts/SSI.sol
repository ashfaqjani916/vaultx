// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SSI {

    enum Role {
        CITIZEN,
        APPROVER,
        VERIFIER,
        GOVERNANCE
    }

    enum ClaimStatus {
        PENDING,
        ACTIVE,
        REJECTED,
        SUSPENDED
    }

    enum ClaimRequestStatus {
        PENDING,
        IN_REVIEW,
        APPROVED,
        ISSUED,
        REJECTED,
        EXPIRED
    }

    enum CredentialStatus {
        ACTIVE,
        REVOKED,
        EXPIRED
    }

    enum VerificationStatus {
        REQUESTED,
        APPROVED,
        REJECTED
    }

    struct User {
        string did;
        string signingPublicKey;
        string encryptionPublicKey;
        address wallet;
        Role role;
        bool active;
        uint256 createdAt;
        uint256 updatedAt;
        uint256 revokedAt;
        string createdByDid;
        string revokedByDid;
    }

    struct Approval {
        string approverDid;
        bool approved;
        uint256 approvedAt;
    }

    struct Claim {
        string claimId;
        string claimType;
        string description;
        bool documentRequired;
        bool photoRequired;
        bool geolocationRequired;
        bool biometricRequired;
        uint256 numberOfApprovalsNeeded;
        ClaimStatus status;
        uint256 createdAt;
        uint256 approvedAt;
        string createdByDid;
        string approvedByDid;
    }

    struct ClaimRequest {
        string requestId;
        string claimId;
        string citizenDid;
        string documentHash;
        string photoHash;
        string geolocationHash;
        string biometricHash;
        ClaimRequestStatus status;
        string[] approverDids;
        string finalApproverDid;
        uint256 createdAt;
        uint256 updatedAt;
        uint256 expiresAt;
    }

    struct Verification {
        string verificationId;
        string requestId;
        string approverDid;
        VerificationStatus status;
        string remarks;
        uint256 verifiedAt;
    }

    struct Credential {
        string credentialId;
        string claimId;
        string requestId;
        string citizenDid;
        string credentialHash;
        CredentialStatus status;
        uint256 issuedAt;
        uint256 expiresAt;
        uint256 revokedAt;
        string[] signatures;
    }

    struct CredentialRevocation {
        string credentialId;
        string revokedByDid;
        string reason;
        uint256 revokedAt;
    }

    struct VerificationRequest {
        string verificationRequestId;
        string verifierDid;
        string citizenDid;
        string[] requestedClaims;
        VerificationStatus status;
        uint256 createdAt;
        uint256 expiresAt;
    }

    struct VerifiablePresentation {
        string presentationId;
        string verificationRequestId;
        string citizenDid;
        string verifierDid;
        string[] credentialIds;
        string proof;
        string nonce;
        uint256 createdAt;
        uint256 expiresAt;
    }

    mapping(string => User) public users;
    mapping(address => string) public userAddressToDId;
    mapping(string => Claim) public claims;
    mapping(string => ClaimRequest) public claimRequests;
    mapping(string => Credential) public credentials;
    mapping(string => CredentialRevocation) public credentialRevocations;
    mapping(string => VerificationRequest) public verificationRequests;
    mapping(string => VerifiablePresentation) public presentations;

    mapping(string => Approval[]) public claimApprovals;

    mapping(string => Verification[]) public verifications;
    mapping(string => Credential[]) public citizenCredentials;

    function registerUser(User memory user) public {
        users[user.did] = user;
    }

    function getUser(string memory did) public view returns (User memory) {
        return users[did];
    }

    function deactivateUser(string memory did) public {
        users[did].active = false;
        users[did].revokedAt = block.timestamp;
    }

    function updateUser(User memory user) public {
        users[user.did] = user;
    }

    function createClaim(Claim memory claim) public {
        claims[claim.claimId] = claim;
    }

    function getClaim(
        string memory claimId
    ) public view returns (Claim memory) {
        return claims[claimId];
    }

    function approveClaim(
        string memory claimId,
        string memory governanceDid
    ) public {
        claims[claimId].status = ClaimStatus.ACTIVE;
        claims[claimId].approvedByDid = governanceDid;
        claims[claimId].approvedAt = block.timestamp;
    }

    function rejectClaim(
        string memory claimId,
        string memory governanceDid
    ) public {
        claims[claimId].status = ClaimStatus.REJECTED;
        claims[claimId].approvedByDid = governanceDid;
    }

    function createClaimRequest(ClaimRequest memory request) public {
        claimRequests[request.requestId] = request;
    }

    function getClaimRequest(
        string memory requestId
    ) public view returns (ClaimRequest memory) {
        return claimRequests[requestId];
    }

    function reviewClaimRequest(
        string memory requestId,
        string memory approverDid
    ) public {
        claimRequests[requestId].status = ClaimRequestStatus.IN_REVIEW;
        claimRequests[requestId].approverDids.push(approverDid);
        claimRequests[requestId].updatedAt = block.timestamp;

        claimApprovals[requestId].push(
            Approval({
                approverDid: approverDid,
                approved: false,
                approvedAt: 0
            })
        );
    }

    function approveClaimRequest(
        string memory requestId,
        string memory approverDid
    ) public {
        Approval[] storage approvals = claimApprovals[requestId];
        _setApprovalStatus(approvals, approverDid, true);

        ClaimRequest storage req = claimRequests[requestId];
        string[] memory approvedSignatures = _getApprovedSignatures(approvals);

        if (
            approvedSignatures.length >= claims[req.claimId].numberOfApprovalsNeeded
        ) {
            req.status = ClaimRequestStatus.APPROVED;
            req.finalApproverDid = approverDid;
            _issueCredentialForRequest(req, requestId, approvedSignatures);
            req.status = ClaimRequestStatus.ISSUED;
        }
    }

    function rejectClaimRequest(
        string memory requestId,
        string memory approverDid
    ) public {

        claimRequests[requestId].status = ClaimRequestStatus.REJECTED;
        claimRequests[requestId].finalApproverDid = approverDid;

        Approval[] storage approvals = claimApprovals[requestId];

        for (uint i = 0; i < approvals.length; i++) {
            if (
                keccak256(bytes(approvals[i].approverDid)) ==
                keccak256(bytes(approverDid))
            ) {
                approvals[i].approved = false;
                approvals[i].approvedAt = block.timestamp;
            }
        }
    }

    function submitVerification(Verification memory verification) public {
        verifications[verification.requestId].push(verification);
    }

    function getVerificationsForRequest(
        string memory requestId
    ) public view returns (Verification[] memory) {
        return verifications[requestId];
    }

    function issueCredential(Credential memory credential) public {
        credentials[credential.credentialId] = credential;
        citizenCredentials[credential.citizenDid].push(credential);
    }

    function getCredential(
        string memory credentialId
    ) public view returns (Credential memory) {
        return credentials[credentialId];
    }

    function getCredentialsByCitizen(
        string memory citizenDid
    ) public view returns (Credential[] memory) {
        return citizenCredentials[citizenDid];
    }

    function revokeCredential(CredentialRevocation memory revocation) public {
        credentialRevocations[revocation.credentialId] = revocation;
        credentials[revocation.credentialId].status = CredentialStatus.REVOKED;
    }

    function isCredentialRevoked(
        string memory credentialId
    ) public view returns (bool) {
        return credentials[credentialId].status == CredentialStatus.REVOKED;
    }

    function createVerificationRequest(
        VerificationRequest memory request
    ) public {
        verificationRequests[request.verificationRequestId] = request;
    }

    function getVerificationRequest(
        string memory requestId
    ) public view returns (VerificationRequest memory) {
        return verificationRequests[requestId];
    }

    function submitPresentation(
        VerifiablePresentation memory presentation
    ) public {
        presentations[presentation.presentationId] = presentation;
    }

    function verifyPresentation(
        string memory presentationId
    ) public view returns (bool) {
        VerifiablePresentation memory p = presentations[presentationId];

        if (p.expiresAt < block.timestamp) {
            return false;
        }

        return true;
    }

    function getApprovals(
        string memory requestId
    ) public view returns (Approval[] memory) {
        return claimApprovals[requestId];
    }

    function _setApprovalStatus(
        Approval[] storage approvals,
        string memory approverDid,
        bool approved
    ) internal {
        for (uint256 i = 0; i < approvals.length; i++) {
            if (
                keccak256(bytes(approvals[i].approverDid)) ==
                keccak256(bytes(approverDid))
            ) {
                approvals[i].approved = approved;
                approvals[i].approvedAt = block.timestamp;
            }
        }
    }

    function _getApprovedSignatures(
        Approval[] storage approvals
    ) internal view returns (string[] memory approvedSignatures) {
        uint256 approvedCount = 0;

        for (uint256 i = 0; i < approvals.length; i++) {
            if (approvals[i].approved) {
                approvedCount++;
            }
        }

        approvedSignatures = new string[](approvedCount);

        uint256 signatureIndex = 0;
        for (uint256 i = 0; i < approvals.length; i++) {
            if (approvals[i].approved) {
                approvedSignatures[signatureIndex] = approvals[i].approverDid;
                signatureIndex++;
            }
        }
    }

    function _issueCredentialForRequest(
        ClaimRequest storage req,
        string memory requestId,
        string[] memory approvedSignatures
    ) internal {
        string memory credentialId = string(abi.encodePacked("cred_", requestId));

        Credential memory credential = Credential({
            credentialId: credentialId,
            claimId: req.claimId,
            requestId: req.requestId,
            citizenDid: req.citizenDid,
            credentialHash: "",
            status: CredentialStatus.ACTIVE,
            issuedAt: block.timestamp,
            expiresAt: 0,
            revokedAt: 0,
            signatures: approvedSignatures
        });

        credentials[credentialId] = credential;
        citizenCredentials[req.citizenDid].push(credential);
    }
}
