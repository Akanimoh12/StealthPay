# CONTRACT.md — stealth-payroll.clar Reference

The Clarity claim-pool contract is the source of truth for StealthPay. This document specifies its interface, the **canonical commitment serialization** (which the frontend must reproduce exactly), and the Clarity best practices to follow.

> Build this before the frontend. Lock the commitment serialization and publish the test vector before anyone writes `hash.ts`.

---

## Canonical commitment construction (THE most important spec)

The commitment is:

```
commitment = sha256( recipient-bytes ‖ amount-bytes ‖ nonce-bytes )
```

Where `‖` is byte concatenation, in this exact order, with this exact serialization:

- **recipient-bytes** — the standard principal serialization via Clarity's `to-consensus-buff?` of the `principal`.
- **amount-bytes** — the Clarity consensus serialization of the `uint` via `to-consensus-buff?`.
- **nonce-bytes** — a raw `(buff 16)`, used as-is (no wrapping).

In Clarity, build the preimage by concatenating the consensus buffers, then hash:

```clarity
(define-read-only (compute-commitment (recipient principal) (amount uint) (nonce (buff 16)))
  (sha256
    (concat
      (concat
        (unwrap-panic (to-consensus-buff? recipient))
        (unwrap-panic (to-consensus-buff? amount)))
      nonce)))
```

The frontend must reproduce this using `@stacks/transactions` `serializeCV(principalCV(...))` and `serializeCV(uintCV(...))` to get identical bytes, then `sha256`. **Both sides must agree on the shared test vector below.**

### Shared test vector (checked in BOTH test suites)

```
recipient : ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM   (example testnet principal)
amount    : u2000
nonce     : 0x000102030405060708090a0b0c0d0e0f
=> commitment : <fill in the actual hash output once, then hardcode as the canonical vector>
```

Generate this value once from the Clarity `compute-commitment`, paste it here, and assert it in both `contracts/tests` and `app/tests/hash.test.ts`. If either side produces a different hash, the build is broken — do not proceed.

---

## Interface

### Data structures

```clarity
;; cycle metadata
(define-map cycles
  uint                                  ;; cycle-id
  {
    owner: principal,
    token: principal,                   ;; SIP-010 contract used
    total-deposited: uint,
    total-claimed: uint,
    status: (string-ascii 12)           ;; "open" | "committed" | "closed"
  })

;; commitments per cycle
(define-map commitments
  { cycle-id: uint, commitment: (buff 32) }
  { claimed: bool })

(define-data-var next-cycle-id uint u0)
```

### Public functions

| Function | Caller | Effect |
|---|---|---|
| `create-cycle (token <sip-010>)` | employer | new cycle, returns `cycle-id` |
| `deposit (cycle-id uint) (amount uint) (token <sip-010>)` | cycle owner | pulls `amount` into escrow, adds to `total-deposited` |
| `commit-salaries (cycle-id uint) (list 50 (buff 32))` | cycle owner | stores commitments as unclaimed, sets status `committed` |
| `claim (cycle-id uint) (amount uint) (nonce (buff 16)) (token <sip-010>)` | employee | verifies proof, marks claimed, transfers `amount` from pool |
| `verify-commitment (cycle-id uint) (recipient principal) (amount uint) (nonce (buff 16))` | anyone (read-only) | returns `bool` — does the tuple match a stored commitment |

### Read-only

`get-cycle`, `get-cycle-totals` (deposited / claimed / remaining), `is-claimed`.

---

## Error constants (use throughout)

```clarity
(define-constant ERR-NOT-OWNER            (err u100))
(define-constant ERR-CYCLE-NOT-FOUND      (err u101))
(define-constant ERR-INVALID-PROOF        (err u102))
(define-constant ERR-ALREADY-CLAIMED      (err u103))
(define-constant ERR-INSUFFICIENT-POOL    (err u104))
(define-constant ERR-WRONG-STATUS         (err u105))
(define-constant ERR-TRANSFER-FAILED      (err u106))
(define-constant ERR-TOKEN-MISMATCH       (err u107))
```

---

## Clarity best practices (follow all)

**Authorization**
- Check `tx-sender` against `owner` for `deposit` and `commit-salaries`. Never trust a passed-in principal for authorization.
- For `claim`, the caller IS the recipient — recompute the hash with `tx-sender`, never with a caller-supplied "recipient" argument. This is what binds a claim to the actual withdrawer.

**Checks-effects-interactions**
- Validate the proof, then update state (mark claimed, increment totals), then do the SIP-010 transfer last. Never transfer before state is updated.
- Enforce `total-claimed + amount <= total-deposited` before transferring.

**Token safety**
- Accept the SIP-010 trait as a parameter; assert the passed token principal matches the cycle's stored `token` (`ERR-TOKEN-MISMATCH`) so a caller can't swap tokens.
- Use `unwrap!` on transfer results with `ERR-TRANSFER-FAILED`; never `unwrap-panic` on external calls.

**Post-conditions**
- The frontend must attach a fungible-token post-condition on `deposit` (exactly `amount` leaves employer) and on `claim` (exactly `amount` leaves the contract). Document the required post-conditions here so the app sets them.

**Arithmetic & state**
- Use checked arithmetic; Clarity aborts on overflow/underflow, so structure comparisons to fail with a clean error before arithmetic.
- Never store a readable per-person amount anywhere in state. Only commitments and totals.

**Determinism & purity**
- `verify-commitment` and all getters are `define-read-only`. No side effects.
- Keep `compute-commitment` a pure read-only helper reused by both `claim` and `verify-commitment` so there is exactly one hashing code path.

**Cycle isolation**
- Key commitments by `{ cycle-id, commitment }` so identical amounts across cycles never collide or cross-claim.

---

## Mock token

Ship `mock-usdcx.clar`, a minimal SIP-010 with `mint` (test-only) so tests and testnet demos work without real USDCx. The main contract must work identically against the mock and any real SIP-010 token.

---

## Test checklist (all must pass)

- [ ] create → deposit → commit → single successful claim pays the employee and reduces remaining pool
- [ ] full lifecycle with 3 employees each claiming their own amount from one pool
- [ ] wrong amount rejected `ERR-INVALID-PROOF`
- [ ] wrong nonce rejected `ERR-INVALID-PROOF`
- [ ] someone else's valid tuple, claimed by wrong `tx-sender`, rejected
- [ ] double-claim rejected `ERR-ALREADY-CLAIMED`
- [ ] over-claim beyond pool rejected `ERR-INSUFFICIENT-POOL`
- [ ] non-owner deposit / commit rejected `ERR-NOT-OWNER`
- [ ] token mismatch rejected `ERR-TOKEN-MISMATCH`
- [ ] `verify-commitment` returns true for correct tuple, false otherwise
- [ ] shared test vector hash matches the frontend's `hash.ts`

---

## Deployment

- Local: `clarinet console`, `clarinet test`.
- Testnet: `clarinet deployments generate --testnet --low-cost` then `apply`. Record the address in the app's `NEXT_PUBLIC_CONTRACT_ADDRESS`.
- Do not touch mainnet or real funds until a professional audit is done (see `SECURITY.md`).
