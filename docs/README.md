# StealthPay

**Fully on-chain private payroll on Stacks. Pay everyone. Show no one.**

StealthPay lets companies run payroll in USDCx and sBTC on the Stacks Bitcoin L2 while keeping the salary roster and per-person comparison off the public ledger. It uses a **claim-pool** design: the employer deposits one pooled total, commits each salary as a `sha256` fingerprint, and each employee claims their own amount in a separate transaction by revealing a secret nonce.

> **Read `SECURITY.md` before writing a single line.** It defines exactly what is and is not private. Every design decision in this repo follows from that boundary. Do not add features or copy that overclaim privacy.

---

## The one-paragraph mental model

There is no side-by-side batch payout. The employer funds a pool. Salaries live as hashes on-chain, never as readable numbers. Employees withdraw themselves, one at a time, proving their entitlement with a secret only they and the employer hold. An outside observer sees a pool go in and separate withdrawals come out — never a roster that maps names or wallets to salaries, and never a single transaction they can open to read the whole team's pay.

---

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │            EMPLOYER (browser)            │
                    │                                          │
                    │  salaries + nonces live here ONLY        │
                    │  never sent to any server                │
                    │  exported as an encrypted CSV manifest   │
                    └───────────────┬──────────────────────────┘
                                    │
              create-cycle          │  commit-salaries (hashes only)
              deposit (pool total)  │
                                    ▼
        ┌───────────────────────────────────────────────────────┐
        │            stealth-payroll.clar  (on Stacks)           │
        │                                                        │
        │   • pooled escrow (total only, never the split)        │
        │   • map of sha256 commitments  { claimed: bool }       │
        │   • NO readable salary amounts in state                │
        │   • SIP-010 transfers for USDCx / sBTC                 │
        └───────────────┬───────────────────────────────────────┘
                        │  claim(amount, nonce)  ← proven per employee
                        ▼
        ┌───────────────────────────────────────────────────────┐
        │   EMPLOYEE (browser)          AUDITOR (browser)        │
        │   connects wallet, claims     verify-commitment()      │
        │   own salary from the pool    TRUE / FALSE, read-only  │
        └───────────────────────────────────────────────────────┘
```

---

## Repo layout

```
stealthpay/
├── contracts/                     # Clarinet project (the source of truth)
│   ├── contracts/
│   │   ├── stealth-payroll.clar
│   │   ├── mock-usdcx.clar         # SIP-010 mock for testnet/local
│   │   └── traits/sip-010-trait.clar
│   ├── tests/
│   │   └── stealth-payroll.test.ts
│   ├── Clarinet.toml
│   ├── README.md                   # ← CONTRACT.md content lives here
│   └── SECURITY.md
│
└── app/                           # Next.js 14 dashboard
    ├── app/
    │   ├── dashboard/page.tsx      # employer
    │   ├── claim/page.tsx          # employee
    │   └── verify/page.tsx         # auditor
    ├── lib/
    │   ├── stacks.ts               # network + contract call helpers
    │   └── hash.ts                 # commitment hash — MUST match contract
    ├── tests/hash.test.ts
    └── README.md                   # ← FRONTEND.md content lives here
```

---

## The single most important rule in this codebase

**The commitment hash must be byte-for-byte identical in the contract and the frontend.**

The contract computes `sha256(preimage)` and the frontend must reproduce the exact same preimage bytes, or every claim will fail verification. The canonical serialization is defined once in `contracts/README.md` under "Commitment construction" and referenced everywhere else. Never redefine it. There is a shared test vector (a known principal + amount + nonce → known hash) checked in both the Clarity tests and the frontend `hash.test.ts`. If either drifts, CI fails.

---

## Build order (do not reorder)

1. **Contract first.** Scaffold the Clarinet project, write `stealth-payroll.clar` + `mock-usdcx.clar`, get all tests green, lock the commitment serialization and publish the test vector.
2. **Deploy to testnet.** Record the contract address.
3. **Frontend second.** Build the app against the deployed address. Import the test vector into `hash.test.ts` and confirm it matches before wiring any claim flow.
4. **End-to-end demo.** deposit → commit → claim → verify, on testnet, recorded.

---

## Quick start

```bash
# contracts
cd contracts
clarinet check
clarinet test
clarinet deployments generate --testnet --low-cost
clarinet deployments apply --testnet

# app
cd ../app
cp .env.local.example .env.local     # fill NEXT_PUBLIC_CONTRACT_ADDRESS
npm install
npm run dev
```

---

## What this grant funds (delta)

Partial contract and dashboard scaffolds exist today alongside the live landing page and waitlist. This grant funds hardening the claim-pool contract (tests, edge cases, testnet deployment), wiring the dashboard end-to-end, and onboarding real pilot teams to run live payroll cycles.

---

## Honesty policy

StealthPay's credibility rests on being precise about privacy. Anywhere the product speaks — landing page, dashboard, docs, grant replies — the claim is the same: **roster and side-by-side comparison are hidden; an individual's own claim amount is visible at claim time; no zero-knowledge is claimed.** If a proposed feature or line of copy contradicts `SECURITY.md`, the copy is wrong, not the security doc.
