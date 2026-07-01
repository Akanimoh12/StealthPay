"use client";

import { useState } from "react";
import { useWallet } from "@/components/app/WalletProvider";
import {
  Card,
  Field,
  inputClass,
  ConfigBanner,
  PrivacyNote,
  Spinner,
} from "@/components/app/ui";
import {
  verifyCommitment,
  isValidStxAddress,
  parseAmount,
  humanizeError,
  CONTRACT_ADDRESS,
} from "@/lib/stacks";
import { hexToBytes } from "@/lib/hash";

type Result =
  | { kind: "none" }
  | { kind: "loading" }
  | { kind: "value"; value: boolean }
  | { kind: "error"; message: string };

export default function VerifyPage() {
  const { address } = useWallet();
  const [cycleId, setCycleId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [nonce, setNonce] = useState("");
  const [result, setResult] = useState<Result>({ kind: "none" });

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setResult({ kind: "loading" });
    try {
      if (!/^\d+$/.test(cycleId.trim())) throw new Error("Cycle ID must be a number.");
      if (!isValidStxAddress(recipient)) throw new Error("Recipient is not a valid Stacks address.");
      const amt = parseAmount(amount);
      const nonceHex = nonce.trim().replace(/^0x/, "");
      if (!/^[0-9a-fA-F]{32}$/.test(nonceHex)) {
        throw new Error("Nonce must be 16 bytes (32 hex characters).");
      }
      // Any address works as the read-only sender; use the connected one or the
      // contract address as a neutral default.
      const sender = address ?? CONTRACT_ADDRESS;
      const value = await verifyCommitment(
        BigInt(cycleId.trim()),
        recipient.trim(),
        amt,
        hexToBytes(nonceHex),
        sender
      );
      setResult({ kind: "value", value });
    } catch (err) {
      setResult({ kind: "error", message: humanizeError(err) });
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="eyebrow">Auditor</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
          Verify a payment
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Prove that a specific salary was committed for a wallet — without
          publishing the salary anywhere. Enter the tuple and check it against
          the on-chain commitment.
        </p>
      </header>

      <ConfigBanner />

      <Card>
        <form onSubmit={onVerify} className="space-y-4">
          <Field label="Cycle ID" id="v-cycle">
            <input
              id="v-cycle"
              inputMode="numeric"
              className={inputClass}
              placeholder="0"
              value={cycleId}
              onChange={(e) => setCycleId(e.target.value)}
              required
            />
          </Field>
          <Field label="Recipient wallet" id="v-recipient">
            <input
              id="v-recipient"
              className={`${inputClass} font-mono`}
              placeholder="ST…"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
            />
          </Field>
          <Field
            label="Amount (base units)"
            id="v-amount"
            hint="Whole number in the token's smallest unit."
          >
            <input
              id="v-amount"
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
            id="v-nonce"
            hint="16 bytes / 32 hex characters, from the manifest."
          >
            <input
              id="v-nonce"
              className={`${inputClass} font-mono`}
              placeholder="000102030405060708090a0b0c0d0e0f"
              value={nonce}
              onChange={(e) => setNonce(e.target.value)}
              required
            />
          </Field>

          <button
            type="submit"
            disabled={result.kind === "loading"}
            className="btn-primary w-full disabled:opacity-70"
          >
            {result.kind === "loading" ? "Checking…" : "Verify commitment"}
          </button>
        </form>

        <VerifyResult result={result} />
      </Card>

      <PrivacyNote />
    </div>
  );
}

function VerifyResult({ result }: { result: Result }) {
  if (result.kind === "none") return null;

  if (result.kind === "loading") {
    return (
      <div className="mt-6 flex items-center justify-center gap-3 rounded-xl border border-line bg-paper py-8 text-sm text-ink-soft">
        <Spinner /> Reading the chain…
      </div>
    );
  }

  if (result.kind === "error") {
    return (
      <div
        role="alert"
        className="mt-6 rounded-xl border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-800"
      >
        {result.message}
      </div>
    );
  }

  const yes = result.value;
  return (
    <div
      role="status"
      className={`mt-6 rounded-2xl border py-10 text-center ${
        yes
          ? "border-green-600/30 bg-green-50"
          : "border-red-500/30 bg-red-50"
      }`}
    >
      <div
        className={`text-5xl font-black tracking-tight ${
          yes ? "text-green-700" : "text-red-700"
        }`}
      >
        {yes ? "TRUE" : "FALSE"}
      </div>
      <p
        className={`mt-2 text-sm ${yes ? "text-green-800" : "text-red-800"}`}
      >
        {yes
          ? "This tuple matches a commitment stored on-chain for the cycle."
          : "No matching commitment for this cycle. The amount, nonce, or recipient is off."}
      </p>
    </div>
  );
}
