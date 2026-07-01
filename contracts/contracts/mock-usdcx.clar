;; mock-usdcx - a minimal SIP-010 fungible token for tests and testnet demos.
;;
;; It exposes a TEST-ONLY `mint` so suites and demos can fund wallets without a
;; real USDCx faucet. The stealth-payroll contract treats this identically to
;; any production SIP-010 token: it only ever calls trait methods.
;;
;; DO NOT deploy this to mainnet - `mint` is unrestricted by design.

(impl-trait .sip-010-trait.sip-010-trait)

(define-fungible-token usdcx)

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-TOKEN-OWNER (err u1))

(define-data-var token-name (string-ascii 32) "Mock USDCx")
(define-data-var token-symbol (string-ascii 32) "USDCx")
(define-data-var token-uri (optional (string-utf8 256)) none)
(define-constant TOKEN-DECIMALS u6)

;; --- SIP-010 ---

(define-public (transfer
    (amount uint)
    (sender principal)
    (recipient principal)
    (memo (optional (buff 34))))
  (begin
    ;; SIP-010: only the sender (or an authorized principal) may move their funds.
    (asserts! (is-eq tx-sender sender) ERR-NOT-TOKEN-OWNER)
    (try! (ft-transfer? usdcx amount sender recipient))
    (match memo to-print (print to-print) 0x)
    (ok true)))

(define-read-only (get-name)
  (ok (var-get token-name)))

(define-read-only (get-symbol)
  (ok (var-get token-symbol)))

(define-read-only (get-decimals)
  (ok TOKEN-DECIMALS))

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance usdcx who)))

(define-read-only (get-total-supply)
  (ok (ft-get-supply usdcx)))

(define-read-only (get-token-uri)
  (ok (var-get token-uri)))

;; --- Test-only helpers ---

;; Unrestricted mint so anyone can fund a wallet in tests / on testnet.
(define-public (mint (amount uint) (recipient principal))
  (ft-mint? usdcx amount recipient))
