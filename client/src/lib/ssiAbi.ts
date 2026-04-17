export const ssiAbi = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "allClaimIds",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "allClaimTypes",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "allRequestIds",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "allUserAddresses",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "claimId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "governanceDid",
        "type": "string"
      }
    ],
    "name": "approveClaim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "did",
        "type": "string"
      }
    ],
    "name": "approveUserRequest",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "approverAddresses",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "requestId",
        "type": "string"
      },
      {
        "internalType": "string[]",
        "name": "_approverDids",
        "type": "string[]"
      }
    ],
    "name": "assignApproversToRequest",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "citizenCredentials",
    "outputs": [
      {
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "claimId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "requestId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "citizenDid",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "credentialHash",
        "type": "string"
      },
      {
        "internalType": "enum SSI.CredentialStatus",
        "name": "status",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "issuedAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "expiresAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "revokedAt",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "name": "claimRequests",
    "outputs": [
      {
        "internalType": "string",
        "name": "requestId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "claimId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "citizenDid",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "documentHash",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "photoHash",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "geolocationHash",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "biometricHash",
        "type": "string"
      },
      {
        "internalType": "enum SSI.ClaimRequestStatus",
        "name": "status",
        "type": "uint8"
      },
      {
        "internalType": "string",
        "name": "finalApproverDid",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "createdAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "updatedAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "expiresAt",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "name": "claimTypeExists",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "name": "claims",
    "outputs": [
      {
        "internalType": "string",
        "name": "claimId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "claimType",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "description",
        "type": "string"
      },
      {
        "internalType": "bool",
        "name": "documentRequired",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "photoRequired",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "geolocationRequired",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "biometricRequired",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "numberOfApprovalsNeeded",
        "type": "uint256"
      },
      {
        "internalType": "enum SSI.ClaimStatus",
        "name": "status",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "createdAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "approvedAt",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "createdByDid",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "approvedByDid",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "claimId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "claimType",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "description",
        "type": "string"
      },
      {
        "internalType": "bool",
        "name": "documentRequired",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "photoRequired",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "geolocationRequired",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "biometricRequired",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "numberOfApprovalsNeeded",
        "type": "uint256"
      }
    ],
    "name": "createClaim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "requestId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "claimId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "citizenDid",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "documentHash",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "photoHash",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "geolocationHash",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "biometricHash",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "expiresAt",
        "type": "uint256"
      }
    ],
    "name": "createClaimRequest",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "verificationRequestId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "verifierDid",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "citizenDid",
            "type": "string"
          },
          {
            "internalType": "string[]",
            "name": "requestedClaims",
            "type": "string[]"
          },
          {
            "internalType": "string",
            "name": "nonce",
            "type": "string"
          },
          {
            "internalType": "enum SSI.VerificationStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "expiresAt",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "fulfilled",
            "type": "bool"
          }
        ],
        "internalType": "struct SSI.VerificationRequest",
        "name": "request",
        "type": "tuple"
      }
    ],
    "name": "createVerificationRequest",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "name": "credentialRevocations",
    "outputs": [
      {
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "revokedByDid",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "reason",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "revokedAt",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "name": "credentials",
    "outputs": [
      {
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "claimId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "requestId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "citizenDid",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "credentialHash",
        "type": "string"
      },
      {
        "internalType": "enum SSI.CredentialStatus",
        "name": "status",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "issuedAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "expiresAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "revokedAt",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "did",
        "type": "string"
      }
    ],
    "name": "deactivateUser",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllClaimIds",
    "outputs": [
      {
        "internalType": "string[]",
        "name": "",
        "type": "string[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllRequestIds",
    "outputs": [
      {
        "internalType": "string[]",
        "name": "",
        "type": "string[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllUserAddresses",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getApproverAddresses",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "claimId",
        "type": "string"
      }
    ],
    "name": "getClaim",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "claimId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "claimType",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "description",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "documentRequired",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "photoRequired",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "geolocationRequired",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "biometricRequired",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "numberOfApprovalsNeeded",
            "type": "uint256"
          },
          {
            "internalType": "enum SSI.ClaimStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "approvedAt",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "createdByDid",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "approvedByDid",
            "type": "string"
          }
        ],
        "internalType": "struct SSI.Claim",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "requestId",
        "type": "string"
      }
    ],
    "name": "getClaimRequest",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "requestId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "claimId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "citizenDid",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "documentHash",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "photoHash",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "geolocationHash",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "biometricHash",
            "type": "string"
          },
          {
            "internalType": "enum SSI.ClaimRequestStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "string[]",
            "name": "approverDids",
            "type": "string[]"
          },
          {
            "internalType": "string",
            "name": "finalApproverDid",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "updatedAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "expiresAt",
            "type": "uint256"
          }
        ],
        "internalType": "struct SSI.ClaimRequest",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getClaimTypes",
    "outputs": [
      {
        "internalType": "string[]",
        "name": "",
        "type": "string[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      }
    ],
    "name": "getCredential",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "credentialId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "claimId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "requestId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "citizenDid",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "credentialHash",
            "type": "string"
          },
          {
            "internalType": "enum SSI.CredentialStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "issuedAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "expiresAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "revokedAt",
            "type": "uint256"
          },
          {
            "internalType": "bytes[]",
            "name": "signatures",
            "type": "bytes[]"
          }
        ],
        "internalType": "struct SSI.Credential",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "citizenDid",
        "type": "string"
      }
    ],
    "name": "getCredentialsByCitizen",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "credentialId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "claimId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "requestId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "citizenDid",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "credentialHash",
            "type": "string"
          },
          {
            "internalType": "enum SSI.CredentialStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "issuedAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "expiresAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "revokedAt",
            "type": "uint256"
          },
          {
            "internalType": "bytes[]",
            "name": "signatures",
            "type": "bytes[]"
          }
        ],
        "internalType": "struct SSI.Credential[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "requestId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "claimId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "citizenDid",
        "type": "string"
      }
    ],
    "name": "getMessageHash",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "verificationRequestId",
        "type": "string"
      },
      {
        "internalType": "string[]",
        "name": "credentialIds",
        "type": "string[]"
      },
      {
        "internalType": "string",
        "name": "citizenDid",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "nonce",
        "type": "string"
      }
    ],
    "name": "getPresentationHash",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "userAddress",
        "type": "address"
      }
    ],
    "name": "getUser",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "did",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "wallet",
            "type": "address"
          },
          {
            "internalType": "enum SSI.Role",
            "name": "role",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "isApproved",
            "type": "bool"
          },
          {
            "internalType": "string",
            "name": "revokedByDid",
            "type": "string"
          }
        ],
        "internalType": "struct SSI.PublicUser",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "did",
        "type": "string"
      }
    ],
    "name": "getUserByDID",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "did",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "signingPublicKey",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "encryptionPublicKey",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "wallet",
            "type": "address"
          },
          {
            "internalType": "enum SSI.Role",
            "name": "role",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "isApproved",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "updatedAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "revokedAt",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "createdByDid",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "revokedByDid",
            "type": "string"
          }
        ],
        "internalType": "struct SSI.User",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "requestId",
        "type": "string"
      }
    ],
    "name": "getVerificationRequest",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "verificationRequestId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "verifierDid",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "citizenDid",
            "type": "string"
          },
          {
            "internalType": "string[]",
            "name": "requestedClaims",
            "type": "string[]"
          },
          {
            "internalType": "string",
            "name": "nonce",
            "type": "string"
          },
          {
            "internalType": "enum SSI.VerificationStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "expiresAt",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "fulfilled",
            "type": "bool"
          }
        ],
        "internalType": "struct SSI.VerificationRequest",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "requestId",
        "type": "string"
      }
    ],
    "name": "getVerificationsForRequest",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "verificationId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "requestId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "approverDid",
            "type": "string"
          },
          {
            "internalType": "enum SSI.VerificationStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "string",
            "name": "remarks",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "verifiedAt",
            "type": "uint256"
          }
        ],
        "internalType": "struct SSI.Verification[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "hasSigned",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      }
    ],
    "name": "isCredentialRevoked",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "credentialId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "claimId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "requestId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "citizenDid",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "credentialHash",
            "type": "string"
          },
          {
            "internalType": "enum SSI.CredentialStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "issuedAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "expiresAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "revokedAt",
            "type": "uint256"
          },
          {
            "internalType": "bytes[]",
            "name": "signatures",
            "type": "bytes[]"
          }
        ],
        "internalType": "struct SSI.Credential",
        "name": "credential",
        "type": "tuple"
      }
    ],
    "name": "issueCredential",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "name": "presentations",
    "outputs": [
      {
        "internalType": "string",
        "name": "presentationId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "verificationRequestId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "citizenDid",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "verifierDid",
        "type": "string"
      },
      {
        "internalType": "bytes",
        "name": "citizenSignature",
        "type": "bytes"
      },
      {
        "internalType": "string",
        "name": "nonce",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "createdAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "expiresAt",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "verified",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "hash",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "signature",
        "type": "bytes"
      }
    ],
    "name": "recoverSigner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "did",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "signingPublicKey",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "encryptionPublicKey",
        "type": "string"
      },
      {
        "internalType": "enum SSI.Role",
        "name": "role",
        "type": "uint8"
      }
    ],
    "name": "registerUser",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "claimId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "governanceDid",
        "type": "string"
      }
    ],
    "name": "rejectClaim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "requestId",
        "type": "string"
      }
    ],
    "name": "rejectClaimRequest",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "did",
        "type": "string"
      }
    ],
    "name": "rejectUser",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "did",
        "type": "string"
      }
    ],
    "name": "rejectUserRequest",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "requestSignatures",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "requestId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "approverDid",
        "type": "string"
      }
    ],
    "name": "reviewClaimRequest",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "credentialId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "revokedByDid",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "reason",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "revokedAt",
            "type": "uint256"
          }
        ],
        "internalType": "struct SSI.CredentialRevocation",
        "name": "revocation",
        "type": "tuple"
      }
    ],
    "name": "revokeCredential",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "requestId",
        "type": "string"
      },
      {
        "internalType": "bytes",
        "name": "signature",
        "type": "bytes"
      }
    ],
    "name": "submitApproval",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "presentationId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "verificationRequestId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "citizenDid",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "verifierDid",
            "type": "string"
          },
          {
            "internalType": "string[]",
            "name": "credentialIds",
            "type": "string[]"
          },
          {
            "internalType": "bytes",
            "name": "citizenSignature",
            "type": "bytes"
          },
          {
            "internalType": "string",
            "name": "nonce",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "expiresAt",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "verified",
            "type": "bool"
          }
        ],
        "internalType": "struct SSI.VerifiablePresentation",
        "name": "presentation",
        "type": "tuple"
      }
    ],
    "name": "submitPresentation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "verificationId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "requestId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "approverDid",
            "type": "string"
          },
          {
            "internalType": "enum SSI.VerificationStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "string",
            "name": "remarks",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "verifiedAt",
            "type": "uint256"
          }
        ],
        "internalType": "struct SSI.Verification",
        "name": "verification",
        "type": "tuple"
      }
    ],
    "name": "submitVerification",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "did",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "signingPublicKey",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "encryptionPublicKey",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "wallet",
            "type": "address"
          },
          {
            "internalType": "enum SSI.Role",
            "name": "role",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "isApproved",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "updatedAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "revokedAt",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "createdByDid",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "revokedByDid",
            "type": "string"
          }
        ],
        "internalType": "struct SSI.User",
        "name": "user",
        "type": "tuple"
      }
    ],
    "name": "updateUser",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "userAddressToDId",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "name": "userRequests",
    "outputs": [
      {
        "internalType": "string",
        "name": "did",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "signingPublicKey",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "encryptionPublicKey",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "wallet",
        "type": "address"
      },
      {
        "internalType": "enum SSI.Role",
        "name": "role",
        "type": "uint8"
      },
      {
        "internalType": "bool",
        "name": "processed",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "approved",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "createdAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "processedAt",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "name": "users",
    "outputs": [
      {
        "internalType": "string",
        "name": "did",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "signingPublicKey",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "encryptionPublicKey",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "wallet",
        "type": "address"
      },
      {
        "internalType": "enum SSI.Role",
        "name": "role",
        "type": "uint8"
      },
      {
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "isApproved",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "createdAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "updatedAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "revokedAt",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "createdByDid",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "revokedByDid",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "name": "verificationRequests",
    "outputs": [
      {
        "internalType": "string",
        "name": "verificationRequestId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "verifierDid",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "citizenDid",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "nonce",
        "type": "string"
      },
      {
        "internalType": "enum SSI.VerificationStatus",
        "name": "status",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "createdAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "expiresAt",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "fulfilled",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "verifications",
    "outputs": [
      {
        "internalType": "string",
        "name": "verificationId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "requestId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "approverDid",
        "type": "string"
      },
      {
        "internalType": "enum SSI.VerificationStatus",
        "name": "status",
        "type": "uint8"
      },
      {
        "internalType": "string",
        "name": "remarks",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "verifiedAt",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "presentationId",
        "type": "string"
      }
    ],
    "name": "verifyPresentation",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
