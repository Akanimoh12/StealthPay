# SECURITY.md — StealthPay Privacy & Threat Model

**This is the source of truth for what StealthPay does and does not hide. Every design and copy decision defers to this file. Read it before building.**

StealthPay is honest privacy, not magic. We do not use zero-knowledge proofs. We do not claim amount confidentiality. We claim exactly what the mechanism delivers — no more — because overclaiming privacy is how people get hurt and how products lose trust.

---

## The privacy mechanism: claim-pool

1. The employer deposits the **total** payroll as a single pooled sum. Only the aggregate is ever on-chain.
2. Each salary is committed as `sha256(recipient ‖ amount ‖ nonce)`. The raw amount is **never** written to contract state in readable form.
3. Salaries are **not** disbursed in one side-by-side batch. Each employee **claims** their own amount in a **separate transaction** at a **time of their choosing**, from a **different wallet**, by revealing their secret nonce.

The privacy comes from three properties working together: pooling (only the total is visible on deposit), commitment (amounts are hashes, not numbers), and decoupled claims (no single transaction shows the whole team side-by-side).

---

## What IS hidden

- **The salary roster.** There is no on-chain list mapping wallets or names to salary amounts. Nobody can pull "the payroll" as a table.
- **Side-by-side comparison.** You cannot open one transaction and read what everyone earns relative to each other. Who earns more than whom is not exposed as a set.
- **Raw amounts in contract state.** State holds `sha256` commitments, not readable numbers.
- **Employer's internal manifest.** Salaries and nonces live only in the employer's browser and an exported encrypted CSV — never on any server, never on-chain.

---

## What is NOT hidden (disclosed plainly)

- **An individual's own claim amount.** When an employee claims, the token transfer for `amount` is visible on-chain. Anyone watching **that specific employee's known wallet** can see the amount they withdrew.
- **The pool total.** The deposited payroll sum is visible on-chain by design.
- **That payroll happened, and when.** Deposit, commit, and claim transactions are observable events.
- **Aggregate token flows.** Total USDCx / sBTC in and out of the contract is visible.

**We do NOT provide:** zero-knowledge amount confidentiality, transaction-graph anonymity against an adversary who already knows every employee's wallet, or protection against an employer who leaks the manifest.

---

## Threat model

| Adversary | Can they learn salaries? | Notes |
|---|---|---|
| Casual block-explorer browser | **No roster, no comparison.** | Sees a pool and scattered claims. This is the primary threat StealthPay defeats. |
| Observer who knows ONE employee's wallet | Sees **that one** person's claim amount. | Cannot derive the rest of the team from it. |
| Observer who already knows EVERY employee's wallet | Can correlate each known wallet's claim. | StealthPay does not defend against full prior deanonymization. State this openly. |
| The employer | Knows all salaries (they set them). | By design — they run payroll. Manifest security is their responsibility. |
| A malicious employee | Cannot claim more than their committed amount, cannot claim twice, cannot claim another's. | Enforced by commitment + claimed flag. |

---

## Security invariants the contract MUST enforce

These are non-negotiable. Every one needs a test.

1. **No double-claim.** A commitment, once claimed, can never be claimed again.
2. **No over-claim.** Total claimed can never exceed total deposited for a cycle.
3. **Proof required.** A claim succeeds only if `sha256(tx-sender ‖ amount ‖ nonce)` matches a stored, unclaimed commitment for that cycle. Wrong amount, wrong nonce, or wrong caller all fail.
4. **Authorization.** Only the cycle owner can deposit or commit. Only the rightful holder of a nonce can claim their entry.
5. **Post-conditions on every transfer.** Each token movement is bounded by a post-condition so exactly the intended amount moves — no more.
6. **No readable amounts in state.** Contract state stores commitments and totals only, never a per-person amount as a plain value.
7. **Cycle isolation.** A commitment or claim in one cycle cannot affect another.

---

## Nonce & manifest handling (client-side rules)

- Nonces are **16 bytes of CSPRNG output** (`crypto.getRandomValues`), unique per employee per cycle. Never derived from predictable data (no timestamps, no counters, no employee name).
- Salaries + nonces live in browser memory / session only. Never transmitted to a server. Never stored in Supabase.
- The exported manifest CSV is the employer's audit file and the source of each employee's claim details. Treat it like a password file: it fully reveals all salaries to whoever holds it. The UI must warn the user of this explicitly.
- Reusing a nonce across employees or cycles is a correctness and privacy bug — enforce uniqueness client-side.

---

## Known limitations & future work (be upfront in the product)

- **Amount confidentiality at claim time** is the main open problem. Future directions: equal-denomination outputs (mixer-style fixed units) or a ZK claim proof once mature ZK tooling exists on Stacks. Neither is in the MVP.
- **Timing correlation.** If all employees claim immediately after commit, timing can weakly hint at grouping. Mitigation guidance: employees claim on their own schedule.
- **No audit yet.** This is grant-stage software. It has not had a professional security audit. Do not use for real funds until it does. Say this in the UI.

---

## Copy rules (enforced everywhere)

Every user-facing surface must be consistent with this file. The approved one-liner:

> Individual salary amounts are never written to the public ledger as a roster, and no single transaction reveals the whole team's pay. An outside observer sees that payroll ran and the total that left the treasury — not what any one person takes home, unless they already know and watch that person's specific wallet. We do not use zero-knowledge proofs.

Never write "fully anonymous," "salaries are invisible," "zero-knowledge," or "untraceable." Those are false. Precision is the product.
