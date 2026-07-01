;; SIP-010 Fungible Token Standard trait.
;; Canonical definition per SIP-010:
;; https://github.com/stacksgov/sips/blob/main/sips/sip-010/sip-010-fungible-token-standard.md
(define-trait sip-010-trait
  (
    ;; Transfer `amount` from `sender` to `recipient`, with an optional memo.
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))

    ;; Human-readable name of the token.
    (get-name () (response (string-ascii 32) uint))

    ;; Ticker symbol of the token.
    (get-symbol () (response (string-ascii 32) uint))

    ;; Number of decimals used to display balances.
    (get-decimals () (response uint uint))

    ;; Balance of the given principal.
    (get-balance (principal) (response uint uint))

    ;; Current total supply of the token.
    (get-total-supply () (response uint uint))

    ;; URI to off-chain metadata about the token.
    (get-token-uri () (response (optional (string-utf8 256)) uint))
  )
)
