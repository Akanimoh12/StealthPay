export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      {/* Soft warm background glow, top-right. No heavy gradients. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-orange/10 blur-3xl"
      />

      <div className="container-page grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:gap-8 lg:py-28">
        {/* Left — copy */}
        <div className="animate-fade-up">
          <a
            href="#waitlist"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-pure px-3.5 py-1.5 text-xs font-medium text-ink-soft shadow-sm transition-colors hover:border-orange/40"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange" />
            NEW: Private payroll on Bitcoin — now in early access
          </a>

          <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Pay your team in Bitcoin.{" "}
            <span className="text-orange-dark">Keep salaries private.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            StealthPay runs your payroll in USDCx and sBTC on the Stacks Bitcoin
            L2 — settling on-chain in one batch while keeping each person&apos;s
            salary off the public ledger.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="#waitlist" className="btn-primary">
              Join Waitlist
            </a>
            <a href="#how-it-works" className="btn-secondary">
              How it works
            </a>
          </div>

          <p className="mt-6 text-sm text-ink-muted">
            No wallet setup for employees. No salaries leaked on a block
            explorer.
          </p>
        </div>

        {/* Right — clean product mockup placeholder */}
        <div className="animate-fade-up [animation-delay:120ms]">
          <HeroMockup />
        </div>
      </div>
    </section>
  );
}

/** A calm, abstract representation of a private batch payout. */
function HeroMockup() {
  const rows = [
    { tag: "ENG", token: "USDCx" },
    { tag: "DES", token: "sBTC" },
    { tag: "OPS", token: "USDCx" },
    { tag: "MKT", token: "sBTC" },
  ];

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        aria-hidden="true"
        className="absolute -inset-3 -z-10 rounded-2xl bg-orange/5 blur-xl"
      />
      <div className="overflow-hidden rounded-2xl border border-line bg-paper-pure shadow-card">
        {/* Window chrome */}
        <div className="flex items-center justify-between border-b border-line-soft px-5 py-3.5">
          <span className="text-sm font-semibold text-ink">
            Payroll · June
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Settled on Bitcoin
          </span>
        </div>

        {/* Salary rows — amounts redacted, by design */}
        <ul className="divide-y divide-line-soft">
          {rows.map((row, i) => (
            <li
              key={i}
              className="flex items-center justify-between px-5 py-3.5"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-paper text-[0.65rem] font-bold tracking-wide text-ink-muted">
                  {row.tag}
                </span>
                <span className="text-sm text-ink-soft">Employee {i + 1}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm tracking-widest text-ink-muted">
                  ••••••
                </span>
                <span className="rounded-md bg-orange/10 px-2 py-0.5 text-xs font-semibold text-orange-deep">
                  {row.token}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line-soft bg-paper px-5 py-3.5">
          <span className="text-xs text-ink-muted">
            Batch hash committed on-chain
          </span>
          <span className="font-mono text-xs text-ink-muted">0x9f…a3e1</span>
        </div>
      </div>
    </div>
  );
}
