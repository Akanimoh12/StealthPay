"use client";

import { useMemo, useState } from "react";
import { useWallet } from "@/components/app/WalletProvider";
import {
  Card,
  Field,
  inputClass,
  ConfigBanner,
  ConnectPrompt,
  PrivacyNote,
  TxStatus,
  type TxState,
} from "@/components/app/ui";
import {
  claim,
  verifyCommitment,
  parseAmount,
  humanizeError,
  TOKENS,
  type TokenOption,
} from "@/lib/stacks";
import { computeCommitmentHex, hexToBytes } from "@/lib/hash";

export default function ClaimPage() {
  const { address, connected, connectWallet } = useWallet();
  const [cycleId, setCycleId] = useState("");
  const [amount, setAmount] = useState("");
  const [nonce, setNonce] = useState("");
  const [tokenId, setTokenId] = useState(TOKENS[0]?.contractId ?? "");
  const [tx, setTx] = useState<TxState>({ status: "idle" });

  const token = TOKENS.find((t) => t.contractId === tokenId);

  // Live commitment preview — recomputed locally, never sent anywhere.
  const preview = useMemo(() => {
    try {
      if (!address) return null;
      const amt = parseAmount(amount);
      const hex = nonce.trim().replace(/^0x/, "");
      if (!/^[0-9a-fA-F]{32}$/.test(hex)) return null;
      return computeCommitmentHex(address, amt, hexToBytes(hex));
    } catch {
      return null;
    }
  }, [address, amount, nonce]);

  async function onClaim(e: React.FormEvent) {
    e.preventDefault();
    setTx({ status: "pending", label: "Preparing claim…" });
    try {
      if (!address) throw new Error("Connect your wallet first.");
      if (!token) throw new Error("Select the cycle's token.");
      if (!/^\d+$/.test(cycleId.trim())) throw new Error("Cycle ID must be a number.");
      const amt = parseAmount(amount);
      const hex = nonce.trim().replace(/^0x/, "");
      if (!/^[0-9a-fA-F]{32}$/.test(hex)) {
        throw new Error("Nonce must be 16 bytes (32 hex characters).");
      }
      const nonceBytes = hexToBytes(hex);
      const cid = BigInt(cycleId.trim());

      // Instant feedback: confirm the proof matches before opening the wallet,
      // so a wrong amount/nonce fails fast with a clear message.
      const ok = await verifyCommitment(cid, address, amt, nonceBytes, address);
      if (!ok) {
        throw new Error(
          "Invalid proof. This wallet, amount, and nonce do not match a committed salary for this cycle. Double-check the values from your employer's manifest."
        );
      }

      setTx({ status: "pending", label: "Confirm the claim in your wallet…" });
      const { txId } = await claim(cid, amt, nonceBytes, token);
      setTx({
        status: "success",
        txId,
        label: "Claim submitted. Once confirmed, the amount arrives in your wallet.",
      });
    } catch (err) {
      setTx({ status: "error", message: humanizeError(err) });
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="eyebrow">Employee</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
          Claim your salary
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Enter the cycle ID, amount, and nonce your employer gave you. Your
          claim is bound to <em>this</em> connected wallet — only you can
          withdraw your entry.
        </p>
      </header>

      <ConfigBanner />

      {!connected ? (
        <ConnectPrompt onConnect={connectWallet} />
      ) : (
        <Card>
          <form onSubmit={onClaim} className="space-y-4">
            <Field label="Cycle ID" id="c-cycle">
              <input
                id="c-cycle"
                inputMode="numeric"
                className={inputClass}
                placeholder="0"
                value={cycleId}
                onChange={(e) => setCycleId(e.target.value)}
                required
              />
            </Field>

            {TOKENS.length > 0 && (
              <Field label="Token" id="c-token" hint="Must match the cycle's token.">
                <select
                  id="c-token"
                  className={inputClass}
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                >
                  {TOKENS.map((t: TokenOption) => (
                    <option key={t.contractId} value={t.contractId}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field
              label="Amount (base units)"
              id="c-amount"
              hint="The exact amount from your manifest row."
            >
              <input
                id="c-amount"
                inputMode="numeric"
                className={inputClass}
                placeholder="2000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </Field>

            <Field
              label="Nonce (hex)"
              id="c-nonce"
              hint="16 bytes / 32 hex characters — your secret from the manifest."
            >
              <input
                id="c-nonce"
                className={`${inputClass} font-mono`}
                placeholder="000102030405060708090a0b0c0d0e0f"
                value={nonce}
                onChange={(e) => setNonce(e.target.value)}
                required
              />
            </Field>

            {preview && (
              <div className="rounded-xl border border-line bg-paper px-3.5 py-2.5">
                <p className="text-xs font-medium text-ink-soft">
                  Your commitment (computed locally)
                </p>
                <p className="mt-1 break-all font-mono text-xs text-ink-muted">
                  {preview}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={tx.status === "pending"}
              className="btn-primary w-full disabled:opacity-70"
            >
              {tx.status === "pending" ? "Claiming…" : "Claim salary"}
            </button>
          </form>

          <TxStatus state={tx} />
        </Card>
      )}

      <PrivacyNote />
    </div>
  );
}
