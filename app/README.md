# StealthPay App

The StealthPay web app — a Next.js 14 (App Router) + TypeScript + Tailwind
dashboard that runs a private **claim-pool** payroll cycle against the deployed
`stealth-payroll.clar` contract on Stacks testnet.

It has three surfaces:

| Route | Who | What |
|---|---|---|
| [`/dashboard`](./(app)/dashboard/page.tsx) | Employer | Create a cycle, add employees (masked amounts), deposit the pool, commit salaries, export the manifest, watch live totals. |
| [`/claim`](./(app)/claim/page.tsx) | Employee | Enter cycle ID + amount + nonce, get a live commitment preview, claim from the pool. |
| [`/verify`](./(app)/verify/page.tsx) | Auditor | Check a `(cycle, recipient, amount, nonce)` tuple against the on-chain commitment — a big **TRUE / FALSE**. |

> Read [`docs/SECURITY.md`](../docs/SECURITY.md) first. It defines exactly what
> StealthPay hides and what it does not. The UI copy never overclaims.

## The hash must match the contract

[`lib/hash.ts`](../lib/hash.ts) reproduces the contract's commitment
byte-for-byte:

```
commitment = sha256(
    serializeCV(principalCV(recipient))   // Clarity consensus buffer
  || serializeCV(uintCV(amount))          // Clarity consensus buffer
  || nonce                                // raw 16 bytes, no wrapping
)
```

Serialization goes through `@stacks/transactions` (`serializeCVBytes`) — never
hand-rolled — and sha256 comes from `@noble/hashes`.
[`tests/hash.test.ts`](../tests/hash.test.ts) asserts the canonical vector from
[`docs/CONTRACT.md`](../docs/CONTRACT.md) /
[`contracts/README.md`](../contracts/README.md):

```
recipient  : ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
amount     : u2000
nonce      : 0x000102030405060708090a0b0c0d0e0f
commitment : 0x4cf427427f24a4af9b37cbe4636bc5bf14b2c519478efa20693904ab70390d2f
```

Run it:

```bash
npm test
```

**If this test fails, the frontend and contract disagree and every claim will
fail. Fix it before shipping anything else.**

## Architecture

- **All contract calls live in [`lib/stacks.ts`](../lib/stacks.ts).** It owns the
  network, the contract address (from `NEXT_PUBLIC_CONTRACT_ADDRESS`), the
  function names, the read-only calls, and the post-condition builders. No
  component hardcodes an address.
- **Post-conditions are always explicit.** Deposit attaches "exactly the pool
  total leaves the employer"; claim attaches "exactly `amount` leaves the
  contract." Every token-moving tx uses `postConditionMode: "deny"` — never
  `"allow"`.
- **Wallet** via `@stacks/connect` v8 ([`components/app/WalletProvider.tsx`](../components/app/WalletProvider.tsx)),
  supporting Leather / Xverse.
- **Four visible states** on every call — idle, pending ("confirm in wallet"),
  success (Explorer link), error (human-readable) — via `TxStatus`
  ([`components/app/ui.tsx`](../components/app/ui.tsx)). Wallet-not-installed,
  wrong network, user-rejected, and insufficient-balance each get a specific
  message (`humanizeError` in `lib/stacks.ts`).

## Privacy hygiene (enforced)

- Salaries and nonces live in React state / session only. **Nothing leaves the
  browser.** No amount/nonce is logged to the console. Supabase is used **only**
  for the existing waitlist — never for salaries or nonces.
- Nonces are 16 bytes of `crypto.getRandomValues`, generated once per employee,
  uniqueness enforced client-side before commit.
- The manifest CSV (`employee_wallet, amount, nonce_hex, commitment_hex`) is
  built in-browser via a `Blob` ([`lib/manifest.ts`](../lib/manifest.ts)) with a
  loud warning that it reveals every salary — treat it like a password file.
- Copy never says "anonymous," "invisible," "zero-knowledge," or "untraceable."

## Live testnet deployment

The contracts are **already deployed and live on Stacks testnet**, and their
addresses are baked into [`lib/stacks.ts`](../lib/stacks.ts) as the app
defaults. End users do **not** configure a contract address — the app talks to
the live deployment out of the box.

| Contract | Principal |
|---|---|
| `stealth-payroll` | `ST1X5P65XY6D3TV0NK1WNGA1EXRAHRFEJDHAETBBV.stealth-payroll` |
| `mock-usdcx` | `ST1X5P65XY6D3TV0NK1WNGA1EXRAHRFEJDHAETBBV.mock-usdcx` |
| `sip-010-trait` | `ST1X5P65XY6D3TV0NK1WNGA1EXRAHRFEJDHAETBBV.sip-010-trait` |

Browse it on the [Hiro Explorer](https://explorer.hiro.so/address/ST1X5P65XY6D3TV0NK1WNGA1EXRAHRFEJDHAETBBV?chain=testnet).

## Setup

```bash
npm install
npm run dev     # http://localhost:3000  → /dashboard, /claim, /verify
npm run build   # production build + type check
npm test        # hash vector + helper tests
```

No contract configuration is required. The only `.env.local` values you need are
the Supabase waitlist keys (service key stays server-side, no `NEXT_PUBLIC_`
prefix). See [`.env.local.example`](../.env.local.example).

### Overriding the deployment (advanced)

The `NEXT_PUBLIC_CONTRACT_ADDRESS` / `NEXT_PUBLIC_MOCK_USDCX_ADDRESS` env vars
exist only as an override for a redeploy or a different network. They are the
full principal `address.name`; `lib/stacks.ts` uses the baked-in testnet
deployment when they are unset. Keep `NEXT_PUBLIC_NETWORK=testnet` until the
contract is audited.

## End-to-end demo flow (testnet)

1. **Employer** (`/dashboard`): connect wallet → create cycle → note the cycle
   ID from the confirmed tx → add 3 employees with amounts → deposit the pool →
   commit salaries → export the manifest CSV.
2. **Employee** (`/claim`): connect a different wallet → enter that wallet's
   cycle ID, amount, and nonce from the manifest → claim → see the Explorer
   link.
3. **Auditor** (`/verify`): paste a tuple → **TRUE**; change the amount →
   **FALSE**.

> Grant-stage, unaudited software. Do not use for real funds until it has had a
> professional security audit (see `docs/SECURITY.md`).
