type Step = {
  num: string;
  title: string;
  body: string;
  icon: React.ReactNode;
};

const STEPS: Step[] = [
  {
    num: "01",
    title: "Deposit your payroll budget",
    body: "Fund the StealthPay contract once with USDCx or sBTC. The total budget is visible on-chain — but only the total, never the split.",
    icon: <VaultIcon />,
  },
  {
    num: "02",
    title: "Commit salaries as hashes",
    body: "Each employee's amount is hashed off-chain and committed as a fingerprint. The numbers themselves are never written to a public block explorer.",
    icon: <HashIcon />,
  },
  {
    num: "03",
    title: "Disburse in one click",
    body: "Trigger a single batch payout. Everyone is paid in the same Bitcoin-settled transaction — fast, final, and impossible to reverse-engineer per person.",
    icon: <SendIcon />,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28">
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Three steps from budget to Bitcoin-settled payroll
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            StealthPay sits between your treasury and your team — handling the
            on-chain mechanics so you never expose a single salary.
          </p>
        </div>

        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <li
              key={step.num}
              className="group rounded-2xl border border-line bg-paper-pure p-7 shadow-card transition-shadow duration-200 hover:shadow-card-hover"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-orange/10 text-orange-deep">
                  {step.icon}
                </span>
                <span className="font-mono text-sm font-semibold text-ink-muted/70">
                  {step.num}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-ink">
                {step.title}
              </h3>
              <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink-soft">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ----------------------------- icons ----------------------------- */

function VaultIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8.5V6M12 18v-2.5M8.5 12H6M18 12h-2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function HashIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 3 3 10.5l7 2.5 2.5 7L21 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m10 14 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
