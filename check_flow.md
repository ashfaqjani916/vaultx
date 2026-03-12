# End-to-End Check Flow

This document lists the full contract interaction flow, with inputs and verification checks.

## Legend
- `Step N` is an action call.
- `Check` is the expected state/result after the preceding call(s).

## User Registration
1. **Step 1 — registerUser (Governance)**
   - Input: `["did:gov:001","govSignPubKey123","govEncPubKey123","0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",3,true,1700000000,1700000000,0,"",""]`

2. **Step 2 — registerUser (Approver 1)**
   - Input: `["did:approver:001","approver1SignKey","approver1EncKey","0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",1,true,1700000000,1700000000,0,"did:gov:001",""]`

3. **Step 3 — registerUser (Approver 2)**
   - Input: `["did:approver:002","approver2SignKey","approver2EncKey","0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB",1,true,1700000000,1700000000,0,"did:gov:001",""]`

4. **Step 4 — registerUser (Citizen)**
   - Input: `["did:citizen:001","citizenSignKey","citizenEncKey","0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB",0,true,1700000000,1700000000,0,"did:gov:001",""]`

5. **Step 5 — registerUser (Verifier)**
   - Input: `["did:verifier:001","verifierSignKey","verifierEncKey","0x1aE0EA34a72D944a8C7603FfB3eC30a6669E454C",2,true,1700000000,1700000000,0,"did:gov:001",""]`

6. **Step 6 — getUser (verify governance)**
   - Input: `"did:gov:001"`
   - Check: `role = 3, active = true`

7. **Step 7 — getUser (verify citizen)**
   - Input: `"did:citizen:001"`
   - Check: `role = 0, active = true`

## Claim Definition
8. **Step 8 — createClaim**
   - Input: `["claim:national-id:001","NationalID","National Identity Credential",true,true,false,false,2,0,1700000000,0,"did:gov:001",""]`

9. **Step 9 — approveClaim**
   - Input: `"claim:national-id:001" "did:gov:001"`

10. **Step 10 — getClaim (verify)**
    - Input: `"claim:national-id:001"`
    - Check: `status = 1 (ACTIVE), approvedByDid = did:gov:001`

## Claim Request
11. **Step 11 — createClaimRequest**
    - Input: `["req:001","claim:national-id:001","did:citizen:001","QmDocHash123abc","QmPhotoHash456def","","",0,[],"",1700000000,1700000000,1999999999]`

12. **Step 12 — getClaimRequest (verify)**
    - Input: `"req:001"`
    - Check: `status = 0 (PENDING)`

13. **Step 13 — reviewClaimRequest (Approver 1)**
    - Input: `"req:001" "did:approver:001"`

14. **Step 14 — reviewClaimRequest (Approver 2)**
    - Input: `"req:001" "did:approver:002"`

15. **Step 15 — getApprovals (verify)**
    - Input: `"req:001"`
    - Check: `two entries, both approved = false`

16. **Step 16 — approveClaimRequest (Approver 1)**
    - Input: `"req:001" "did:approver:001"`

17. **Step 17 — approveClaimRequest (Approver 2)**
    - Note: credential auto-issued here
    - Input: `"req:001" "did:approver:002"`

18. **Step 18 — getClaimRequest (verify)**
    - Input: `"req:001"`
    - Check: `status = 3 (ISSUED)`

19. **Step 19 — getApprovals (verify)**
    - Input: `"req:001"`
    - Check: `both entries now show approved = true`

20. **Step 20 — getCredential (verify)**
    - Input: `"cred_req:001"`
    - Check: `status = 0 (ACTIVE), signatures array has two entries`

21. **Step 21 — getCredentialsByCitizen (verify)**
    - Input: `"did:citizen:001"`
    - Check: `returns array with one credential, credentialId = cred_req:001`

## Verification Request & Presentation
22. **Step 22 — createVerificationRequest**
    - Input: `["vreq:001","did:verifier:001","did:citizen:001",["claim:national-id:001"],0,1700000000,1999999999]`

23. **Step 23 — getVerificationRequest (verify)**
    - Input: `"vreq:001"`
    - Check: `status = 0 (REQUESTED), verifierDid = did:verifier:001`

24. **Step 24 — submitPresentation**
    - Input: `["pres:001","vreq:001","did:citizen:001","did:verifier:001",["cred_req:001"],"signedProof","nonce_abc123",1700000000,1999999999]`

25. **Step 25 — verifyPresentation**
    - Input: `"pres:001"`
    - Check: `returns true`

## Verifications & Revocation
26. **Step 26 — submitVerification**
    - Input: `["verif:001","req:001","did:approver:001",1,"All documents verified and valid",1700000100]`

27. **Step 27 — getVerificationsForRequest (verify)**
    - Input: `"req:001"`
    - Check: `one entry, status = 1 (APPROVED)`

28. **Step 28 — revokeCredential**
    - Input: `["cred_req:001","did:gov:001","Document found to be fraudulent",1700005000]`

29. **Step 29 — isCredentialRevoked (verify)**
    - Input: `"cred_req:001"`
    - Check: `returns true`

30. **Step 30 — getCredential (verify revocation)**
    - Input: `"cred_req:001"`
    - Check: `status = 1 (REVOKED)`

## Deactivation
31. **Step 31 — deactivateUser**
    - Input: `"did:citizen:001"`

32. **Step 32 — getUser (verify deactivation)**
    - Input: `"did:citizen:001"`
    - Check: `active = false, revokedAt is set to a non-zero timestamp`
