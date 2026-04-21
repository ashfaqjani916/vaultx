# SSI Contract Benchmark Suite - Comprehensive Performance Testing

## Overview

This benchmark suite measures the performance of the SSI (Self-Sovereign Identity) smart contract across its complete lifecycle, with special focus on multi-approval scaling (RQ1).

## What's Measured

### 1. **Lifecycle-Based Performance** (Core Metrics)

The benchmarks measure the complete workflow:

| Stage                   | Function                                         | Metrics                                             |
| ----------------------- | ------------------------------------------------ | --------------------------------------------------- |
| **Registration**        | `registerUser()`                                 | Time (ms), Gas, Avg across iterations               |
| **Claim Request**       | `createClaimRequest()`                           | Time (ms), Gas, Request creation overhead           |
| **Multi-Approval**      | `submitApproval()` (loop)                        | **Time per approval, Total time, Gas per approval** |
| **Credential Issuance** | `_issueCredentialForRequest()`                   | Gas cost, Time from approval → issuance             |
| **Verification**        | `getPresentationHash()` + `verifyPresentation()` | Hash computation time, Total verification time      |
| **Revocation**          | `revokeCredential()`                             | Revocation cost, Lookup efficiency                  |

### 2. **Critical RQ1: Multi-Approval Scaling**

Tests approval efficiency with varying numbers of approvers:

```
Scenarios tested: 1, 2, 3, 5 approvers
Measurements:
- Time per approval (ms)
- Total approval cycle time
- Gas cost scaling (linear/quadratic analysis)
- Throughput (approvals/second)
```

### 3. **End-to-End Lifecycle**

Complete workflow from user registration through verification:

- Total lifecycle time
- Cumulative gas cost
- Stage breakdown

### 4. **Verification Complexity**

From Algorithm 5:

- Hash computation latency
- Signature recovery time
- Revocation lookup overhead

## How to Run

### Prerequisites

```bash
# Install dependencies
pip install -r requirements.txt

# Start Ganache (runs on localhost:7545)
ganache-cli --mnemonic "test test test test test test test test test test test junk" --accounts 20
```

### Run Benchmarks

```bash
# Compile the contract first
python compile.py

# Run full benchmark suite
python test.py
```

### Output

Results are saved to: `test_results/benchmark_results_YYYYMMDD_HHMMSS.json`

The JSON contains:

```json
{
  "metadata": {
    "timestamp": "2026-04-21T...",
    "contract": "SSI",
    "iterations": 5,
    "scaling_scenarios": [1, 2, 3, 5]
  },
  "operations": {
    "registration": {
      "avg_time_ms": 45.2,
      "avg_gas": 95824,
      "iterations": 5
    },
    "claim_request": {
      "avg_time_ms": 38.5,
      "avg_gas": 78450,
      "iterations": 5
    },
    "verification": {
      "avg_hash_time_ms": 0.125,
      "iterations": 5
    }
  },
  "lifecycle": {
    "end_to_end": {
      "avg_time_ms": 250.3,
      "avg_gas": 350000,
      "iterations": 5
    },
    "stages_summary": {
      "registration_avg_ms": 45.2,
      "claim_request_avg_ms": 38.5,
      "approval_avg_ms": 52.1,
      "verification_avg_ms": 0.125,
      "total_lifecycle_avg_ms": 250.3
    }
  },
  "scaling": {
    "1": {
      "num_approvers": 1,
      "avg_time_per_approval_ms": 48.3,
      "total_gas_scenario": 95000
    },
    "2": {
      "num_approvers": 2,
      "avg_time_per_approval_ms": 51.2,
      "total_gas_scenario": 185000
    },
    "3": {
      "num_approvers": 3,
      "avg_time_per_approval_ms": 53.8,
      "total_gas_scenario": 278000
    },
    "5": {
      "num_approvers": 5,
      "avg_time_per_approval_ms": 56.5,
      "total_gas_scenario": 465000
    }
  }
}
```

## Benchmark Metrics Explained

### Time Metrics

- **avg_time_ms**: Average transaction confirmation time in milliseconds
- **min_time_ms / max_time_ms**: Range for statistical confidence
- **iterations**: Number of runs averaged

