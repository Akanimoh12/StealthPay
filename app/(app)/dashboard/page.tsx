"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/components/app/WalletProvider";
import {
  Card,
  Field,
  inputClass,
  ConfigBanner,
  ConnectPrompt,
  PrivacyNote,
  TxStatus,
  Masked,
  Spinner,
  type TxState,
} from "@/components/app/ui";
import {
  createCycle,
  deposit,
  commitSalaries,
  getCycleTotals,
  isValidStxAddress,
  parseAmount,
  humanizeError,
  TOKENS,
  type TokenOption,
  type CycleTotals,
} from "@/lib/stacks";
import { computeCommitmentHex, generateNonce, bytesToHex } from "@/lib/hash";
import { downloadManifestCsv, type ManifestRow } from "@/lib/manifest";

interface Employee {
  id: string;
  wallet: string;
  amount: string; // base units
  nonce: Uint8Array; // 16 bytes, generated once, stays in browser
}

function newEmployee(): Employee {
  return {
    id: crypto.randomUUID(),
    wallet: "",
    amount: "",
    nonce: generateNonce(),
  };
}

export default function DashboardPage() {
  const { connected, connectWallet } = useWallet();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="eyebrow">Employer</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
          Run a payroll cycle
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Deposit the total as one pool, commit each salary as a hash, and let
          employees claim on their own schedule. No salary roster ever touches
          the chain.
        </p>
      </header>

      <ConfigBanner />

      {!connected ? (
        <ConnectPrompt onConnect={connectWallet} />
      ) : (
        <EmployerFlow />
      )}

      <PrivacyNote />
    </div>
  );
}

