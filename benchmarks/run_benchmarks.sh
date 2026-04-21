#!/bin/bash
# QUICK START - Run Benchmarks in 3 Steps

echo "╔═════════════════════════════════════════════════════════════════╗"
echo "║           SSI CONTRACT BENCHMARK - QUICK START                 ║"
echo "╚═════════════════════════════════════════════════════════════════╝"
echo ""

# Pick Python interpreter (prefer project virtualenv if present)
if [ -x ".venv/bin/python" ]; then
    PYTHON_BIN=".venv/bin/python"
elif command -v python >/dev/null 2>&1; then
    PYTHON_BIN="python"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
else
    echo "❌ Python is not installed"
    exit 1
fi

# STEP 1: Start Ganache
echo "STEP 1: Starting Ganache (ensure it runs on localhost:8545 or 7545)"
echo "   Run in a separate terminal:"
if command -v ganache-cli >/dev/null 2>&1; then
    echo "   $ ganache-cli --mnemonic \"test test test test test test test test test test test junk\" --accounts 20 --chain.allowUnlimitedContractSize true"
elif command -v ganache >/dev/null 2>&1; then
    echo "   $ ganache --wallet.mnemonic \"test test test test test test test test test test test junk\" --wallet.totalAccounts 20 --chain.allowUnlimitedContractSize true"
else
    echo "   Ganache CLI not found. Install Ganache or use:"
    echo "   $ npx ganache --wallet.mnemonic \"test test test test test test test test test test test junk\" --wallet.totalAccounts 20 --chain.allowUnlimitedContractSize true"
fi
echo ""
read -p "Press Enter when Ganache is running..."

detect_rpc() {
    local url="$1"
    "$PYTHON_BIN" - "$url" <<'PY' >/dev/null 2>&1
import json
import sys
import urllib.request

url = sys.argv[1]
payload = json.dumps({"jsonrpc": "2.0", "method": "web3_clientVersion", "params": [], "id": 1}).encode()
req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req, timeout=1.5) as resp:
        body = resp.read().decode("utf-8", errors="ignore")
    if '"result"' in body:
        sys.exit(0)
except Exception:
    pass
sys.exit(1)
PY
}

# Resolve RPC URL: respect pre-set GANACHE_URL, otherwise auto-detect common ports.
if [ -z "$GANACHE_URL" ]; then
    has_7545=0
    has_8545=0

    if detect_rpc "http://127.0.0.1:7545"; then
        has_7545=1
    fi
    if detect_rpc "http://127.0.0.1:8545"; then
        has_8545=1
    fi

    if [ "$has_8545" -eq 1 ] && [ "$has_7545" -eq 1 ]; then
        echo "Warning: Both :7545 and :8545 are reachable. Defaulting to :8545."
        echo "Set GANACHE_URL explicitly if you want a different endpoint."
        GANACHE_URL="http://127.0.0.1:8545"
    elif [ "$has_8545" -eq 1 ]; then
        GANACHE_URL="http://127.0.0.1:8545"
    elif [ "$has_7545" -eq 1 ]; then
        GANACHE_URL="http://127.0.0.1:7545"
    else
        GANACHE_URL="http://127.0.0.1:8545"
    fi
fi

echo "Using RPC endpoint: $GANACHE_URL"

# Ensure Python dependencies are installed
echo ""
echo "STEP 1.5: Checking Python dependencies..."
$PYTHON_BIN -c "import solcx" >/dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Installing benchmark requirements..."
    $PYTHON_BIN -m pip --version >/dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo "pip not found for $PYTHON_BIN, attempting bootstrap..."
        $PYTHON_BIN -m ensurepip --upgrade >/dev/null 2>&1
    fi

    $PYTHON_BIN -m pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Python requirements"
        echo "   Use a virtual environment with pip, for example:"
        echo "   python3 -m venv .venv && source .venv/bin/activate"
        echo "   python -m pip install -r requirements.txt"
        exit 1
    fi
fi
echo "✓ Python dependencies ready"

# STEP 2: Compile
echo ""
echo "STEP 2: Compiling contract..."
$PYTHON_BIN compile.py

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed"
    exit 1
fi

echo "✓ Compilation successful"
echo ""

# STEP 3: Run benchmarks
echo "STEP 3: Running full benchmark suite..."
echo "This will take ~2-3 minutes..."
GANACHE_URL="$GANACHE_URL" $PYTHON_BIN test.py

if [ $? -ne 0 ]; then
    echo "❌ Benchmarks failed"
    exit 1
fi

echo ""
echo "╔═════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ BENCHMARKS COMPLETE                      ║"
echo "╚═════════════════════════════════════════════════════════════════╝"
echo ""
echo "Results saved to: test_results/"
echo ""
echo "To view results:"
echo "  $ ls -lt test_results/"
echo "  $ cat test_results/benchmark_results_*.json | jq ."
echo ""
echo "For detailed info, see: BENCHMARK_README.md"