### Gas Metrics

- **avg_gas**: Average gas per operation
- **total_gas_scenario**: Cumulative gas for multi-approval scenarios
- Direct correlation to on-chain cost

### Scaling Analysis

Key findings from multi-approval scaling:

- **Time complexity**: Measured as time/approval ratio
- **Gas complexity**: Cumulative gas usage
- **Throughput**: Approvals successfully processed per second
- **Scalability breaking point**: Where response time becomes unacceptable

## Contract Events Added

The SSI.sol contract now emits events for precise event-based timing:

```solidity
event UserRegistered(string indexed did, address indexed wallet, Role role, uint256 timestamp);
event ClaimRequestCreated(string indexed requestId, string indexed claimId, uint256 timestamp);
event ApproversAssigned(string indexed requestId, uint256 numberOfApprovers, uint256 timestamp);
event ApprovalSubmitted(string indexed requestId, string indexed approverDid, uint256 approvalsReceived, uint256 approvalsRequired, uint256 timestamp);
event CredentialIssued(string indexed credentialId, string indexed requestId, uint256 gasCost, uint256 timestamp);
event VerificationRequestCreated(string indexed verificationRequestId, uint256 timestamp);
event PresentationVerified(string indexed presentationId, bool verified, uint256 timestamp);
event CredentialRevoked(string indexed credentialId, uint256 timestamp);
```

These events can be used for more accurate post-hoc analysis of transaction receipts.

## Interpreting Results for Paper

### Table 1: Operation Costs

| Operation     | Avg Time (ms)    | Avg Gas | Unit Cost       |
| ------------- | ---------------- | ------- | --------------- |
| Registration  | avg_time_ms      | avg_gas | Baseline        |
| Claim Request | avg_time_ms      | avg_gas | +X% vs baseline |
| Verification  | avg_hash_time_ms | N/A     | View-only       |

### Chart 1: Lifecycle Breakdown

Use `stages_summary` to create bar chart:

- X-axis: Stage name
- Y-axis: Time (ms)
- Shows where bottlenecks are

### Chart 2: Approval Scaling (RQ1)

Use `scaling` field for multi-approval analysis:

- X-axis: Number of approvers (1, 2, 3, 5)
- Y-axis: Time per approval (ms) OR Total gas
- Demonstrates linear/quadratic scaling
- **This is your paper's core contribution**

### Chart 3: Traditional vs SSI Comparison

Compare your blockchain results:

| Metric            | Traditional DB | SSI Blockchain              |
| ----------------- | -------------- | --------------------------- |
| Identity creation | ~1-2ms         | avg_time_ms                 |
| Verification      | ~0.5ms         | avg_hash_time_ms            |
| Cost              | Infrastructure | avg_gas (convert to USD)    |
| Trust             | Centralized    | Multi-party (num_approvers) |

## Customization

Edit `test.py` to adjust:

```python
BENCHMARK_ITERATIONS = 5         # Number of repeats per test (increase for stability)
NUM_APPROVERS_OPTIONS = [1,2,3,5] # Scaling scenarios (test different numbers)
```

Increase iterations for production benchmarks (e.g., 20-50 runs).

## Troubleshooting

### "Could not connect to Ganache"

```bash
# Ensure Ganache is running
ganache-cli --mnemonic "test test test test test test test test test test test junk" --accounts 20
```

### "Artifacts not found"

```bash
# Compile the contract
python compile.py
```

### Gas estimation errors

Tests use dummy signatures (b'\x00' \* 65). For production:

1. Implement proper signing with ethers.js
2. Use real private keys per approver
3. Handle signature verification correctly

## Next Steps

1. **Run benchmarks** multiple times (different days) for statistical validity
2. **Analyze scaling** - create line chart showing time vs approvers
3. **Compare with baselines** - if you have traditional system, benchmark it too
4. **Document findings** - relate to your RQ1 and research questions

## Files Generated

After running `python test.py`:

```
benchmarks/
├── test_results/
│   ├── benchmark_results_20260421_150000.json  # Full results
│   ├── benchmark_results_20260421_152000.json  # Next run
│   └── ...
└── test.py (updated with this code)
```

Each JSON file is timestamped for easy tracking of performance over time.
