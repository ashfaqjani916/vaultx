# VaultX SSI Platform

VaultX is a self-sovereign identity (SSI) application for issuing, approving, storing, and verifying decentralized identity claims. The repository is organized as a small full-stack system:

- A React dashboard for citizens, approvers, verifiers, and governance users.
- A Solidity smart contract that stores the core SSI state on chain.
- A Go API that acts as an encrypted private-key vault backed by MongoDB.
- Python benchmarking utilities for compiling and deploying the SSI contract to a local chain.

The app is built around role-based identity flows. Users connect a wallet, register a DID, generate signing/encryption keys, store encrypted private keys in the vault API, and then interact with on-chain claim and credential workflows through the frontend.

## Core Features

- Wallet login with MetaMask and Thirdweb.
- DID registration with role selection: citizen, approver, verifier, or governance.
- On-chain user, claim, claim request, credential, revocation, verification request, and presentation records.
- Governance screens for claim definitions and approval flows.
- Role-specific dashboards for citizens, approvers, and verifiers.
- Optional IPFS/Pinata upload helpers for credential and document metadata.
- Encrypted key storage API using AES-GCM with scrypt-derived keys.
- MongoDB persistence for vault records.
- Contract benchmarking and local deployment scripts.

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | Vite, React, TypeScript, React Router, TanStack Query |
| UI | Tailwind CSS, shadcn/ui-style Radix primitives, Lucide icons, Framer Motion |
| Wallet and chain access | Thirdweb, MetaMask |
| Smart contract | Solidity 0.8.19, Hardhat |
| Backend | Go, Gin, MongoDB driver |
| Database | MongoDB |
| Benchmarks | Python, web3.py, py-solc-x, Ganache |

## Repository Structure

```text
.
├── client/                 # Vite React frontend
│   ├── public/             # Static frontend assets
│   ├── src/
│   │   ├── components/     # Shared UI, layout, wallet, and display components
│   │   ├── hooks/          # Contract and user data hooks
│   │   ├── lib/            # Thirdweb config, SSI ABI/methods/parsers, IPFS helpers
│   │   ├── pages/          # Login, registration, dashboards, governance, workflows
│   │   ├── store/          # Zustand mock/demo state store
│   │   ├── test/           # Vitest setup and examples
│   │   └── types/          # Shared TypeScript domain types
│   ├── package.json        # Frontend scripts and dependencies
│   └── .env.example        # Frontend environment template
├── contract/               # Hardhat Solidity project
│   ├── contracts/SSI.sol   # Main SSI smart contract
│   ├── hardhat.config.js   # Solidity compiler configuration
│   └── package.json        # Contract build dependencies
├── server/                 # Go vault API
│   ├── cmd/main.go         # API entry point
│   ├── internal/config/    # Environment loading and validation
│   ├── internal/handler/   # Health and key vault HTTP handlers
│   ├── internal/server/    # Gin router and HTTP server setup
│   ├── pkg/db/             # MongoDB connection wrapper
│   ├── docs/swagger.yaml   # OpenAPI documentation
│   ├── docker-compose.yml  # API + MongoDB local stack
│   ├── Dockerfile          # API container image
│   └── Makefile            # Common backend commands
├── benchmarks/             # Contract compile/deploy benchmark tooling
│   ├── SSI.sol             # Benchmark copy of the contract
│   ├── compile.py          # Solidity compilation script
│   ├── test.py             # Local deployment/verification script
│   ├── requirements.txt    # Python dependencies
│   └── test_results/       # Benchmark output JSON files
├── check_flow.md           # Project flow notes
├── creds.md                # Local credential notes; do not commit real secrets
├── flowchart.json          # Flowchart/source diagram data
└── readme.md               # This file
```

Generated folders such as `client/dist`, `contract/artifacts`, `contract/cache`, `.cache`, and local package caches should be treated as build output rather than source.

## Prerequisites

- Node.js and npm for the frontend and contract projects.
- Go 1.25 or a compatible Go toolchain for the server.
- Docker and Docker Compose for the easiest local MongoDB setup.
- MetaMask browser extension for frontend wallet flows.
- A Thirdweb client ID.
- A deployed `SSI.sol` contract address on the configured chain, or a local/testnet deployment.
- Optional: Python 3.9+, Ganache, and `pip` for benchmark scripts.
- Optional: Pinata JWT if you want IPFS upload flows to work.

## Frontend Setup

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

The Vite dev server will print the local URL, usually `http://localhost:5173`.

### Frontend Environment Variables

`client/.env.example` contains the core chain and Thirdweb settings:

```env
VITE_THIRDWEB_CLIENT_ID=
VITE_SSI_CONTRACT_ADDRESS=
VITE_SSI_CHAIN_ID=11155111
```

Additional variables used by the codebase:

```env
# Go vault API base URL. Defaults to http://localhost:8080.
VITE_VAULT_API_URL=http://localhost:8080

# Optional Pinata/IPFS support.
VITE_PINATA_JWT=
VITE_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs

# Optional Thirdweb SIWE backend.
VITE_THIRDWEB_AUTH_BASE_URL=http://localhost:3000

# Optional wallet configuration.
VITE_THIRDWEB_LOGIN_METHODS=google,email,passkey
VITE_THIRDWEB_AUTH_MODE=popup
VITE_THIRDWEB_EXTERNAL_WALLETS=io.metamask,com.coinbase.wallet
```

