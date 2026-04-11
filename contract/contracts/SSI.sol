// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SSI {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

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
        bool isApproved;
        uint256 createdAt;
        uint256 updatedAt;
        uint256 revokedAt;
        string createdByDid;
        string revokedByDid;
    }

    struct PublicUser {
        string did;
        address wallet;
        Role role;
        bool active;
        bool isApproved;
        string revokedByDid;
    }

    struct UserRequest {
        string did;
        string signingPublicKey;
        string encryptionPublicKey;
        address wallet;
        Role role;
        bool processed;
        bool approved;
        uint256 createdAt;
        uint256 processedAt;
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
        // string[] signatures;
        bytes[] signatures;
    }

    struct CredentialRevocation {
        string credentialId;
        string revokedByDid;
        string reason;
        uint256 revokedAt;
    }

    // struct VerificationRequest {
    //     string verificationRequestId;
    //     string verifierDid;
    //     string citizenDid;
    //     string[] requestedClaims;
    //     VerificationStatus status;
    //     uint256 createdAt;
    //     uint256 expiresAt;
    // }

    struct VerificationRequest {
        string verificationRequestId;
        string verifierDid;
        string citizenDid;
        string[] requestedClaims;
        string nonce;
        VerificationStatus status;
        uint256 createdAt;
        uint256 expiresAt;
        bool fulfilled;
    }

    // struct VerifiablePresentation {
    //     string presentationId;
    //     string verificationRequestId;
    //     string citizenDid;
    //     string verifierDid;
    //     string[] credentialIds;
    //     string proof;
    //     string nonce;
    //     uint256 createdAt;
    //     uint256 expiresAt;
    // }

    struct VerifiablePresentation {
        string presentationId;
        string verificationRequestId;
        string citizenDid;
        string verifierDid;
        string[] credentialIds;
        bytes citizenSignature;
        string nonce;
        uint256 createdAt;
        uint256 expiresAt;
        bool verified;
    }

    mapping(string => User) public users;
    mapping(address => string) public userAddressToDId;
    mapping(string => Claim) public claims;
    string[] public allClaimTypes;
    mapping(string => bool) public claimTypeExists;
    mapping(string => ClaimRequest) public claimRequests;
    mapping(string => Credential) public credentials;
    mapping(string => CredentialRevocation) public credentialRevocations;
    mapping(string => VerificationRequest) public verificationRequests;
    mapping(string => VerifiablePresentation) public presentations;

    // mapping(string => Approval[]) public claimApprovals;

    mapping(string => Verification[]) public verifications;
    mapping(string => Credential[]) public citizenCredentials;

    mapping(string => mapping(address => bool)) public hasSigned;
    mapping(string => bytes[]) public requestSignatures;

    mapping(string => UserRequest) public userRequests;

    modifier onlyGovernance() {
        // Step 1: allow owner always
        if (msg.sender == owner) {
            _;
            return;
        }

        string memory did = userAddressToDId[msg.sender];
        require(users[did].role == Role.GOVERNANCE, "Not governance");
        _;
    }

    function registerUser(
        string memory did,
        string memory signingPublicKey,
        string memory encryptionPublicKey,
        Role role
    ) public {
        require(bytes(users[did].did).length == 0, "User already exists");

        users[did] = User({
            did: did,
            signingPublicKey: signingPublicKey,
            encryptionPublicKey: encryptionPublicKey,
            wallet: msg.sender,
            role: role,
            active: true,
            isApproved: msg.sender == owner,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            revokedAt: 0,
            createdByDid: "",
            revokedByDid: ""
        });

        userAddressToDId[msg.sender] = did;

        require(bytes(userRequests[did].did).length == 0, "Request exists");
        userRequests[did] = UserRequest({
            did: did,
            signingPublicKey: signingPublicKey,
            encryptionPublicKey: encryptionPublicKey,
            wallet: msg.sender,
            role: role,
            processed: false,
            approved: false,
            createdAt: block.timestamp,
            processedAt: 0
        });
    }

    function approveUserRequest(string memory did) public onlyGovernance {
        UserRequest storage req = userRequests[did];
        User storage user = users[did];

        require(bytes(req.did).length != 0, "Request not found");
        require(!req.processed, "Already processed");
        require(bytes(user.did).length != 0, "User not found");

        user.isApproved = true;
        user.updatedAt = block.timestamp;

        req.processed = true;
        req.approved = true;
        req.processedAt = block.timestamp;
    }

    function rejectUser(string memory did) public onlyGovernance {
        User storage user = users[did];

        require(bytes(user.did).length != 0, "User not found");
        require(!user.isApproved, "Already approved");

        user.active = false;
        user.revokedAt = block.timestamp;
    }

    function rejectUserRequest(string memory did) public onlyGovernance {
        UserRequest storage req = userRequests[did];

        require(bytes(req.did).length != 0, "Request not found");
        require(!req.processed, "Already processed");

        req.processed = true;
        req.approved = false;
        req.processedAt = block.timestamp;
    }

    function getUserByDID(string memory did) public view returns (User memory) {
        return users[did];
    }

    function getUser(
        address userAddress
    ) public view returns (PublicUser memory) {
        User storage user = users[userAddressToDId[userAddress]];
        return
            PublicUser({
                did: user.did,
                wallet: user.wallet,
                role: user.role,
                active: user.active,
                isApproved: user.isApproved,
                revokedByDid: user.revokedByDid
            });
    }

    function getMessageHash(
        string memory requestId,
        string memory claimId,
        string memory citizenDid
    ) public view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    requestId,
                    claimId,
                    citizenDid,
                    address(this),
                    block.chainid
                )
            );
    }

    function getPresentationHash(
        string memory verificationRequestId,
        string[] memory credentialIds,
        string memory citizenDid,
        string memory nonce
    ) public view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    verificationRequestId,
                    credentialIds,
                    citizenDid,
                    nonce,
                    address(this),
                    block.chainid
                )
            );
    }

    function recoverSigner(
        bytes32 hash,
        bytes memory signature
    ) public pure returns (address) {
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );

        (bytes32 r, bytes32 s, uint8 v) = splitSignature(signature);

        return ecrecover(ethSignedMessageHash, v, r, s);
    }

    function splitSignature(
        bytes memory sig
    ) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Invalid signature length");

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }

    function deactivateUser(string memory did) public {
        users[did].active = false;
        users[did].revokedAt = block.timestamp;
    }

    function updateUser(User memory user) public {
        users[user.did] = user;
    }

    function createClaim(
        string memory claimId,
        string memory claimType,
        string memory description,
        bool documentRequired,
        bool photoRequired,
        bool geolocationRequired,
        bool biometricRequired,
        uint256 numberOfApprovalsNeeded
    ) public onlyGovernance {
        require(
            bytes(claims[claimId].claimId).length == 0,
            "Claim already exists"
        );

        if (!claimTypeExists[claimType]) {
            allClaimTypes.push(claimType);
            claimTypeExists[claimType] = true;
        }

        claims[claimId] = Claim({
            claimId: claimId,
            claimType: claimType,
            description: description,
            documentRequired: documentRequired,
            photoRequired: photoRequired,
            geolocationRequired: geolocationRequired,
            biometricRequired: biometricRequired,
            numberOfApprovalsNeeded: numberOfApprovalsNeeded,
            status: ClaimStatus.PENDING,
            createdAt: block.timestamp,
            approvedAt: 0,
            createdByDid: userAddressToDId[msg.sender],
            approvedByDid: ""
        });
    }

    function getClaim(
        string memory claimId
    ) public view returns (Claim memory) {
        return claims[claimId];
    }

    function getClaimTypes() public view returns (string[] memory) {
        return allClaimTypes;
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

    function createClaimRequest(
        string memory requestId,
        string memory claimId,
        string memory citizenDid,
        string memory documentHash,
        string memory photoHash,
        string memory geolocationHash,
        string memory biometricHash,
        uint256 expiresAt
    ) public {
        require(
            bytes(claimRequests[requestId].requestId).length == 0,
            "Request exists"
        );
        require(bytes(claims[claimId].claimId).length != 0, "Invalid claim");

        string memory senderDid = userAddressToDId[msg.sender];
        require(
            keccak256(bytes(senderDid)) == keccak256(bytes(citizenDid)),
            "Not authorized"
        );

        User memory user = users[senderDid];
        require(user.role == Role.CITIZEN, "Only citizen allowed");
        require(user.active, "User inactive");

        ClaimRequest storage req = claimRequests[requestId];

        req.requestId = requestId;
        req.claimId = claimId;
        req.citizenDid = citizenDid;
        req.documentHash = documentHash;
        req.photoHash = photoHash;
        req.geolocationHash = geolocationHash;
        req.biometricHash = biometricHash;
        req.status = ClaimRequestStatus.PENDING;
        req.finalApproverDid = "";
        req.createdAt = block.timestamp;
        req.updatedAt = block.timestamp;
        req.expiresAt = expiresAt;
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
    }

    function submitApproval(
        string memory requestId,
        bytes memory signature
    ) public {
        ClaimRequest storage req = claimRequests[requestId];
        require(req.status != ClaimRequestStatus.REJECTED, "Already rejected");
        require(
            req.status == ClaimRequestStatus.IN_REVIEW,
            "Not in review state"
        );
        require(req.status != ClaimRequestStatus.ISSUED, "Already issued");

        require(bytes(req.requestId).length != 0, "Invalid request");

        // Expiry check
        if (block.timestamp >= req.expiresAt) {
            req.status = ClaimRequestStatus.EXPIRED;
            revert("Request expired");
        }

        // Create message hash
        bytes32 hash = getMessageHash(requestId, req.claimId, req.citizenDid);

        // Recover signer
        address signer = recoverSigner(hash, signature);
        require(msg.sender == signer, "Sender must be signer");

        // Get DID of signer
        string memory signerDid = userAddressToDId[signer];
        User memory user = users[signerDid];

        // Validate signer
        require(user.active, "User inactive");
        require(user.role == Role.APPROVER, "Not approver");

        // Check if signer is assigned to this request
        bool isValidApprover = false;
        for (uint i = 0; i < req.approverDids.length; i++) {
            if (
                keccak256(bytes(req.approverDids[i])) ==
                keccak256(bytes(signerDid))
            ) {
                isValidApprover = true;
                break;
            }
        }
        require(isValidApprover, "Not assigned approver");

        // Prevent duplicate signing
        require(!hasSigned[requestId][signer], "Already signed");

        // Store signature
        hasSigned[requestId][signer] = true;
        requestSignatures[requestId].push(signature);

        req.updatedAt = block.timestamp;

        // Threshold check
        uint256 required = claims[req.claimId].numberOfApprovalsNeeded;

        if (requestSignatures[requestId].length >= required) {
            require(
                req.status == ClaimRequestStatus.IN_REVIEW,
                "Already processed"
            );
            req.status = ClaimRequestStatus.APPROVED;
            req.finalApproverDid = signerDid;

            _issueCredentialForRequest(req, requestId);

            req.status = ClaimRequestStatus.ISSUED;
        }
    }

    function rejectClaimRequest(string memory requestId) public {
        ClaimRequest storage req = claimRequests[requestId];

        require(req.status == ClaimRequestStatus.IN_REVIEW, "Invalid state");

        require(bytes(req.requestId).length != 0, "Invalid request");

        // Only assigned approver can reject
        string memory signerDid = userAddressToDId[msg.sender];
        User memory user = users[signerDid];

        require(user.role == Role.APPROVER, "Not approver");

        bool isValidApprover = false;
        for (uint i = 0; i < req.approverDids.length; i++) {
            if (
                keccak256(bytes(req.approverDids[i])) ==
                keccak256(bytes(signerDid))
            ) {
                isValidApprover = true;
                break;
            }
        }
        require(isValidApprover, "Not assigned approver");

        req.status = ClaimRequestStatus.REJECTED;
        req.finalApproverDid = signerDid;
        req.updatedAt = block.timestamp;
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

    // function submitPresentation(
    //     VerifiablePresentation memory presentation
    // ) public {
    //     presentations[presentation.presentationId] = presentation;
    // }

    function submitPresentation(
        VerifiablePresentation memory presentation
    ) public {
        require(
            bytes(presentations[presentation.presentationId].presentationId)
                .length == 0,
            "Exists"
        );

        presentations[presentation.presentationId] = presentation;
    }

    // function verifyPresentation(
    //     string memory presentationId
    // ) public view returns (bool) {
    //     VerifiablePresentation memory p = presentations[presentationId];

    //     if (p.expiresAt < block.timestamp) {
    //         return false;
    //     }

    //     return true;
    // }

    function verifyPresentation(
        string memory presentationId
    ) public returns (bool) {
        VerifiablePresentation storage p = presentations[presentationId];
        VerificationRequest storage vr = verificationRequests[
            p.verificationRequestId
        ];

        require(bytes(p.presentationId).length != 0, "Invalid presentation");
        require(bytes(vr.verificationRequestId).length != 0, "Invalid request");

        if (block.timestamp > p.expiresAt || block.timestamp > vr.expiresAt) {
            return false;
        }

        require(!vr.fulfilled, "Already fulfilled");

        require(
            keccak256(bytes(p.citizenDid)) == keccak256(bytes(vr.citizenDid)),
            "Citizen mismatch"
        );

        require(
            keccak256(bytes(p.nonce)) == keccak256(bytes(vr.nonce)),
            "Nonce mismatch"
        );

        bytes32 hash = getPresentationHash(
            p.verificationRequestId,
            p.credentialIds,
            p.citizenDid,
            p.nonce
        );

        address signer = recoverSigner(hash, p.citizenSignature);
        string memory signerDid = userAddressToDId[signer];

        require(
            keccak256(bytes(signerDid)) == keccak256(bytes(p.citizenDid)),
            "Invalid signer"
        );

        for (uint i = 0; i < p.credentialIds.length; i++) {
            Credential memory cred = credentials[p.credentialIds[i]];

            require(bytes(cred.credentialId).length != 0, "Invalid credential");
            require(
                cred.status == CredentialStatus.ACTIVE,
                "Credential invalid"
            );

            require(
                keccak256(bytes(cred.citizenDid)) ==
                    keccak256(bytes(p.citizenDid)),
                "Ownership mismatch"
            );

            bool matchFound = false;
            for (uint j = 0; j < vr.requestedClaims.length; j++) {
                if (
                    keccak256(bytes(cred.claimId)) ==
                    keccak256(bytes(vr.requestedClaims[j]))
                ) {
                    matchFound = true;
                    break;
                }
            }
            require(matchFound, "Claim not requested");
        }

        vr.fulfilled = true;
        p.verified = true;

        return true;
    }

    function _issueCredentialForRequest(
        ClaimRequest storage req,
        string memory requestId
    ) internal {
        string memory credentialId = string(
            abi.encodePacked("cred_", requestId)
        );

        bytes[] memory signatures = requestSignatures[requestId];

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
            signatures: signatures
        });

        credentials[credentialId] = credential;
        citizenCredentials[req.citizenDid].push(credential);
    }
}
