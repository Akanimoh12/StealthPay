# FRONTEND.md — StealthPay App Reference

The StealthPay web app is a Next.js 14 (App Router) + TypeScript + Tailwind dashboard with three surfaces: **employer** (`/dashboard`), **employee** (`/claim`), and **auditor** (`/verify`). It talks to the deployed `stealth-payroll.clar` on Stacks testnet.

> Build this **after** the contract is deployed. Import the shared test vector from `CONTRACT.md` into `hash.test.ts` and confirm it matches before wiring any claim flow. A mismatched hash means every claim silently fails.

---

## Non-negotiable: the hash must match the contract

`lib/hash.ts` reproduces the contract's commitment byte-for-byte:

```ts
import { sha256 } from '@noble/hashes/sha256';
import { serializeCV, principalCV, uintCV } from '@stacks/transactions';

// order + serialization MUST match CONTRACT.md "Canonical commitment construction"
export function computeCommitment(recipient: string, amount: bigint, nonce: Uint8Array): Uint8Array {
  const recipientBytes = serializeCV(principalCV(recipient));
  const amountBytes    = serializeCV(uintCV(amount));
  const preimage = new Uint8Array([...recipientBytes, ...amountBytes, ...nonce]);
  return sha256(preimage);
}
```

`tests/hash.test.ts` asserts the shared vector from `CONTRACT.md`. CI fails if it drifts.

---

## Stack

- `@stacks/connect` — wallet auth (Leather / Xverse)
- `@stacks/transactions`, `@stacks/network` — contract calls, CV serialization, post-conditions
- `@noble/hashes` — sha256 (same lib feel as the serialization path)
- Tailwind + `next/font` (Inter)
- Supabase **only** for the existing waitlist. **Never** store salaries or nonces server-side.

---

## Design tokens (match the landing page)

```
--bg:        #FAFAFA
--surface:   #FFFFFF
--text:      #1A1A1A
--muted:     #6B6B6B
--border:    #E0E0E0
--accent:    #E8632A   /* Stacks orange */
--accent-2:  #FC6432
```

Buttons: solid accent, **ALL-CAPS**, letter-spaced. Cards: rounded, soft border, gentle shadow. Generous whitespace. Masked salary values render as `••••••` like the landing hero.

---

## Pages

### `/dashboard` — Employer
Flow: connect wallet → create cycle (pick token) → add employees (wallet + amount, amount masked in UI) → **Deposit** (pool total) → **Commit** (client-side hashes → `commit-salaries`) → **Export manifest CSV**.

- Amounts + nonces live in React state / session only. Generate nonces with `crypto.getRandomValues(new Uint8Array(16))`, unique per employee.
- Manifest CSV columns: `employee_wallet, amount, nonce_hex, commitment_hex`. Warn loudly that this file reveals all salaries — treat like a password file.
- Show live cycle totals (deposited / claimed / remaining) from read-only calls.
- Attach the deposit post-condition (exactly the total leaves the employer).

### `/claim` — Employee
Flow: connect wallet → enter cycle-id + amount + nonce (from employer) → **Claim** → success + Explorer link.

- Recompute the commitment client-side for instant feedback before submitting.
- Attach the claim post-condition (exactly `amount` leaves the contract to the employee).
- Distinct error states: invalid proof, already claimed, wrong network.

### `/verify` — Auditor
Flow: enter cycle-id + recipient + amount + nonce → read-only `verify-commitment` → big **TRUE / FALSE**. This is the "prove payment without publishing the salary" moment — make it visually clean and satisfying.

---

## Frontend best practices

**Contract calls**
- Centralize all calls in `lib/stacks.ts`. One place sets network (testnet), contract address (from `NEXT_PUBLIC_CONTRACT_ADDRESS`), and function names. No inline contract addresses in components.
- Always set explicit **post-conditions** on transfers. Never send a token-moving tx with post-condition mode "allow."
- Serialize Clarity values with the same `@stacks/transactions` helpers used in `hash.ts` — do not hand-roll byte encoding.

**State & UX**
- Every contract call has four visible states: idle, pending (with a spinner + "confirm in wallet"), success (with Explorer tx link), error (with a human-readable reason). No silent failures.
- Handle: wallet not installed, wrong network, user-rejected tx, insufficient balance. Each gets a specific message.
- Optimistic UI is fine for display, but always reconcile against a read-only call after confirmation.

**Security & privacy hygiene**
- No salary or nonce ever leaves the browser. No logging of amounts/nonces to console in production. No analytics on salary fields.
- The manifest download is generated in-browser (Blob), never round-tripped through a server.
- Show the honest privacy note (from `SECURITY.md`) in-app. Never render copy that says "anonymous," "invisible," "zero-knowledge," or "untraceable."
- Validate addresses and amounts before building a tx; reject empty/zero/negative amounts client-side.

**Accessibility & responsiveness**
- Semantic HTML, labelled inputs, keyboard-navigable, visible focus states, mobile-first.

**Config**
- `.env.local.example`: `NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_NETWORK=testnet`, plus existing Supabase waitlist keys (server-side service key never exposed to client).

---

## Demo acceptance (what "done" means)

A reviewer can, on testnet, independently:
1. Connect an employer wallet, create a cycle, deposit a pool, commit 3 salaries, export the manifest.
2. Switch to an employee wallet and claim one salary using the manifest values.
3. Open `/verify`, paste a tuple, and get **TRUE**; paste a wrong amount and get **FALSE**.

Prioritize this end-to-end flow over polish — but keep it clean and on-brand. Record it as the Milestone 2 demo video.

---

## Build order recap

1. `lib/hash.ts` + `tests/hash.test.ts` → confirm shared vector matches the contract. **Stop here until it does.**
2. `lib/stacks.ts` (network, address, call helpers, post-condition builders).
3. `/dashboard` → `/claim` → `/verify`.
4. End-to-end testnet run → record demo.
