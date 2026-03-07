// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SovereignIdentity {

    /* =======================================================
                        GOVERNANCE MANAGEMENT
       ======================================================= */

    address public owner;

    mapping(address => bool) public governance;
    uint public governanceCount;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    modifier onlyGovernance() {
        require(governance[msg.sender], "Not governance authority");
        _;
    }

    constructor() {
        owner = msg.sender;

        // deployer becomes first governance
        governance[msg.sender] = true;
        governanceCount = 1;
    }

    function addGovernance(address _gov) external onlyOwner {
        require(!governance[_gov], "Already governance");
        governance[_gov] = true;
        governanceCount++;
    }

    function removeGovernance(address _gov) external onlyOwner {
        require(governance[_gov], "Not governance");
        governance[_gov] = false;
        governanceCount--;
    }


    /* =======================================================
                          DID REGISTRY
       ======================================================= */

    struct DIDDocument {
        address owner;
        bytes publicKey;
        bool active;
    }

    mapping(bytes32 => DIDDocument) public didRegistry;

    event DIDRegistered(bytes32 did, address owner);

    function registerDID(bytes32 did, bytes calldata publicKey) external {
        require(didRegistry[did].owner == address(0), "DID exists");

        didRegistry[did] = DIDDocument({
            owner: msg.sender,
            publicKey: publicKey,
            active: true
        });

        emit DIDRegistered(did, msg.sender);
    }

    function resolveDID(bytes32 did) external view returns (bytes memory) {
        require(didRegistry[did].active, "DID inactive");
        return didRegistry[did].publicKey;
    }


    /* =======================================================
                       CLAIM TEMPLATE REGISTRY
       ======================================================= */

    struct ClaimTemplate {
        uint id;
        string name;
        uint requiredApprovals;
        uint approvalCount;
        bool active;
    }

    uint public templateCounter;

    mapping(uint => ClaimTemplate) public claimTemplates;

    mapping(uint => mapping(address => bool)) public templateApprovals;

    event TemplateProposed(uint templateId, string name);
    event TemplateApproved(uint templateId, address authority);
    event TemplateActivated(uint templateId);

    function proposeClaimTemplate(
        string calldata name,
        uint requiredApprovals
    ) external onlyGovernance {

        require(requiredApprovals > 0, "Invalid approvals");

        templateCounter++;

        claimTemplates[templateCounter] = ClaimTemplate({
            id: templateCounter,
            name: name,
            requiredApprovals: requiredApprovals,
            approvalCount: 0,
            active: false
        });

        emit TemplateProposed(templateCounter, name);
    }

    function approveClaimTemplate(uint templateId) external onlyGovernance {

        ClaimTemplate storage template = claimTemplates[templateId];

        require(!template.active, "Already active");
        require(!templateApprovals[templateId][msg.sender], "Already approved");

        templateApprovals[templateId][msg.sender] = true;
        template.approvalCount++;

        emit TemplateApproved(templateId, msg.sender);

        if (template.approvalCount >= template.requiredApprovals) {
            template.active = true;
            emit TemplateActivated(templateId);
        }
    }


    /* =======================================================
                      CREDENTIAL HASH REGISTRY
       ======================================================= */

    struct CredentialRecord {
        bytes32 credentialHash;
        uint templateId;
        bytes32 subjectDID;
        address anchoredBy;
        bool revoked;
        uint timestamp;
    }

    mapping(bytes32 => CredentialRecord) public credentials;

    event CredentialAnchored(bytes32 hash, uint templateId, bytes32 subject);
    event CredentialRevoked(bytes32 hash);

    function anchorCredentialHash(
        bytes32 credentialHash,
        uint templateId,
        bytes32 subjectDID
    ) external onlyGovernance {

        require(credentials[credentialHash].timestamp == 0, "Credential exists");

        require(claimTemplates[templateId].active, "Template inactive");

        credentials[credentialHash] = CredentialRecord({
            credentialHash: credentialHash,
            templateId: templateId,
            subjectDID: subjectDID,
            anchoredBy: msg.sender,
            revoked: false,
            timestamp: block.timestamp
        });

        emit CredentialAnchored(credentialHash, templateId, subjectDID);
    }

    function revokeCredential(bytes32 credentialHash) external onlyGovernance {

        require(credentials[credentialHash].timestamp != 0, "Credential not found");
        require(!credentials[credentialHash].revoked, "Already revoked");

        credentials[credentialHash].revoked = true;

        emit CredentialRevoked(credentialHash);
    }


    /* =======================================================
                       VERIFICATION HELPERS
       ======================================================= */

    function credentialExists(bytes32 credentialHash) external view returns (bool) {
        return credentials[credentialHash].timestamp != 0;
    }

    function isCredentialRevoked(bytes32 credentialHash) external view returns (bool) {
        return credentials[credentialHash].revoked;
    }
}
