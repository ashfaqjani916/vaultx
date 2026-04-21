# SSI Contract Benchmarks

This directory contains tools for compiling and deploying the SSI (Self-Sovereign Identity) Solidity contract to a local Ganache blockchain for testing and benchmarking.

## Setup

### Prerequisites

- Python 3.9+
- Ganache (running on `http://127.0.0.1:7545`)

### Installation

1. Create and activate a Python virtual environment:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Files

- **compile.py** - Compiles SSI.sol using Solidity 0.8.19 and generates artifacts
- **test.py** - Deploys the compiled contract to Ganache and verifies deployment
- **SSI.sol** - The Solidity contract source code
- **requirements.txt** - Python package dependencies

## Workflow

### Step 1: Compile the Contract

```bash
source .venv/bin/activate
python compile.py
```

**Output artifacts:**

- `SSI_abi.json` - Contract ABI
- `SSI_bytecode.txt` - Contract bytecode
- `SSI_artifact.json` - Full compilation artifact

**Note:** The contract requires `viaIR: true` compilation flag due to stack depth constraints.

### Step 2: Start Ganache

Ensure Ganache is running on `http://127.0.0.1:7545`:

```bash
ganache-cli --host 0.0.0.0 --port 7545
```

Or use Ganache UI and configure it to listen on port 7545.

### Step 3: Deploy the Contract

```bash
source .venv/bin/activate
python test.py
```

**Expected output:**

```
Connecting to Ganache at http://127.0.0.1:7545...
✓ Connected to Ganache
Deployer account: 0x...

Deploying SSI...
✓ Contract deployed successfully!
  Deployed Address: 0x...
  Transaction Hash: 0x...
  Gas Used: 5350763
✓ Verification passed: Code exists at deployed address
```

## Troubleshooting

### "Could not connect to Ganache"

- Ensure Ganache is running on the correct URL: `http://127.0.0.1:7545`
- Check port 7545 is not blocked

### "No module named 'web3'" or "No module named 'solcx'"

- Reinstall dependencies: `pip install -r requirements.txt`

### Compilation errors about "Stack too deep"

- The compile.py uses `viaIR: true` to handle this automatically
- If you modify SSI.sol and get stack errors, ensure `viaIR` remains enabled

## Next Steps

Once deployment succeeds, you can:

- Extend test.py with benchmark functions (gas/timing measurements)
- Add more deployment and interaction tests
- Integrate with CI/CD pipelines for automated testing