## Backend Setup

The server exposes:

- `GET /health`
- `POST /api/v1/keys`
- `GET /api/v1/keys?public_key=...&password=...`

The key vault stores encrypted private keys in MongoDB. Private keys are encrypted with AES-GCM, using a key derived from the user-provided password with scrypt.

### Run With Docker Compose

```bash
cd server
touch .env
```

Use this minimal `server/.env`:

```env
APP_NAME=server
APP_ENV=development
APP_PORT=8080
DATABASE_URL=mongodb://mongo:27017
DATABASE_NAME=ssi
DATABASE_COLLECTION=vault_keys
```

Then start the stack:

```bash
make docker-up
```

### Run Locally Without Docker

Start MongoDB locally, then create `server/.env`:

```env
APP_NAME=server
APP_ENV=development
APP_PORT=8080
DATABASE_URL=mongodb://localhost:27017
DATABASE_NAME=ssi
DATABASE_COLLECTION=vault_keys
```

Run the API:

```bash
cd server
make run
```

## Smart Contract Setup

```bash
cd contract
npm install
npm run build
```

The contract source is [contract/contracts/SSI.sol](contract/contracts/SSI.sol). The Hardhat config compiles Solidity `0.8.19` with optimizer enabled and `viaIR: true`.

This package currently includes a compile script only. For deployments, add a Hardhat deploy script or use the benchmark deployment flow in `benchmarks/`.

## Benchmark Setup

The benchmark tools compile and deploy the SSI contract against Ganache on `http://127.0.0.1:7545`.

```bash
cd benchmarks
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python compile.py
```

Start Ganache:

```bash
ganache-cli --host 0.0.0.0 --port 7545
```

Deploy and verify:

```bash
python test.py
```

See [benchmarks/README.md](benchmarks/README.md) for benchmark-specific details.

## Common Commands

### Client

```bash
cd client
npm run dev        # Start Vite dev server
npm run build      # Build production assets
npm run lint       # Run ESLint
npm run test       # Run Vitest
npm run preview    # Preview production build
```

### Server

```bash
cd server
make run           # Run API
make build         # Build binary into server/bin
make test          # Run Go tests with race detection and coverage
make test-coverage # Generate HTML coverage report
make fmt           # Format Go code
make tidy          # Tidy Go modules
make docker-up     # Start API and MongoDB
make docker-down   # Stop API and MongoDB
```

### Contract

```bash
cd contract
npm run build      # Compile SSI.sol
```

## Suggested Local Development Flow

1. Start the vault API and MongoDB from `server/`.
2. Compile or deploy the SSI contract from `contract/` or `benchmarks/`.
3. Put the deployed contract address and chain ID in `client/.env`.
4. Start the React app from `client/`.
5. Connect MetaMask and register a user.
6. Use the appropriate role dashboard to create, approve, issue, or verify claims.

## Testing

Before opening a pull request, run the checks relevant to the code you touched:

```bash
cd client && npm run lint && npm run test && npm run build
cd ../server && make test
cd ../contract && npm run build
```

For benchmark changes, also run:

```bash
cd benchmarks
source .venv/bin/activate
python compile.py
python test.py
```

## Contribution Guidelines

### Branching and Commits

- Create a focused branch for each feature or fix.
- Keep commits small and descriptive.
- Avoid committing generated output unless it is intentionally part of the change.
- Do not commit real credentials, private keys, wallet seed phrases, JWTs, or production `.env` files.

### Code Style

- Follow the existing project structure before introducing new abstractions.
- Keep React components typed and focused on one responsibility.
- Put reusable frontend logic in `client/src/hooks` or `client/src/lib`.
- Keep shared domain types in `client/src/types`.
- Format Go code with `make fmt`.
- Keep smart contract changes explicit and covered by compile/deployment checks.

### Security Expectations

- Treat private keys and passwords as sensitive data.
- Never log private keys, passwords, JWTs, or decrypted secrets.
- Validate API input and return clear error messages without leaking internals.
- Review smart contract storage and role checks carefully when changing authorization logic.
- Update `.env.example` files whenever a new environment variable is required.

### Pull Request Checklist

- Describe the problem and the solution.
- Include screenshots or screen recordings for visible UI changes.
- Note any contract migrations, deployment steps, or environment changes.
- Run the relevant test/build commands and mention the results.
- Update this README or module-level docs when setup or behavior changes.

## Notes and Known Gaps

- The frontend has a mix of active on-chain flows and mock/demo store data. Check whether a page uses `useOnchain*` hooks or `useVaultStore` before assuming data is persisted.
- The contract package currently compiles the contract but does not include deployment scripts.
- `client/.env.example` does not currently list every optional variable used by the app; see the frontend environment section above.
- `creds.md` exists in the repo root. Keep real secrets out of committed files and prefer local `.env` files.
