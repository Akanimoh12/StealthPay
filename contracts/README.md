# StealthPay Contracts

Fully on-chain **claim-pool** private payroll for Stacks, written in Clarity 3
and tested with the Clarinet SDK + Vitest.

The privacy model, threat model, and the non-negotiable security invariants live
in [SECURITY.md](./SECURITY.md) (copied here unchanged). The interface spec is in
[../docs/CONTRACT.md](../docs/CONTRACT.md). **Read SECURITY.md first.** This
README documents how to build/test/deploy and — most importantly — the
**canonical commitment serialization** the frontend must reproduce byte-for-byte.

## Contracts

| Contract | Purpose |
|---|---|
| [`contracts/traits/sip-010-trait.clar`](./contracts/traits/sip-010-trait.clar) | Standard SIP-010 fungible-token trait. |
| [`contracts/mock-usdcx.clar`](./contracts/mock-usdcx.clar) | Minimal SIP-010 token with a **test-only** unrestricted `mint`, so tests and testnet demos work without real USDCx. The core contract behaves identically against this and any real SIP-010 token. |
| [`contracts/stealth-payroll.clar`](./contracts/stealth-payroll.clar) | The core claim-pool contract. |

## The claim-pool model (do not change)

1. The employer `create-cycle`s and `deposit`s the **total** payroll as one
   pooled sum. Only the aggregate ever hits the chain.
2. The employer `commit-salaries` — one `sha256` commitment per employee. **No
   readable per-person amount is ever stored.**
3. Each employee `claim`s their own amount in a **separate transaction** by
   revealing their secret 16-byte nonce. The contract recomputes the hash with
   `tx-sender` and pays out from the pool. There is no side-by-side batch payout.

## Canonical commitment serialization (THE spec)

```
commitment = sha256( recipient-bytes || amount-bytes || nonce-bytes )
```

where `||` is raw byte concatenation, in this exact order:

| Field | Serialization | Notes |
|---|---|---|
| `recipient-bytes` | `to-consensus-buff?(principal)` | Clarity consensus buffer of the `principal`. In JS: `serializeCV(principalCV(recipient))`. |
| `amount-bytes` | `to-consensus-buff?(uint)` | Clarity consensus buffer of the `uint` (17 bytes: `0x01` tag + 16-byte big-endian value). In JS: `serializeCV(uintCV(amount))`. |
| `nonce-bytes` | raw `(buff 16)` | Used **as-is**, no wrapping, no length prefix. 16 bytes of CSPRNG output. |

On-chain this is the single hashing code path, reused by both `claim` and
`verify-commitment`:

```clarity
(define-read-only (compute-commitment (recipient principal) (amount uint) (nonce (buff 16)))
  (sha256
    (concat
      (concat
        (unwrap-panic (to-consensus-buff? recipient))
        (unwrap-panic (to-consensus-buff? amount)))
      nonce)))
```

### Canonical test vector (asserted in the test suite)

Generated once from the on-chain `compute-commitment` and cross-checked against
the JS `serializeCV` reproduction. **The frontend `hash.ts` must reproduce this
exactly** — if it produces a different hash, the build is broken.

```
recipient : ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
amount    : u2000
nonce     : 0x000102030405060708090a0b0c0d0e0f

recipient-bytes : 051a6d78de7b0625dfbfc16c3a8a5735f6dc3dc3f2ce
amount-bytes    : 01000000000000000000000000000007d0
nonce-bytes     : 000102030405060708090a0b0c0d0e0f
preimage        : 051a6d78de7b0625dfbfc16c3a8a5735f6dc3dc3f2ce01000000000000000000000000000007d0000102030405060708090a0b0c0d0e0f

=> commitment : 0x4cf427427f24a4af9b37cbe4636bc5bf14b2c519478efa20693904ab70390d2f
```

Reference JS reproduction (this is what `app/lib/hash.ts` should do):

```ts
import { Cl, serializeCV } from "@stacks/transactions";
import { createHash } from "node:crypto"; // or a browser sha256

const preimage = Buffer.concat([
  Buffer.from(serializeCV(Cl.principal(recipient)), "hex"),
  Buffer.from(serializeCV(Cl.uint(amount)), "hex"),
  nonce, // raw 16 bytes
]);
const commitment = "0x" + createHash("sha256").update(preimage).digest("hex");
```

> Note: `serializeCV` returns a hex string in `@stacks/transactions` v7. On
> older majors it may return a `Buffer`/`Uint8Array` — concatenate the bytes
> either way; the resulting preimage must equal the `preimage` above.

The vector is asserted in
[`tests/stealth-payroll.test.ts`](./tests/stealth-payroll.test.ts) both on-chain
(via `compute-commitment`) and off-chain (via
[`tests/commitment.ts`](./tests/commitment.ts)), so any drift fails CI. Mirror
the same assertion in `app/tests/hash.test.ts`.

## Interface

### Public