function EmployerFlow() {
  const { address } = useWallet();

  const [token, setToken] = useState<TokenOption | undefined>(TOKENS[0]);
  const [cycleId, setCycleId] = useState<string>("");
  const [reveal, setReveal] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([
    newEmployee(),
    newEmployee(),
    newEmployee(),
  ]);
  const [committed, setCommitted] = useState(false);

  const [createTx, setCreateTx] = useState<TxState>({ status: "idle" });
  const [depositTx, setDepositTx] = useState<TxState>({ status: "idle" });
  const [commitTx, setCommitTx] = useState<TxState>({ status: "idle" });
  const [totals, setTotals] = useState<CycleTotals | null>(null);

  // --- derived ---
  const poolTotal = employees.reduce((sum, e) => {
    try {
      return sum + parseAmount(e.amount);
    } catch {
      return sum;
    }
  }, 0n);

  const validEmployees = employees.filter(
    (e) => isValidStxAddress(e.wallet) && /^\d+$/.test(e.amount) && Number(e.amount) > 0
  );

  // --- live totals polling once a cycle exists ---
  const refreshTotals = useCallback(async () => {
    if (!cycleId || !address) return;
    try {
      const t = await getCycleTotals(BigInt(cycleId), address);
      setTotals(t);
    } catch {
      /* transient read errors are non-fatal for display */
    }
  }, [cycleId, address]);

  useEffect(() => {
    if (!cycleId) return;
    refreshTotals();
    const id = setInterval(refreshTotals, 12_000);
    return () => clearInterval(id);
  }, [cycleId, refreshTotals]);

  // --- actions ---
  async function onCreate() {
    if (!token) return;
    setCreateTx({ status: "pending", label: "Confirm cycle creation in your wallet…" });
    try {
      const { txId } = await createCycle(token);
      setCreateTx({
        status: "success",
        txId,
        label:
          "Cycle creation submitted. Enter the cycle ID below once it confirms (see the tx on Explorer).",
      });
    } catch (err) {
      setCreateTx({ status: "error", message: humanizeError(err) });
    }
  }

  async function onDeposit() {
    if (!token || !address) return;
    setDepositTx({ status: "pending", label: "Confirm the deposit in your wallet…" });
    try {
      if (!/^\d+$/.test(cycleId)) throw new Error("Enter the cycle ID first.");
      if (poolTotal <= 0n) throw new Error("Add at least one employee with an amount.");
      const { txId } = await deposit(BigInt(cycleId), poolTotal, token, address);
      setDepositTx({
        status: "success",
        txId,
        label: `Deposited ${poolTotal.toString()} base units into the pool.`,
      });
      setTimeout(refreshTotals, 6000);
    } catch (err) {
      setDepositTx({ status: "error", message: humanizeError(err) });
    }
  }

  async function onCommit() {
    setCommitTx({ status: "pending", label: "Confirm the commitment in your wallet…" });
    try {
      if (!address) throw new Error("Wallet not connected.");
      if (!/^\d+$/.test(cycleId)) throw new Error("Enter the cycle ID first.");
      if (validEmployees.length === 0) throw new Error("Add at least one valid employee.");
      // Enforce nonce uniqueness (SECURITY.md client-side rule).
      const seen = new Set(validEmployees.map((e) => bytesToHex(e.nonce)));
      if (seen.size !== validEmployees.length) {
        throw new Error("Duplicate nonce detected. Regenerate so each employee is unique.");
      }
      const commitments = validEmployees.map((e) =>
        computeCommitmentHex(e.wallet.trim(), parseAmount(e.amount), e.nonce)
      );
      const { txId } = await commitSalaries(BigInt(cycleId), commitments);
      setCommitTx({
        status: "success",
        txId,
        label: `Committed ${commitments.length} salaries. Export the manifest now — it is the only record of the nonces.`,
      });
      setCommitted(true);
    } catch (err) {
      setCommitTx({ status: "error", message: humanizeError(err) });
    }
  }

  function onExport() {
    const rows: ManifestRow[] = validEmployees.map((e) => ({
      employee_wallet: e.wallet.trim(),
      amount: e.amount.trim(),
      nonce_hex: "0x" + bytesToHex(e.nonce),
      commitment_hex: computeCommitmentHex(e.wallet.trim(), parseAmount(e.amount), e.nonce),
    }));
    downloadManifestCsv(rows, cycleId || "draft");
  }

  function updateEmployee(id: string, patch: Partial<Employee>) {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  return (
    <div className="space-y-6">
      {/* Step 1 — create cycle */}
      <Card step={1} title="Create a cycle" description="Pick the token you'll pay in.">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Token" id="d-token">
              {TOKENS.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  No tokens configured. Set NEXT_PUBLIC_MOCK_USDCX_ADDRESS in
                  .env.local.
                </p>
              ) : (
                <select
                  id="d-token"
                  className={inputClass}
                  value={token?.contractId ?? ""}
                  onChange={(e) =>
                    setToken(TOKENS.find((t) => t.contractId === e.target.value))
                  }
                >
                  {TOKENS.map((t) => (
                    <option key={t.contractId} value={t.contractId}>
                      {t.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <button
            type="button"
            onClick={onCreate}
            disabled={createTx.status === "pending" || !token}
            className="btn-primary disabled:opacity-70"
          >
            {createTx.status === "pending" ? "Creating…" : "Create Cycle"}
          </button>
        </div>
        <TxStatus state={createTx} />

        <div className="mt-4">
          <Field
            label="Cycle ID"
            id="d-cycle"
            hint="After the create tx confirms, read the assigned cycle ID from Explorer (or get-next-cycle-id) and enter it here."
          >
            <input
              id="d-cycle"
              inputMode="numeric"
              className={inputClass}
              placeholder="0"
              value={cycleId}
              onChange={(e) => setCycleId(e.target.value)}
            />
          </Field>
        </div>
      </Card>

      {/* Step 2 — employees */}
      <Card
        step={2}
        title="Add employees"
        description="Amounts are masked here. Nonces are generated with a CSPRNG and never leave this browser."
      >
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className="text-xs font-medium text-orange-dark hover:underline"
          >
            {reveal ? "Hide amounts" : "Reveal amounts"}
          </button>
          {committed && (
            <span className="text-xs font-medium text-ink-muted">
              Locked — committed on-chain
            </span>
          )}
        </div>

        <div className="space-y-3">
          {employees.map((emp, i) => (
            <div
              key={emp.id}
              className="grid grid-cols-1 gap-3 rounded-xl border border-line bg-paper p-3 sm:grid-cols-[1fr_140px_auto]"
            >
              <div>
                <label className="sr-only" htmlFor={`emp-wallet-${emp.id}`}>
                  Employee {i + 1} wallet
                </label>
                <input
                  id={`emp-wallet-${emp.id}`}
                  className={`${inputClass} font-mono`}
                  placeholder="ST… employee wallet"
                  value={emp.wallet}
                  disabled={committed}
                  onChange={(e) => updateEmployee(emp.id, { wallet: e.target.value })}
                />
              </div>
              <div>
                <label className="sr-only" htmlFor={`emp-amount-${emp.id}`}>
                  Employee {i + 1} amount
                </label>
                {reveal ? (
                  <input
                    id={`emp-amount-${emp.id}`}
                    inputMode="numeric"
                    className={inputClass}
                    placeholder="amount"
                    value={emp.amount}
                    disabled={committed}
                    onChange={(e) => updateEmployee(emp.id, { amount: e.target.value })}
                  />
                ) : (
                  <input
                    id={`emp-amount-${emp.id}`}
                    type="password"
                    inputMode="numeric"
                    className={inputClass}
                    placeholder="••••••"
                    value={emp.amount}
                    disabled={committed}
                    onChange={(e) => updateEmployee(emp.id, { amount: e.target.value })}
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  setEmployees((prev) => prev.filter((x) => x.id !== emp.id))
                }
                disabled={committed || employees.length === 1}
                className="btn-secondary !px-3 !py-2 !text-xs disabled:opacity-40"
                aria-label={`Remove employee ${i + 1}`}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {!committed && (
          <button
            type="button"
            onClick={() => setEmployees((prev) => [...prev, newEmployee()])}
            className="btn-secondary mt-3 !py-2 !text-xs"
          >
            + Add employee
          </button>
        )}

        <div className="mt-4 flex items-center justify-between rounded-xl border border-line bg-paper-pure px-4 py-3">
          <span className="text-sm font-medium text-ink-soft">Pool total</span>
          <span className="text-sm font-semibold text-ink">
            <Masked revealed={reveal} value={`${poolTotal.toString()} base units`} />
          </span>
        </div>
      </Card>

      {/* Step 3 — deposit */}
      <Card
        step={3}
        title="Deposit the pool"
        description="Moves exactly the pool total from your wallet into escrow, with a post-condition."
      >
        <button
          type="button"
          onClick={onDeposit}
          disabled={depositTx.status === "pending" || poolTotal <= 0n || !cycleId}
          className="btn-primary w-full disabled:opacity-70"
        >
          {depositTx.status === "pending"
            ? "Depositing…"
            : `Deposit ${poolTotal.toString()} base units`}
        </button>
        <TxStatus state={depositTx} />
      </Card>

      {/* Step 4 — commit */}
      <Card
        step={4}
        title="Commit salaries"
        description="Hashes each salary client-side and stores only the commitments on-chain."
      >
        <button
          type="button"
          onClick={onCommit}
          disabled={commitTx.status === "pending" || validEmployees.length === 0 || !cycleId}
          className="btn-primary w-full disabled:opacity-70"
        >
          {commitTx.status === "pending"
            ? "Committing…"
            : `Commit ${validEmployees.length} salaries`}
        </button>
        <TxStatus state={commitTx} />
      </Card>

      {/* Step 5 — export manifest */}
      <Card
        step={5}
        title="Export the manifest"
        description="The employer's audit file and the source of each employee's claim details."
      >
        <div className="rounded-xl border border-red-500/40 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong className="font-semibold">Treat this like a password file.</strong>{" "}
          The manifest CSV reveals <em>every</em> salary and nonce in plain text.
          Anyone who holds it can claim on behalf of your team and read all pay.
          It is generated in your browser only — never uploaded anywhere. Store it
          securely and share each row privately with the right employee.
        </div>
        <button
          type="button"
          onClick={onExport}
          disabled={validEmployees.length === 0}
          className="btn-primary mt-4 w-full disabled:opacity-70"
        >
          Download manifest CSV
        </button>
      </Card>

      {/* Live totals */}
      <Card title="Cycle totals" description="Read live from the contract.">
        {!cycleId ? (
          <p className="text-sm text-ink-muted">Enter a cycle ID to see totals.</p>
        ) : totals === null ? (
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <Spinner /> Loading…
          </div>
        ) : (
          <dl className="grid grid-cols-3 gap-3 text-center">
            <Totals label="Deposited" value={totals.deposited} />
            <Totals label="Claimed" value={totals.claimed} />
            <Totals label="Remaining" value={totals.remaining} />
          </dl>
        )}
      </Card>
    </div>
  );
}

function Totals({ label, value }: { label: string; value: bigint }) {
  return (
    <div className="rounded-xl border border-line bg-paper px-3 py-4">
      <dt className="text-xs font-medium uppercase tracking-cta text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-ink">
        {value.toString()}
      </dd>
    </div>
  );
}
