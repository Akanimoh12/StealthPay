;; stealth-payroll - claim-pool private payroll on Stacks.
;;
;; Privacy model (see SECURITY.md): the employer deposits the TOTAL payroll as a
;; single pooled sum. Each salary is stored only as a commitment
;;   sha256( to-consensus-buff?(recipient) || to-consensus-buff?(amount) || nonce )
;; No per-person amount is ever written to state in readable form. Each employee
;; CLAIMS their own amount in a separate transaction by revealing their nonce;
;; the contract recomputes the hash with tx-sender and pays out from the pool.
;;
;; This contract only ever calls SIP-010 trait methods, so it behaves identically
;; against mock-usdcx and any real SIP-010 token.

(use-trait sip-010-trait .sip-010-trait.sip-010-trait)

;; --- Error constants (CONTRACT.md, u100-u107) ---
(define-constant ERR-NOT-OWNER            (err u100))
(define-constant ERR-CYCLE-NOT-FOUND      (err u101))
(define-constant ERR-INVALID-PROOF        (err u102))
(define-constant ERR-ALREADY-CLAIMED      (err u103))
(define-constant ERR-INSUFFICIENT-POOL    (err u104))
(define-constant ERR-WRONG-STATUS         (err u105))
(define-constant ERR-TRANSFER-FAILED      (err u106))
(define-constant ERR-TOKEN-MISMATCH       (err u107))

;; --- Status values ---
(define-constant STATUS-OPEN      "open")
(define-constant STATUS-COMMITTED "committed")
(define-constant STATUS-CLOSED    "closed")

;; --- Data ---

;; cycle metadata
(define-map cycles
  uint ;; cycle-id
  {
    owner: principal,
    token: principal,          ;; SIP-010 contract used for this cycle
    total-deposited: uint,
    total-claimed: uint,
    status: (string-ascii 12)  ;; "open" | "committed" | "closed"
  })

;; commitments per cycle, keyed by { cycle-id, commitment } for cycle isolation
(define-map commitments
  { cycle-id: uint, commitment: (buff 32) }
  { claimed: bool })

(define-data-var next-cycle-id uint u0)

;; --- Pure hashing helper (single hashing code path) ---
;;
;; CANONICAL commitment serialization. Both `claim` and `verify-commitment`
;; call this, and the frontend must reproduce it byte-for-byte:
;;   sha256( to-consensus-buff?(recipient) || to-consensus-buff?(amount) || nonce )
(define-read-only (compute-commitment (recipient principal) (amount uint) (nonce (buff 16)))
  (sha256
    (concat
      (concat
        (unwrap-panic (to-consensus-buff? recipient))
        (unwrap-panic (to-consensus-buff? amount)))
      nonce)))

;; --- Read-only getters ---

(define-read-only (get-cycle (cycle-id uint))
  (map-get? cycles cycle-id))

(define-read-only (get-next-cycle-id)
  (var-get next-cycle-id))

;; deposited / claimed / remaining for a cycle
(define-read-only (get-cycle-totals (cycle-id uint))
  (match (map-get? cycles cycle-id)
    cycle (ok {
             deposited: (get total-deposited cycle),
             claimed: (get total-claimed cycle),
             remaining: (- (get total-deposited cycle) (get total-claimed cycle))
           })
    ERR-CYCLE-NOT-FOUND))

;; has a specific commitment already been claimed in this cycle?
(define-read-only (is-claimed (cycle-id uint) (commitment (buff 32)))
  (match (map-get? commitments { cycle-id: cycle-id, commitment: commitment })
    entry (get claimed entry)
    false))

;; does (recipient, amount, nonce) match a STORED commitment for this cycle?
(define-read-only (verify-commitment
    (cycle-id uint)
    (recipient principal)
    (amount uint)
    (nonce (buff 16)))
  (is-some
    (map-get? commitments
      { cycle-id: cycle-id, commitment: (compute-commitment recipient amount nonce) })))

;; --- Public functions ---

;; Create a new payroll cycle owned by tx-sender for the given token.
(define-public (create-cycle (token <sip-010-trait>))
  (let ((cycle-id (var-get next-cycle-id)))
    (map-set cycles cycle-id {
      owner: tx-sender,
      token: (contract-of token),
      total-deposited: u0,
      total-claimed: u0,
      status: STATUS-OPEN
    })
    (var-set next-cycle-id (+ cycle-id u1))
    (print { event: "create-cycle", cycle-id: cycle-id, owner: tx-sender, token: (contract-of token) })
    (ok cycle-id)))