| Function | Caller | Effect |
|---|---|---|
| `(create-cycle (token <sip-010>))` | employer | new cycle owned by `tx-sender`, returns `cycle-id` |
| `(deposit (cycle-id uint) (amount uint) (token <sip-010>))` | owner | pulls `amount` into escrow, adds to `total-deposited` |
| `(commit-salaries (cycle-id uint) (list 50 (buff 32)))` | owner | stores commitments as unclaimed, sets status `committed` |
| `(claim (cycle-id uint) (amount uint) (nonce (buff 16)) (token <sip-010>))` | employee | recomputes hash with `tx-sender`, verifies an unclaimed commitment, marks claimed, transfers `amount` from the pool |
| `(close-cycle (cycle-id uint))` | owner | sets status `closed` |

### Read-only

`compute-commitment`, `verify-commitment`, `get-cycle`, `get-cycle-totals`
(deposited / claimed / remaining), `is-claimed`, `get-next-cycle-id`.

### Error constants

| Code | Constant |
|---|---|
| `u100` | `ERR-NOT-OWNER` |
| `u101` | `ERR-CYCLE-NOT-FOUND` |
| `u102` | `ERR-INVALID-PROOF` |
| `u103` | `ERR-ALREADY-CLAIMED` |
| `u104` | `ERR-INSUFFICIENT-POOL` |
| `u105` | `ERR-WRONG-STATUS` |
| `u106` | `ERR-TRANSFER-FAILED` |
| `u107` | `ERR-TOKEN-MISMATCH` |

## Required post-conditions (frontend must attach)

Per SECURITY.md invariant #5, every token movement must be bounded:

- **`deposit`** — a fungible-token post-condition that **exactly `amount`** of
  the cycle token leaves the employer (`tx-sender`).
- **`claim`** — a fungible-token post-condition that **exactly `amount`** of the
  cycle token leaves the contract (`<deployer>.stealth-payroll`) to the claimer.

## Security properties enforced (each has a test)

- **No double-claim** — a commitment's `claimed` flag is checked and flipped
  before transfer (`ERR-ALREADY-CLAIMED`).
- **No over-claim** — `total-claimed + amount <= total-deposited`
  (`ERR-INSUFFICIENT-POOL`).
- **Proof required** — `claim` recomputes the hash with `tx-sender`; wrong
  amount, wrong nonce, or wrong caller all fail (`ERR-INVALID-PROOF`). A caller
  can never pass a "recipient" argument.
- **Authorization** — only the cycle owner can `deposit`/`commit`
  (`ERR-NOT-OWNER`).
- **Token safety** — the passed token must match the cycle's stored token
  (`ERR-TOKEN-MISMATCH`); external transfers use `unwrap!` with
  `ERR-TRANSFER-FAILED`, never `unwrap-panic`.
- **Checks-effects-interactions** — validate proof, update state (mark claimed +
  increment totals), then transfer last.
- **No readable amounts in state** — state stores only commitments and totals.
- **Cycle isolation** — commitments keyed by `{ cycle-id, commitment }`.

## Develop, test, deploy

```bash
cd contracts
npm install

# run the full vitest suite (canonical vector + all invariants)
npm test
```

### Live testnet deployment

The contracts are deployed and live on **Stacks testnet** under
`ST1X5P65XY6D3TV0NK1WNGA1EXRAHRFEJDHAETBBV`:

| Contract | Deploy tx |
|---|---|
| `sip-010-trait` | [`0xcb75ce15…`](https://explorer.hiro.so/txid/0xcb75ce1555b0515fa588160850216a0491ea3bc1ab4817796c660d86b33f5838?chain=testnet) |
| `mock-usdcx` | [`0x32e723f4…`](https://explorer.hiro.so/txid/0x32e723f4ea849048f56d995fda92c813768edc18d4031d1655866cea7351a10a?chain=testnet) |
| `stealth-payroll` | [`0x4a1bbca6…`](https://explorer.hiro.so/txid/0x4a1bbca6f8e98f94c22a51fae0401c2d093892cf0ce7d2573b79b6f4a223b5db?chain=testnet) |

These principals are baked into the app's [`lib/stacks.ts`](../lib/stacks.ts) as
defaults, so the frontend talks to this deployment with no configuration.

### Redeploying

```bash
# 1. provide your testnet deployer mnemonic (never commit it)
export DEPLOYER_MNEMONIC="<your 24-word testnet mnemonic>"

# 2. generate a low-cost testnet plan (uses settings/Testnet.toml)
clarinet deployments generate --testnet --low-cost

# 3. apply it
clarinet deployments apply --testnet
```

A ready-to-edit plan template is checked in at
[`deployments/default.testnet-plan.yaml`](./deployments/default.testnet-plan.yaml).
(The live deployment above was published programmatically via
`@stacks/transactions` since the `clarinet` binary was not available in the
build environment; either path produces identical on-chain contracts.)

> `clarinet` (the native binary) is only needed for `console`/`deployments`. The
> test suite runs entirely through the npm `@stacks/clarinet-sdk`, so `npm test`
> works without it. Install the binary from
> <https://github.com/hirosystems/clarinet/releases> when you're ready to deploy.

**Do not touch mainnet or real funds until a professional audit is done — see
[SECURITY.md](./SECURITY.md).**
