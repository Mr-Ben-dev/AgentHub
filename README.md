# 🤖 AgentHub

<div align="center">

**Verifiable AI Trading Agents on Linera Blockchain**

[![Linera](https://img.shields.io/badge/Linera-Conway%20Testnet-blue)](https://linera.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

*The first decentralized marketplace for AI trading agents with immutable, verifiable track records*

</div>

---

## 🎯 The Problem

In the world of AI trading signals and copy-trading:

- **No Verification** — Anyone can claim "95% win rate" with no proof
- **Fake Track Records** — Historical data can be fabricated or cherry-picked  
- **No Accountability** — Signal providers can delete losing trades
- **Trust Issues** — Followers have no way to verify past performance

## 💡 The Solution

**AgentHub** brings **trustless verification** to AI trading signals using Linera blockchain:

| Problem | AgentHub Solution |
|---------|-------------------|
| Fake stats | Every signal recorded on-chain with timestamp |
| Deleted losses | Immutable blockchain storage |
| Unverified claims | Real-time price oracle resolution |
| No accountability | Public, auditable track records |

---

## ✨ Key Features

### 🔗 On-Chain Signal Publishing
Every trading signal is published to Linera blockchain with:
- Entry price from real market data
- Direction (Long/Short)
- Confidence level (0-100%)
- Time horizon for resolution

### ⚡ Automatic Resolution
Signals auto-resolve when their time horizon expires:
- Current price fetched from CryptoCompare oracle
- Win/Loss calculated mathematically
- P&L recorded permanently on-chain
- Stats updated in real-time

### 📊 Verifiable Track Records
Complete transparency for every agent:
- Total signals published
- Win rate percentage
- Total P&L
- Best win / Worst loss
- All data verifiable on Linera

### 👥 Social Following
- Follow top-performing agents
- Real-time notifications
- Follower counts on-chain
- Future: Auto-copy trading

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                 │
│            React + TypeScript + TailwindCSS                     │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Pages     │  │ Components  │  │   Linera Integration    │ │
│  │             │  │             │  │                         │ │
│  │ • Explore   │  │ • AgentCard │  │ • ChainManager          │ │
│  │ • LiveFeed  │  │ • SignalCard│  │ • EvmChainSigner        │ │
│  │ • Rankings  │  │ • PriceDisp │  │ • GraphQL Operations    │ │
│  │ • MyAgents  │  │ • StatCard  │  │ • useChain Hook         │ │
│  │ • Detail    │  │ • Loading   │  │                         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└────────────────────────────┬───────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    BACKEND      │  │     LINERA      │  │   EXTERNAL      │
│    Express.js   │  │     CONWAY      │  │                 │
│                 │  │     TESTNET     │  │ • CryptoCompare │
│ • REST API      │  │                 │  │   (Prices)      │
│ • WebSocket     │  │ • Smart Contract│  │                 │
│ • Auto-Resolver │  │ • Microchains   │  │ • Dynamic.xyz   │
│ • Price Oracle  │  │ • WASM Runtime  │  │   (Wallet)      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 👤 User Flow

### 1️⃣ Connect Wallet
```
User visits AgentHub → Clicks "Connect Wallet" → Dynamic.xyz modal appears
→ Selects MetaMask/WalletConnect → Signs connection message
→ Linera WASM initializes → Microchain claimed from faucet
→ User is now "On-Chain" ✓
```

### 2️⃣ Become a Strategist
```
Navigate to "My Agents" → Click "Become a Strategist"
→ Enter display name → Sign with wallet
→ ON-CHAIN: RegisterStrategist operation executed
→ User can now create agents ✓
```

### 3️⃣ Create an AI Agent
```
Click "+ Create Agent" → Fill agent details:
  • Name: "BTC Alpha Hunter"
  • Description: "AI-powered BTC signals"
  • Market: Crypto
  • Visibility: Public
→ Submit → Sign with wallet
→ ON-CHAIN: CreateAgentStrategy operation
→ Agent appears in Explore page ✓
```

### 4️⃣ Publish a Signal
```
Open Agent Detail → Click "Publish Signal"
→ Select direction: Long (UP) or Short (DOWN)
→ Set confidence: 75%
→ Choose time horizon: 1 hour
→ Current BTC price captured: $97,350
→ Sign with wallet
→ ON-CHAIN: PublishSignal operation
→ Signal appears in Live Feed ✓
```

### 5️⃣ Signal Auto-Resolution
```
Time horizon expires (1 hour later)
→ Backend resolver checks every 30 seconds
→ Fetches current price: $97,850
→ Calculates: Long signal + price UP = WIN
→ P&L: +0.51%
→ ON-CHAIN: Stats updated
→ WebSocket broadcasts result
→ UI updates in real-time ✓
```

### 6️⃣ Follow an Agent
```
Browse Explore/Rankings → Find top agent
→ Click "Follow" → Sign with wallet
→ ON-CHAIN: FollowStrategy operation
→ Follower count increases
→ Receive signal notifications ✓
```

---

## 🔐 Wallet Signing Flow

Every on-chain operation requires cryptographic wallet signature:

```
User Action → Frontend prepares GraphQL mutation
                         ↓
              Linera Client receives mutation
                         ↓
              EvmChainSigner.sign() called
                         ↓
              Dynamic.xyz wallet popup
                         ↓
              User signs with MetaMask
                         ↓
              personal_sign returns signature
                         ↓
              Signature attached to operation
                         ↓
              Sent to user's Linera microchain
                         ↓
              Contract validates signer
                         ↓
              State updated on-chain ✓
```

---

## 🌟 Why Linera?

AgentHub showcases Linera's unique capabilities:

### ⚡ Microchains
Each user gets their own microchain:
- **Parallel execution** — No global bottleneck
- **Instant finality** — Signals recorded immediately
- **Scalable** — Millions of users, no slowdown

### 🔒 WebAssembly Contracts
Smart contracts compiled to WASM:
- **Memory safe** — Rust guarantees
- **Deterministic** — Same result everywhere
- **Portable** — Runs in browser + node

### 🌐 Cross-Chain Messages
Operations flow across chains:
- User publishes on their microchain
- Data syncs to application chain
- Other users see updates instantly

### 💰 Low Cost
Linera's architecture enables:
- **Free reads** — Query any data
- **Minimal writes** — Only mutations cost
- **No gas wars** — Predictable pricing

---

## ��️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Smart Contract** | Rust, Linera SDK, async-graphql |
| **Backend** | Node.js, Express, TypeScript, Socket.IO |
| **Frontend** | React 18, Vite, TypeScript, TailwindCSS |
| **Animations** | Framer Motion |
| **Wallet** | Dynamic.xyz SDK |
| **Blockchain** | Linera Conway Testnet |
| **Price Oracle** | CryptoCompare API |

---

## 📁 Project Structure

```
AgentHub/
├── contracts/agent_hub/          # Linera Smart Contract
│   └── src/
│       ├── lib.rs                # Types, enums, ABI
│       ├── contract.rs           # Operation handlers
│       ├── service.rs            # GraphQL queries
│       └── state.rs              # On-chain state
│
├── backend/                      # Express.js API
│   └── src/
│       ├── routes/api.ts         # REST endpoints
│       ├── services/
│       │   ├── resolver.ts       # Auto-resolution
│       │   └── priceService.ts   # Price fetching
│       ├── db/memory.ts          # Data layer
│       └── index.ts              # Entry point
│
└── frontend/                     # React Application
    └── src/
        ├── pages/                # Route pages
        ├── components/           # UI components
        ├── lib/chain/            # Linera integration
        └── App.tsx
```

---

## ⛓️ Smart Contract Operations

| Operation | Description | Signer Required |
|-----------|-------------|-----------------|
| `RegisterStrategist` | Register as signal provider | ✅ |
| `CreateAgentStrategy` | Create new AI agent | ✅ |
| `PublishSignal` | Publish trading signal | ✅ |
| `ResolveSignal` | Resolve with outcome | ✅ |
| `CancelSignal` | Cancel open signal | ✅ |
| `FollowStrategy` | Follow an agent | ✅ |
| `UnfollowStrategy` | Unfollow an agent | ✅ |
| `UpdateStats` | Update strategy statistics | ✅ |

---

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/stats` | Platform statistics |
| `GET` | `/api/prices` | Real-time BTC/ETH prices |
| `GET` | `/api/strategies` | List all strategies |
| `GET` | `/api/strategies/:id` | Get strategy details |
| `POST` | `/api/signals` | Publish signal |
| `GET` | `/api/feed` | Live signal feed |
| `GET` | `/api/rankings/top` | Leaderboard |
| `POST` | `/api/follow` | Follow strategy |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MetaMask or compatible wallet

### Installation

```bash
# Clone repository
git clone https://github.com/Mr-Ben-dev/AgentHub.git
cd AgentHub

# Install backend
cd backend && npm install

# Install frontend
cd ../frontend && npm install
```

### Run Development

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Access
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3002

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📜 License

MIT License

---

<div align="center">

**Built with ❤️ for the Linera Ecosystem**

</div>
