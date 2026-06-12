"use client";

import { useState } from "react";

type QA = { q: string; a: string };

const FAQS: QA[] = [
  {
    q: "Is it really private?",
    a: "Individual salary amounts are never written to the public ledger — only a cryptographic hash of the batch is committed on-chain. An outside observer can see that you ran payroll and the total that left your treasury, but not what any single employee earned. We don't claim zero-knowledge proofs; we're precise about the line between what's hidden and what Bitcoin's ledger still records (see the Privacy section above).",
  },
  {
    q: "What is USDCx?",
    a: "USDCx is a USD-pegged stablecoin available on the Stacks Bitcoin L2. It lets you pay salaries in a stable dollar value while still settling through Bitcoin-anchored infrastructure — so employees don't ride the volatility of BTC unless they choose to be paid in sBTC.",
  },
  {
    q: "Do employees need crypto knowledge?",
    a: "No. Employees receive a simple claim link and can cash out to a bank account or hold their USDCx / sBTC — no seed phrases or wallet setup required to get started. StealthPay handles the on-chain mechanics so your team doesn't have to.",
  },
  {
    q: "When does it launch?",
    a: "We're in early access now, onboarding teams in small cohorts so we can support each one closely. Join the waitlist and we'll reach out with an invite as spots in the next cohort open up.",
  },
  {
    q: "What happens if I lose access or want to leave?",
    a: "Your payroll budget lives in a contract you control, and your salary commitments are exportable. StealthPay is a tool on top of open Stacks infrastructure — there's no lock-in, and you can audit or withdraw the treasury at any time.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="border-t border-line bg-paper-pure py-20 sm:py-28"
    >
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">FAQ</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Questions, answered straight
          </h2>
        </div>

        <div className="mx-auto mt-12 max-w-2xl divide-y divide-line">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            const panelId = `faq-panel-${i}`;
            const btnId = `faq-button-${i}`;
            return (
              <div key={i}>
                <h3>
                  <button
                    id={btnId}
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  >
                    <span className="text-base font-semibold text-ink sm:text-lg">
                      {item.q}
                    </span>
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-ink-soft transition-transform duration-200 ${
                        isOpen ? "rotate-45 border-orange/40 text-orange-deep" : ""
                      }`}
                      aria-hidden="true"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  hidden={!isOpen}
                  className="pb-6 pr-10"
                >
                  <p className="text-[0.95rem] leading-relaxed text-ink-soft">
                    {item.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