;; Owner deposits `amount` of the cycle token into escrow (the pool).
;; Checks-effects-interactions: validate & update totals, then transfer last.
(define-public (deposit (cycle-id uint) (amount uint) (token <sip-010-trait>))
  (let ((cycle (unwrap! (map-get? cycles cycle-id) ERR-CYCLE-NOT-FOUND)))
    (asserts! (is-eq tx-sender (get owner cycle)) ERR-NOT-OWNER)
    (asserts! (is-eq (contract-of token) (get token cycle)) ERR-TOKEN-MISMATCH)
    (asserts! (is-eq (get status cycle) STATUS-OPEN) ERR-WRONG-STATUS)
    (map-set cycles cycle-id
      (merge cycle { total-deposited: (+ (get total-deposited cycle) amount) }))
    (unwrap!
      (contract-call? token transfer amount tx-sender (as-contract tx-sender) none)
      ERR-TRANSFER-FAILED)
    (print { event: "deposit", cycle-id: cycle-id, amount: amount })
    (ok true)))

;; Owner stores salary commitments (as unclaimed) and moves cycle to "committed".
(define-public (commit-salaries (cycle-id uint) (new-commitments (list 50 (buff 32))))
  (let ((cycle (unwrap! (map-get? cycles cycle-id) ERR-CYCLE-NOT-FOUND)))
    (asserts! (is-eq tx-sender (get owner cycle)) ERR-NOT-OWNER)
    (asserts! (or (is-eq (get status cycle) STATUS-OPEN)
                  (is-eq (get status cycle) STATUS-COMMITTED)) ERR-WRONG-STATUS)
    (fold store-commitment new-commitments cycle-id)
    (map-set cycles cycle-id (merge cycle { status: STATUS-COMMITTED }))
    (print { event: "commit-salaries", cycle-id: cycle-id, count: (len new-commitments) })
    (ok true)))

;; Fold helper: store one commitment as unclaimed for the cycle.
;; Passes cycle-id through as the accumulator.
(define-private (store-commitment (commitment (buff 32)) (cycle-id uint))
  (begin
    (map-set commitments { cycle-id: cycle-id, commitment: commitment } { claimed: false })
    cycle-id))

;; Employee claims their own amount by revealing their nonce.
;; The caller IS the recipient: we recompute the hash with tx-sender, never with
;; a caller-supplied principal. Checks-effects-interactions: verify proof, mark
;; claimed + increment totals, THEN transfer from the pool last.
(define-public (claim (cycle-id uint) (amount uint) (nonce (buff 16)) (token <sip-010-trait>))
  (let (
      (cycle (unwrap! (map-get? cycles cycle-id) ERR-CYCLE-NOT-FOUND))
      (commitment (compute-commitment tx-sender amount nonce))
      (recipient tx-sender)
    )
    ;; token bound to this cycle
    (asserts! (is-eq (contract-of token) (get token cycle)) ERR-TOKEN-MISMATCH)
    (asserts! (is-eq (get status cycle) STATUS-COMMITTED) ERR-WRONG-STATUS)
    ;; proof: the (tx-sender, amount, nonce) tuple must match a stored commitment
    (let ((entry (unwrap! (map-get? commitments { cycle-id: cycle-id, commitment: commitment })
                          ERR-INVALID-PROOF)))
      ;; not already claimed
      (asserts! (not (get claimed entry)) ERR-ALREADY-CLAIMED)
      ;; pool must cover this claim
      (asserts! (<= (+ (get total-claimed cycle) amount) (get total-deposited cycle))
                ERR-INSUFFICIENT-POOL)
      ;; effects: mark claimed + increment totals BEFORE the transfer
      (map-set commitments { cycle-id: cycle-id, commitment: commitment } { claimed: true })
      (map-set cycles cycle-id
        (merge cycle { total-claimed: (+ (get total-claimed cycle) amount) }))
      ;; interaction: pay out from the pool last
      (unwrap!
        (as-contract (contract-call? token transfer amount tx-sender recipient none))
        ERR-TRANSFER-FAILED)
      (print { event: "claim", cycle-id: cycle-id, amount: amount, recipient: recipient })
      (ok true))))

;; Optional: owner closes a cycle once payroll is done.
(define-public (close-cycle (cycle-id uint))
  (let ((cycle (unwrap! (map-get? cycles cycle-id) ERR-CYCLE-NOT-FOUND)))
    (asserts! (is-eq tx-sender (get owner cycle)) ERR-NOT-OWNER)
    (map-set cycles cycle-id (merge cycle { status: STATUS-CLOSED }))
    (print { event: "close-cycle", cycle-id: cycle-id })
    (ok true)))
