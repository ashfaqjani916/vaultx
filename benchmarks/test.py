import json
from pathlib import Path
from web3 import Web3

# Configuration
GANACHE_URL = "http://127.0.0.1:7545"
CONTRACT_NAME = "SSI"


def main():
    base_dir = Path(__file__).resolve().parent

    # Load compiled artifacts
    abi_path = base_dir / f"{CONTRACT_NAME}_abi.json"
    bytecode_path = base_dir / f"{CONTRACT_NAME}_bytecode.txt"

    if not abi_path.exists() or not bytecode_path.exists():
        print(f"Error: Artifacts not found. Run compile.py first.")
        return 1

    with abi_path.open("r") as f:
        abi = json.load(f)

    with bytecode_path.open("r") as f:
        bytecode = f.read()

    # Connect to Ganache
    print(f"Connecting to Ganache at {GANACHE_URL}...")
    w3 = Web3(Web3.HTTPProvider(GANACHE_URL))

    if not w3.is_connected():
        print("Error: Could not connect to Ganache. Is it running?")
        return 1

    print("✓ Connected to Ganache")

    # Get deployer account
    accounts = w3.eth.accounts
    if not accounts:
        print("Error: No accounts available in Ganache.")
        return 1

    deployer = accounts[0]
    print(f"Deployer account: {deployer}")

    # Create contract factory and deploy
    try:
        print(f"\nDeploying {CONTRACT_NAME}...")
        contract = w3.eth.contract(abi=abi, bytecode=bytecode)
        tx_hash = contract.constructor().transact({"from": deployer})

        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        deployed_address = receipt.contractAddress

        print(f"✓ Contract deployed successfully!")
        print(f"  Deployed Address: {deployed_address}")
        print(f"  Transaction Hash: {tx_hash.hex()}")
        print(f"  Gas Used: {receipt.gasUsed}")

        # Verify deployment by checking bytecode on chain
        code = w3.eth.get_code(deployed_address)
        if code and code != b"0x":
            print(f"✓ Verification passed: Code exists at deployed address")
        else:
            print(f"✗ Verification failed: No code at deployed address")
            return 1

        return 0

    except Exception as e:
        print(f"Error during deployment: {e}")
        return 1


if __name__ == "__main__":
    exit(main())
