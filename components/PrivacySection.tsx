const PRIVATE = [
  "Each employee's individual salary amount",
  "Who earns more or less than whom",
  "Per-person payment history and raises",
  "The mapping between a wallet and a named employee",
];

const VISIBLE = [
  "The total payroll budget deposited into the contract",
  "That a batch payout happened, and when",
  "A cryptographic hash committing to the salary set",
  "Aggregate token flows (USDCx / sBTC) in and out",
];

export default function PrivacySection() {
  return (
    <section
      id="privacy"
      className="border-y border-line bg-paper-pure py-20 sm:py-28"
    >
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Radical transparency</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            We&apos;ll tell you exactly what stays private
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            Public blockchains are unforgiving — most &ldquo;private&rdquo;
            payroll tools quietly leak amounts. StealthPay doesn&apos;t claim
            zero-knowledge magic. Here&apos;s the honest line between what we hide
            and what Bitcoin&apos;s ledger still records.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          {/* What's private */}
          <div className="rounded-2xl border border-orange/30 bg-orange/[0.04] p-7 shadow-card">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange/15 text-orange-deep">
                <ShieldIcon />
              </span>
              <h3 className="text-lg font-semibold text-ink">
                What&apos;s private
              </h3>
            </div>
            <ul className="mt-6 space-y-3.5">
              {PRIVATE.map((item) => (
                <li key={item} className="flex gap-3">
                  <CheckIcon className="mt-0.5 shrink-0 text-orange-deep" />
                  <span className="text-[0.95rem] leading-relaxed text-ink-soft">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* What's visible */}
          <div className="rounded-2xl border border-line bg-paper p-7 shadow-card">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink/[0.06] text-ink-soft">
                <EyeIcon />
              </span>
              <h3 className="text-lg font-semibold text-ink">
                What&apos;s visible on-chain
              </h3>
            </div>
            <ul className="mt-6 space-y-3.5">
              {VISIBLE.map((item) => (
                <li key={item} className="flex gap-3">
                  <DotIcon className="mt-0.5 shrink-0 text-ink-muted" />
                  <span className="text-[0.95rem] leading-relaxed text-ink-soft">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-ink-muted">
          Bottom line: an outside observer sees that you ran payroll and how much
          left the treasury in total — never what any one person took home.
        </p>
      </div>
    </section>
  );
}

/* ----------------------------- icons ----------------------------- */

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.2 2.9 7.3 7 8.5 4.1-1.2 7-4.3 7-8.5V6l-7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="m8.5 12 2.2 2.2L15.5 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DotIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" />
    </svg>
  );
}
