"use client";

import { explorerTxUrl, isConfigured } from "@/lib/stacks";

// --- Card --------------------------------------------------------------------

export function Card({
  title,
  step,
  description,
  children,
  className = "",
}: {
  title?: string;
  step?: number;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-line bg-paper-pure p-6 shadow-card sm:p-7 ${className}`}
    >
      {title && (
        <header className="mb-5">
          <h2 className="flex items-center gap-2.5 text-lg font-semibold text-ink">
            {step !== undefined && (
              <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-xs font-bold text-white">
                {step}
              </span>
            )}
            {title}
          </h2>
          {description && (
            <p className="mt-1.5 text-sm text-ink-muted">{description}</p>
          )}
        </header>
      )}
      {children}
    </section>
  );
}

// --- Labelled input ----------------------------------------------------------

export function Field({
  label,
  hint,
  id,
  children,
}: {
  label: string;
  hint?: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-soft">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-paper-pure px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-orange focus-visible:outline-none";

// --- Transaction / async status (the 4 required states) ----------------------

export type TxState =
  | { status: "idle" }
  | { status: "pending"; label?: string }
  | { status: "success"; txId?: string; label?: string }
  | { status: "error"; message: string };

export function TxStatus({ state }: { state: TxState }) {
  if (state.status === "idle") return null;

  if (state.status === "pending") {
    return (
      <div
        role="status"
        className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink-soft"
      >
        <Spinner />
        <span>{state.label ?? "Confirm the request in your wallet…"}</span>
      </div>
    );
  }

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="mt-4 flex flex-col gap-1 rounded-xl border border-green-600/30 bg-green-50 px-4 py-3 text-sm text-green-800"
      >
        <span className="font-medium">
          {state.label ?? "Transaction submitted."}
        </span>
        {state.txId && (
          <a
            href={explorerTxUrl(state.txId)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2 hover:no-underline"
          >
            View on Explorer ↗
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="mt-4 rounded-xl border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      {state.message}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 animate-spin text-orange ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"
      />
    </svg>
  );
}

// --- Config gate -------------------------------------------------------------

export function ConfigBanner() {
  if (isConfigured()) return null;
  return (
    <div
      role="alert"
      className="mb-6 rounded-xl border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <strong className="font-semibold">Contract not configured.</strong> Set{" "}
      <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">
        NEXT_PUBLIC_CONTRACT_ADDRESS
      </code>{" "}
      in <code className="font-mono text-xs">.env.local</code> to your deployed
      <code className="font-mono text-xs"> stealth-payroll</code> principal, then
      restart the dev server. Until then, contract calls are disabled.
    </div>
  );
}

// --- Honest privacy note (copy straight from SECURITY.md) --------------------

export function PrivacyNote({ className = "" }: { className?: string }) {
  return (
    <p
      className={`rounded-xl border border-line bg-paper px-4 py-3 text-xs leading-relaxed text-ink-muted ${className}`}
    >
      <strong className="font-semibold text-ink-soft">Honest privacy.</strong>{" "}
      Individual salary amounts are never written to the public ledger as a
      roster, and no single transaction reveals the whole team&rsquo;s pay. An
      outside observer sees that payroll ran and the total that left the
      treasury — not what any one person takes home, unless they already know and
      watch that person&rsquo;s specific wallet. We do not use zero-knowledge
      proofs.
    </p>
  );
}

// --- Masked value ------------------------------------------------------------

export function Masked({ revealed, value }: { revealed: boolean; value: string }) {
  return (
    <span className="font-mono tabular-nums">
      {revealed ? value : "••••••"}
    </span>
  );
}

// --- Connect gate ------------------------------------------------------------

export function ConnectPrompt({ onConnect }: { onConnect: () => void }) {
  return (
    <Card className="text-center">
      <h2 className="text-lg font-semibold text-ink">Connect your wallet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
        Connect a Stacks wallet (Leather or Xverse) to continue. Your salaries
        and nonces never leave this browser.
      </p>
      <button type="button" onClick={onConnect} className="btn-primary mt-5">
        Connect Wallet
      </button>
    </Card>
  );
}
