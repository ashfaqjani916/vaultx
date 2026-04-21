import json
import time
import os
from pathlib import Path
from datetime import datetime
from web3 import Web3
from eth_account.messages import encode_defunct
from eth_account import Account
from eth_keys import keys
from typing import Dict, List, Tuple
import statistics

Account.enable_unaudited_hdwallet_features()

# Configuration
GANACHE_URL = os.getenv("GANACHE_URL", "http://127.0.0.1:7545")
CONTRACT_NAME = "SSI"
BENCHMARK_ITERATIONS = 5  # Number of iterations for averaging
NUM_APPROVERS_OPTIONS = [1, 2, 3, 5]  # Scaling scenarios


class SSIBenchmark:
    def __init__(self):
        self.base_dir = Path(__file__).resolve().parent
        self.w3 = None
        self.contract = None
        self.deployer = None
        
        # Standard Ganache mnemonic for account derivation
        self.MNEMONIC = "test test test test test test test test test test test junk"
        
        # Cache for derived accounts (Account objects with private keys)
        self.account_pool = {
            "deployer": None,
            "citizens": [],
            "approvers": [],
            "verifiers": []
        }
        
        # Account cache: maps role to list of (account_address, Account) tuples
        self.account_cache = {
            "deployer": None,
            "citizens": [],
            "approvers": [],
            "verifiers": []
        }
        
        # DID cache: maps DID to account address to avoid re-registration
        self.did_cache = {}
        
        self.results = {
            "metadata": {},
            "lifecycle": {},
            "operations": {},
            "scaling": {},
            "verification": {}
        }
        self.lifecycle_metrics = {
            "registration": [],
            "claim_request": [],
            "approval": [],
            "issuance": [],
            "verification": [],
            "total_lifecycle": []
        }
        self.test_results_dir = self.base_dir / "test_results"
        self.account_index = 1  # Track account allocation

    def connect(self) -> bool:
        """Connect to Ganache and setup web3"""
        print(f"Connecting to Ganache at {GANACHE_URL}...")
        self.w3 = Web3(Web3.HTTPProvider(GANACHE_URL))

        if not self.w3.is_connected():
            print("Error: Could not connect to Ganache. Is it running?")
            return False

        print("✓ Connected to Ganache")
        return True

    def load_contract_artifacts(self) -> Tuple[dict, str]:
        """Load compiled contract artifacts"""
        abi_path = self.base_dir / f"{CONTRACT_NAME}_abi.json"
        bytecode_path = self.base_dir / f"{CONTRACT_NAME}_bytecode.txt"

        if not abi_path.exists() or not bytecode_path.exists():
            print(f"Error: Artifacts not found. Run compile.py first.")
            return None, None

        with abi_path.open("r") as f:
            abi = json.load(f)

        with bytecode_path.open("r") as f:
            bytecode = f.read()

        return abi, bytecode

    def deploy_contract(self) -> bool:
        """Deploy SSI contract to Ganache"""
        abi, bytecode = self.load_contract_artifacts()
        if not abi or not bytecode:
            return False

        accounts = self.w3.eth.accounts
        if not accounts:
            print("Error: No accounts available in Ganache.")
            return False

        self.deployer = accounts[0]
        print(f"Deployer account: {self.deployer}")

        try:
            print(f"\nDeploying {CONTRACT_NAME}...")
            start_deploy = time.time()
            # Derive local signing accounts before deployment so we can use the canonical deployer.
            self._initialize_account_pool()
            deployer_addr = self.account_pool["deployer"].address

            contract_factory = self.w3.eth.contract(abi=abi, bytecode=bytecode)
            tx_hash = contract_factory.constructor().transact({"from": deployer_addr})
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            deploy_time = (time.time() - start_deploy) * 1000
            deployed_address = receipt.contractAddress

            print(f"✓ Contract deployed successfully!")
            print(f"  Address: {deployed_address}")
            print(f"  Gas Used: {receipt.gasUsed}")
            print(f"  Deployment Time: {deploy_time:.2f}ms")

            self.contract = self.w3.eth.contract(address=deployed_address, abi=abi)
            self.deployer = deployer_addr

            return True

        except Exception as e:
            print(f"Error during deployment: {e}")
            return False

    def _initialize_account_pool(self):
        """Initialize account pool by deriving from mnemonic"""
        print(f"  Deriving accounts from mnemonic...")
        
        # Derive 20 accounts from the standard Ganache mnemonic
        # Ganache uses BIP44 path: m/44'/60'/0'/0/index
        for i in range(20):
            account = Account.from_mnemonic(
                self.MNEMONIC,
                account_path=f"m/44'/60'/0'/0/{i}"
            )
            
            if i == 0:
                self.account_pool["deployer"] = account
            elif i < 6:
                self.account_pool["citizens"].append(account)
            elif i < 16:
                self.account_pool["approvers"].append(account)
            else:
                self.account_pool["verifiers"].append(account)
        
        # Copy to cache for allocation
        self.account_cache["deployer"] = self.account_pool["deployer"]
        self.account_cache["citizens"] = list(self.account_pool["citizens"])
        self.account_cache["approvers"] = list(self.account_pool["approvers"])
        self.account_cache["verifiers"] = list(self.account_pool["verifiers"])
        
        print(f"  ✓ Derived 20 accounts (1 deployer, 5 citizens, 10 approvers, 4 verifiers)")

    def _allocate_account(self, role: str) -> Tuple[str, Account]:
        """Allocate next available account for given role, returns (address, Account)"""
        if role == "citizen" and self.account_cache["citizens"]:
            account = self.account_cache["citizens"].pop(0)
            return account.address, account
        elif role == "approver" and self.account_cache["approvers"]:
            account = self.account_cache["approvers"].pop(0)
            return account.address, account
        elif role == "verifier" and self.account_cache["verifiers"]:
            account = self.account_cache["verifiers"].pop(0)
            return account.address, account
        else:
            # Fallback: return deployer
            return self.account_pool["deployer"].address, self.account_pool["deployer"]

    def _sign_message(self, message_hash_bytes: bytes, account: Account) -> bytes:
        """Sign a message locally using the account's private key"""
        try:
            # Create signed message with Ethereum prefix
            message = encode_defunct(primitive=message_hash_bytes)
            signed = account.sign_message(message)
            return signed.signature
        except Exception as e:
            print(f"  Warning: Local signing failed ({e})")
            return b'\x00' * 65

    def measure_transaction(self, description: str, tx_hash) -> Dict:
        """Measure transaction time and gas"""
        try:
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            gas_used = receipt.gasUsed
            return {
                "success": True,
                "gas": gas_used,
                "tx_hash": tx_hash.hex() if hasattr(tx_hash, 'hex') else str(tx_hash)
            }
        except Exception as e:
            print(f"Error measuring {description}: {e}")
            return {"success": False, "gas": 0}

    def benchmark_registration(self, iterations: int = BENCHMARK_ITERATIONS) -> Dict:
        """Benchmark user registration lifecycle"""
        print("\n═══════════════════════════════════════════════════════════════")
        print("BENCHMARK: USER REGISTRATION")
        print("═══════════════════════════════════════════════════════════════")

        registration_times = []
        registration_gas = []

        for i in range(iterations):
            account_address, account = self._allocate_account("citizen")
            did = f"did:ssi:benchmark_citizen_{int(time.time() * 1000)}_{i}"
            
            # Skip if already registered
            if did in self.did_cache:
                print(f"  Iteration {i+1}: Skipped (already registered)")
                continue
            
            try:
                start = time.time()
                tx_hash = self.contract.functions.registerUser(
                    did,
                    f"signing_key_{i}",
                    f"encryption_key_{i}",
                    0  # CITIZEN role
                ).transact({"from": account_address})

                result = self.measure_transaction("registerUser", tx_hash)
                elapsed = (time.time() - start) * 1000

                registration_times.append(elapsed)
                registration_gas.append(result["gas"])
                
                # Cache the registration
                self.did_cache[did] = account_address
                
                print(f"  Iteration {i+1}: {elapsed:.2f}ms | Gas: {result['gas']}")

            except Exception as e:
                print(f"  Error in iteration {i+1}: {e}")

        stats = {
            "avg_time_ms": statistics.mean(registration_times) if registration_times else 0,
            "min_time_ms": min(registration_times) if registration_times else 0,
            "max_time_ms": max(registration_times) if registration_times else 0,
            "avg_gas": statistics.mean(registration_gas) if registration_gas else 0,
            "iterations": len(registration_times)
        }
        print(f"  Average Time: {stats['avg_time_ms']:.2f}ms")
        print(f"  Average Gas: {stats['avg_gas']:.0f}")

        self.lifecycle_metrics["registration"] = registration_times
        return stats

    def setup_approvers_with_unique_dids(self, num_approvers: int, scenario_id: int) -> List[Tuple[str, str, Account]]:
        """Setup approver accounts and DIDs with unique identifiers per scenario"""
        approvers = []

        for i in range(num_approvers):
            account_address, account = self._allocate_account("approver")
            # Use scenario_id to ensure unique DIDs across different approval scaling tests
            approver_did = f"did:ssi:approver_scen{scenario_id}_{i}_{int(time.time() * 1000)}"
            
            # Skip if already registered
            if approver_did in self.did_cache:
                approvers.append((approver_did, account_address, account))
                continue
            
            try:
                tx_hash = self.contract.functions.registerUser(
                    approver_did,
                    f"approver_signing_{i}",
                    f"approver_encryption_{i}",
                    1  # APPROVER role
                ).transact({"from": account_address})
                self.w3.eth.wait_for_transaction_receipt(tx_hash)
                
                # Cache the registration
                self.did_cache[approver_did] = account_address
                approvers.append((approver_did, account_address, account))
            except Exception as e:
                print(f"Error registering approver {i}: {e}")

        return approvers

    def benchmark_claim_request(self, citizen_account_addr: str, citizen_did: str, iterations: int = BENCHMARK_ITERATIONS) -> Dict:
        """Benchmark claim request creation"""
        print("\n═══════════════════════════════════════════════════════════════")
        print("BENCHMARK: CLAIM REQUEST CREATION")
        print("═══════════════════════════════════════════════════════════════")

        claim_request_times = []
        claim_request_gas = []
        claim_id = f"claim_benchmark_{int(time.time() * 1000)}"

        # First create the claim at governance level (use unique claim ID)
        try:
            tx_hash = self.contract.functions.createClaim(
                claim_id,
                "benchmark_claim_type",
                "Benchmark claim for testing",
                True, False, False, False,  # requirements
                2  # numberOfApprovalsNeeded
            ).transact({"from": self.deployer})
            self.w3.eth.wait_for_transaction_receipt(tx_hash)
        except Exception as e:
            print(f"Error creating claim: {e}")

        for i in range(iterations):
            request_id = f"request_{int(time.time() * 1000)}_{i}"
            try:
                start = time.time()
                tx_hash = self.contract.functions.createClaimRequest(
                    request_id,
                    claim_id,
                    citizen_did,
                    f"doc_hash_{i}",
                    f"photo_hash_{i}",
                    f"geo_hash_{i}",
                    f"bio_hash_{i}",
                    int(time.time()) + 86400  # 1 day expiry
                ).transact({"from": citizen_account_addr})

                result = self.measure_transaction("createClaimRequest", tx_hash)
                elapsed = (time.time() - start) * 1000

                claim_request_times.append(elapsed)
                claim_request_gas.append(result["gas"])
                print(f"  Iteration {i+1}: {elapsed:.2f}ms | Gas: {result['gas']}")

            except Exception as e:
                print(f"  Error in iteration {i+1}: {e}")

        stats = {
            "avg_time_ms": statistics.mean(claim_request_times) if claim_request_times else 0,
            "avg_gas": statistics.mean(claim_request_gas) if claim_request_gas else 0,
            "iterations": len(claim_request_times)
        }
        print(f"  Average Time: {stats['avg_time_ms']:.2f}ms")
        print(f"  Average Gas: {stats['avg_gas']:.0f}")

        self.lifecycle_metrics["claim_request"] = claim_request_times
        return stats

    def benchmark_approval_scaling(self) -> Dict:
        """Benchmark multi-approval scaling - CORE CONTRIBUTION"""
        print("\n═══════════════════════════════════════════════════════════════")
        print("BENCHMARK: MULTI-APPROVAL SCALING (RQ1)")
        print("═══════════════════════════════════════════════════════════════")

        scaling_results = {}
        
        # Register a citizen for this scaling test
        citizen_account = self._allocate_account("citizen")
        citizen_did = f"did:ssi:scaling_citizen_{int(time.time() * 1000)}"
        try:
            tx_hash = self.contract.functions.registerUser(
                citizen_did,
                "scaling_signing",
                "scaling_encryption",
                0  # CITIZEN role
            ).transact({"from": citizen_account})
            self.w3.eth.wait_for_transaction_receipt(tx_hash)
            self.did_cache[citizen_did] = citizen_account
        except Exception as e:
            print(f"Error registering citizen for scaling: {e}")
            citizen_did = None

        if not citizen_did:
            print("Failed to register citizen for scaling test")
            return {}

    def benchmark_approval_scaling(self) -> Dict:
        """Benchmark multi-approval scaling - CORE CONTRIBUTION"""
        print("\n═══════════════════════════════════════════════════════════════")
        print("BENCHMARK: MULTI-APPROVAL SCALING (RQ1)")
        print("═══════════════════════════════════════════════════════════════")

        scaling_results = {}
        
        # Register a citizen for this scaling test
        citizen_account_addr, citizen_account_obj = self._allocate_account("citizen")
        citizen_did = f"did:ssi:scaling_citizen_{int(time.time() * 1000)}"
        try:
            tx_hash = self.contract.functions.registerUser(
                citizen_did,
                "scaling_signing",
                "scaling_encryption",
                0  # CITIZEN role
            ).transact({"from": citizen_account_addr})
            self.w3.eth.wait_for_transaction_receipt(tx_hash)
            self.did_cache[citizen_did] = citizen_account_addr
        except Exception as e:
            print(f"Error registering citizen for scaling: {e}")
            citizen_did = None

        if not citizen_did:
            print("Failed to register citizen for scaling test")
            return {}

        scenario_id = 0
        for num_approvers in NUM_APPROVERS_OPTIONS:
            print(f"\n--- Testing with {num_approvers} approvers ---")
            scenario_id += 1
            
            # Setup approvers with unique DIDs
            approvers = self.setup_approvers_with_unique_dids(num_approvers, scenario_id)
            print(f"  Set up {len(approvers)} approvers")

            # Time per approval
            approval_times = []
            approval_gas = []
            total_gas_for_scenario = 0

            for iteration in range(BENCHMARK_ITERATIONS):
                request_id = f"scaling_{num_approvers}_{iteration}_{int(time.time() * 1000)}"
                claim_id = f"claim_approval_scen{scenario_id}_{iteration}"

                try:
                    # Create unique claim if needed
                    try:
                        tx_hash = self.contract.functions.createClaim(
                            claim_id,
                            f"claim_type_scen{scenario_id}",
                            f"Test claim with {num_approvers} approvers",
                            True, False, False, False,
                            num_approvers
                        ).transact({"from": self.deployer})
                        self.w3.eth.wait_for_transaction_receipt(tx_hash)
                    except:
                        pass

                    # Create claim request
                    try:
                        tx_hash = self.contract.functions.createClaimRequest(
                            request_id,
                            claim_id,
                            citizen_did,
                            f"doc_hash",
                            f"photo_hash",
                            f"geo_hash",
                            f"bio_hash",
                            int(time.time()) + 86400
                        ).transact({"from": citizen_account_addr})
                        self.w3.eth.wait_for_transaction_receipt(tx_hash)
                    except Exception as e:
                        print(f"    Error creating claim request: {e}")
                        continue

                    # Assign approvers
                    try:
                        approver_dids = [did for did, _, _ in approvers]
                        tx_hash = self.contract.functions.assignApproversToRequest(
                            request_id,
                            approver_dids
                        ).transact({"from": self.deployer})
                        self.w3.eth.wait_for_transaction_receipt(tx_hash)
                    except Exception as e:
                        print(f"    Error assigning approvers: {e}")
                        continue

                    # Measure approval flow with proper signing
                    approval_start = time.time()

                    for approver_idx, (approver_did, approver_addr, approver_account) in enumerate(approvers):
                        try:
                            # Get message hash from contract
                            message_hash = self.contract.functions.getMessageHash(
                                request_id,
                                claim_id,
                                citizen_did
                            ).call()

                            # Sign using local signing
                            start_approval = time.time()
                            
                            # Convert to bytes if needed
                            if isinstance(message_hash, str):
                                message_hash_bytes = bytes.fromhex(message_hash[2:] if message_hash.startswith("0x") else message_hash)
                            elif isinstance(message_hash, bytes):
                                message_hash_bytes = message_hash
                            else:
                                message_hash_bytes = bytes.fromhex(message_hash.hex())
                            
                            # Use local signing with account's private key
                            signature = self._sign_message(message_hash_bytes, approver_account)

                            # Submit approval with proper signature
                            tx_hash = self.contract.functions.submitApproval(
                                request_id,
                                signature
                            ).transact({"from": approver_addr})

                            result = self.measure_transaction("submitApproval", tx_hash)
                            approval_elapsed = (time.time() - start_approval) * 1000

                            if result["success"]:
                                approval_times.append(approval_elapsed)
                                approval_gas.append(result["gas"])
                                total_gas_for_scenario += result["gas"]
                                print(f"    Approver {approver_idx+1}/{num_approvers}: {approval_elapsed:.2f}ms | Gas: {result['gas']}")
                            else:
                                print(f"    Error with approver {approver_idx}: Transaction failed")

                        except Exception as e:
                            print(f"    Error with approver {approver_idx}: {str(e)[:100]}")

                    approval_end = time.time()
                    total_approval_time = (approval_end - approval_start) * 1000
                    print(f"  Total approval cycle time: {total_approval_time:.2f}ms")

                except Exception as e:
                    print(f"  Error in scaling iteration {iteration}: {str(e)[:100]}")

            # Calculate stats for this scenario
            if approval_times:
                scaling_results[num_approvers] = {
                    "num_approvers": num_approvers,
                    "avg_time_per_approval_ms": statistics.mean(approval_times),
                    "total_time_for_all_approvals_ms": sum(approval_times),
                    "avg_gas_per_approval": statistics.mean(approval_gas) if approval_gas else 0,
                    "total_gas_scenario": total_gas_for_scenario,
                    "iterations": iteration + 1
                }
                print(f"  Summary for {num_approvers} approvers:")
                print(f"    Avg time/approval: {scaling_results[num_approvers]['avg_time_per_approval_ms']:.2f}ms")
                print(f"    Total gas: {total_gas_for_scenario}")

        self.lifecycle_metrics["approval"] = approval_times if approval_times else []
        return scaling_results

    def benchmark_verification(self, iterations: int = BENCHMARK_ITERATIONS) -> Dict:
        """Benchmark verification operations"""
        print("\n═══════════════════════════════════════════════════════════════")
        print("BENCHMARK: VERIFICATION OPERATIONS")
        print("═══════════════════════════════════════════════════════════════")

        hash_times = []
        recovery_times = []

        for i in range(iterations):
            try:
                # Benchmark getPresentationHash
                start = time.time()
                hash_result = self.contract.functions.getPresentationHash(
                    f"pres_{i}",
                    f"verif_req_{i}",
                    [f"cred_{i}"],
                    "did:ssi:citizen_0",
                    "did:ssi:verifier_0",
                    f"nonce_{i}"
                ).call()
                hash_time = (time.time() - start) * 1000
                hash_times.append(hash_time)
                print(f"  Iteration {i+1} - Hash computation: {hash_time:.4f}ms")

            except Exception as e:
                print(f"  Error in verification iteration {i}: {e}")

        stats = {
            "avg_hash_time_ms": statistics.mean(hash_times) if hash_times else 0,
            "min_hash_time_ms": min(hash_times) if hash_times else 0,
            "max_hash_time_ms": max(hash_times) if hash_times else 0,
            "iterations": len(hash_times)
        }

        print(f"  Average hash computation: {stats['avg_hash_time_ms']:.4f}ms")

        self.lifecycle_metrics["verification"] = hash_times
        return stats

    def benchmark_end_to_end_lifecycle(self, iterations: int = BENCHMARK_ITERATIONS) -> Dict:
        """Benchmark complete lifecycle: Registration → Claim → Approval → Issuance → Verification"""
        print("\n═══════════════════════════════════════════════════════════════")
        print("BENCHMARK: END-TO-END LIFECYCLE")
        print("═══════════════════════════════════════════════════════════════")

        lifecycle_times = []
        lifecycle_gas = []

        for iteration in range(iterations):
            print(f"\n  Iteration {iteration + 1}/{iterations}")
            lifecycle_start = time.time()
            total_gas = 0

            try:
                # Stage 1: Registration (Citizen)
                citizen_account = self._allocate_account("citizen")
                citizen_did = f"did:ssi:e2e_citizen_{int(time.time() * 1000)}_{iteration}"

                reg_tx = self.contract.functions.registerUser(
                    citizen_did,
                    f"signing_{iteration}",
                    f"encryption_{iteration}",
                    0  # CITIZEN
                ).transact({"from": citizen_account})
                reg_receipt = self.w3.eth.wait_for_transaction_receipt(reg_tx)
                total_gas += reg_receipt.gasUsed
                self.did_cache[citizen_did] = citizen_account

                # Stage 2: Claim Request
                claim_id = f"lifecycle_claim_e2e_{int(time.time() * 1000)}_{iteration}"
                try:
                    claim_tx = self.contract.functions.createClaim(
                        claim_id,
                        "lifecycle_type",
                        "End-to-end lifecycle test",
                        True, False, False, False, 1  # 1 approval needed
                    ).transact({"from": self.deployer})
                    self.w3.eth.wait_for_transaction_receipt(claim_tx)
                except:
                    pass

                request_id = f"e2e_request_{int(time.time() * 1000)}_{iteration}"
                req_tx = self.contract.functions.createClaimRequest(
                    request_id,
                    claim_id,
                    citizen_did,
                    f"doc_{iteration}",
                    f"photo_{iteration}",
                    f"geo_{iteration}",
                    f"bio_{iteration}",
                    int(time.time()) + 86400
                ).transact({"from": citizen_account})
                req_receipt = self.w3.eth.wait_for_transaction_receipt(req_tx)
                total_gas += req_receipt.gasUsed

                # Stage 3: Register Approver
                approver_account = self._allocate_account("approver")
                approver_did = f"did:ssi:e2e_approver_{int(time.time() * 1000)}_{iteration}"

                try:
                    app_reg_tx = self.contract.functions.registerUser(
                        approver_did,
                        f"app_signing_{iteration}",
                        f"app_encryption_{iteration}",
                        1  # APPROVER
                    ).transact({"from": approver_account})
                    app_receipt = self.w3.eth.wait_for_transaction_receipt(app_reg_tx)
                    total_gas += app_receipt.gasUsed
                    self.did_cache[approver_did] = approver_account
                except Exception as e:
                    print(f"    Error registering approver: {str(e)[:100]}")

                # Stage 3b: Assign Approver
                assign_tx = self.contract.functions.assignApproversToRequest(
                    request_id,
                    [approver_did]
                ).transact({"from": self.deployer})
                assign_receipt = self.w3.eth.wait_for_transaction_receipt(assign_tx)
                total_gas += assign_receipt.gasUsed

                # Stage 4: Approval & Issuance (with proper signing)
                try:
                    # Get message hash
                    message_hash = self.contract.functions.getMessageHash(
                        request_id,
                        claim_id,
                        citizen_did
                    ).call()

                    # Sign with personal_sign
                    if isinstance(message_hash, str):
                        message_hash_bytes = bytes.fromhex(message_hash[2:] if message_hash.startswith("0x") else message_hash)
                    elif isinstance(message_hash, bytes):
                        message_hash_bytes = message_hash
                    else:
                        message_hash_bytes = bytes.fromhex(message_hash.hex())
                    
                    signature = self._sign_message(message_hash_bytes, approver_account)

                    # Submit approval
                    approval_tx = self.contract.functions.submitApproval(
                        request_id,
                        signature
                    ).transact({"from": approver_account})
                    approval_receipt = self.w3.eth.wait_for_transaction_receipt(approval_tx)
                    total_gas += approval_receipt.gasUsed
                except Exception as e:
                    print(f"    Approval skipped: {str(e)[:100]}")

                lifecycle_end = time.time()
                lifecycle_ms = (lifecycle_end - lifecycle_start) * 1000
                lifecycle_times.append(lifecycle_ms)
                lifecycle_gas.append(total_gas)

                print(f"    Time: {lifecycle_ms:.2f}ms | Total Gas: {total_gas}")

            except Exception as e:
                print(f"    Error in lifecycle iteration {iteration}: {e}")

        stats = {
            "avg_time_ms": statistics.mean(lifecycle_times) if lifecycle_times else 0,
            "avg_gas": statistics.mean(lifecycle_gas) if lifecycle_gas else 0,
            "min_time_ms": min(lifecycle_times) if lifecycle_times else 0,
            "max_time_ms": max(lifecycle_times) if lifecycle_times else 0,
            "iterations": len(lifecycle_times)
        }

        print(f"  Average End-to-End Time: {stats['avg_time_ms']:.2f}ms")
        print(f"  Average Gas: {stats['avg_gas']:.0f}")

        self.lifecycle_metrics["total_lifecycle"] = lifecycle_times
        return stats

    def generate_timestamp_filename(self) -> str:
        """Generate timestamped filename for results"""
        now = datetime.now()
        timestamp = now.strftime("%Y%m%d_%H%M%S")
        return f"benchmark_results_{timestamp}.json"

    def compile_results(self) -> Dict:
        """Compile all benchmark results"""
        results = {
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "contract": CONTRACT_NAME,
                "ganache_url": GANACHE_URL,
                "iterations": BENCHMARK_ITERATIONS,
                "scaling_scenarios": NUM_APPROVERS_OPTIONS
            },
            "operations": {
                "registration": self.results["operations"].get("registration", {}),
                "claim_request": self.results["operations"].get("claim_request", {}),
                "verification": self.results["operations"].get("verification", {})
            },
            "lifecycle": {
                "end_to_end": self.results["lifecycle"].get("end_to_end", {}),
                "stages_summary": {
                    "registration_avg_ms": statistics.mean(self.lifecycle_metrics["registration"]) if self.lifecycle_metrics["registration"] else 0,
                    "claim_request_avg_ms": statistics.mean(self.lifecycle_metrics["claim_request"]) if self.lifecycle_metrics["claim_request"] else 0,
                    "approval_avg_ms": statistics.mean(self.lifecycle_metrics["approval"]) if self.lifecycle_metrics["approval"] else 0,
                    "verification_avg_ms": statistics.mean(self.lifecycle_metrics["verification"]) if self.lifecycle_metrics["verification"] else 0,
                    "total_lifecycle_avg_ms": statistics.mean(self.lifecycle_metrics["total_lifecycle"]) if self.lifecycle_metrics["total_lifecycle"] else 0
                }
            },
            "scaling": self.results["scaling"],
            "lifecycle_metrics_raw": self.lifecycle_metrics
        }

        return results

    def save_results(self, results: Dict) -> str:
        """Save results to JSON file with timestamp"""
        filename = self.generate_timestamp_filename()
        filepath = self.test_results_dir / filename

        with open(filepath, "w") as f:
            json.dump(results, f, indent=2)

        print(f"\n✓ Results saved to: {filepath}")
        return str(filepath)

    def run_full_benchmark(self):
        """Run complete benchmark suite"""
        print("\n╔═════════════════════════════════════════════════════════════════╗")
        print("║                   SSI CONTRACT BENCHMARK SUITE                 ║")
        print("║                  Lifecycle Performance Testing                 ║")
        print("╚═════════════════════════════════════════════════════════════════╝")

        if not self.connect():
            return False

        if not self.deploy_contract():
            return False

        try:
            # Run benchmarks
            self.results["operations"]["registration"] = self.benchmark_registration()

            # Prepare citizen account for claim request benchmarking
            citizen_account_addr, citizen_account_obj = self._allocate_account("citizen")
            citizen_did = f"did:ssi:benchmark_citizen_{int(time.time() * 1000)}"

            # Register the citizen
            try:
                tx_hash = self.contract.functions.registerUser(
                    citizen_did,
                    "benchmark_signing_key",
                    "benchmark_encryption_key",
                    0  # CITIZEN role
                ).transact({"from": citizen_account_addr})
                self.w3.eth.wait_for_transaction_receipt(tx_hash)
                self.did_cache[citizen_did] = citizen_account_addr
            except Exception as e:
                print(f"Error registering benchmark citizen: {e}")

            self.results["operations"]["claim_request"] = self.benchmark_claim_request(citizen_account_addr, citizen_did)
           
            self.results["scaling"] = self.benchmark_approval_scaling()
            
            self.results["operations"]["verification"] = self.benchmark_verification()
            
            self.results["lifecycle"]["end_to_end"] = self.benchmark_end_to_end_lifecycle()

            # Compile and save results
            final_results = self.compile_results()
            filepath = self.save_results(final_results)

            # Print summary
            self.print_summary(final_results)

            return True

        except Exception as e:
            print(f"Error during benchmark: {e}")
            import traceback
            traceback.print_exc()
            return False

    def print_summary(self, results: Dict):
        """Print summary of benchmark results"""
        print("\n╔═════════════════════════════════════════════════════════════════╗")
        print("║                     BENCHMARK SUMMARY REPORT                   ║")
        print("╚═════════════════════════════════════════════════════════════════╝")

        print("\n📊 OPERATION METRICS:")
        print(f"  Registration:")
        if results["operations"]["registration"]:
            print(f"    Avg Time: {results['operations']['registration'].get('avg_time_ms', 0):.2f}ms")
            print(f"    Avg Gas: {results['operations']['registration'].get('avg_gas', 0):.0f}")

        print(f"  Claim Request:")
        if results["operations"]["claim_request"]:
            print(f"    Avg Time: {results['operations']['claim_request'].get('avg_time_ms', 0):.2f}ms")
            print(f"    Avg Gas: {results['operations']['claim_request'].get('avg_gas', 0):.0f}")

        print(f"  Verification:")
        if results["operations"]["verification"]:
            print(f"    Avg Hash Time: {results['operations']['verification'].get('avg_hash_time_ms', 0):.4f}ms")

        print("\n📈 LIFECYCLE METRICS:")
        lifecycle_summary = results["lifecycle"]["stages_summary"]
        for stage, time_ms in lifecycle_summary.items():
            if time_ms > 0:
                print(f"  {stage}: {time_ms:.2f}ms")

        print("\n📊 MULTI-APPROVAL SCALING (RQ1):")
        for num_approvers, metrics in results["scaling"].items():
            print(f"  {num_approvers} Approvers:")
            print(f"    Avg Time/Approval: {metrics.get('avg_time_per_approval_ms', 0):.2f}ms")
            print(f"    Total Gas: {metrics.get('total_gas_scenario', 0)}")

        print(f"\n✓ Full results saved to test_results/")


def main():
    benchmark = SSIBenchmark()
    success = benchmark.run_full_benchmark()
    return 0 if success else 1


if __name__ == "__main__":
    exit(main())
