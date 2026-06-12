import Wordmark from "./Wordmark";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] =
  [
    {
      heading: "Product",
      links: [
        { label: "How it works", href: "#how-it-works" },
        { label: "Privacy", href: "#privacy" },
        { label: "FAQ", href: "#faq" },
        { label: "Join waitlist", href: "#waitlist" },
      ],
    },
    {
      heading: "Ecosystem",
      links: [
        { label: "Stacks", href: "https://www.stacks.co" },
        { label: "sBTC", href: "https://www.stacks.co/sbtc" },
        { label: "Bitcoin", href: "https://bitcoin.org" },
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "Contact", href: "#waitlist" },
        { label: "Privacy policy", href: "#privacy" },
        { label: "Terms", href: "#" },
      ],
    },
  ];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-paper">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          {/* Brand */}
          <div>
            <Wordmark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
              Private payroll on the Stacks Bitcoin L2. Pay your team in USDCx
              and sBTC — without putting salaries on a public ledger.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <SocialLink href="https://x.com/stealthpay" label="X (Twitter)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.844l-5.36-7.01L4.66 22H1.4l8.02-9.17L1 2h7.02l4.84 6.41L18.244 2Zm-1.2 18h1.9L7.05 4H5.02l12.024 16Z" />
                </svg>
              </SocialLink>
              <SocialLink href="https://github.com/stealthpay" label="GitHub">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49v-1.7c-2.78.62-3.37-1.37-3.37-1.37-.46-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.36 1.12 2.94.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.72 0 0 .84-.27 2.75 1.05A9.36 9.36 0 0 1 12 6.84c.85 0 1.71.12 2.51.34 1.91-1.32 2.75-1.05 2.75-1.05.55 1.42.2 2.46.1 2.72.64.72 1.03 1.63 1.03 2.75 0 3.93-2.35 4.79-4.58 5.05.36.32.68.94.68 1.9v2.82c0 .27.18.59.69.49A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
                </svg>
              </SocialLink>
              <SocialLink href="https://www.linkedin.com/company/stealthpay" label="LinkedIn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5ZM3 9h4v12H3V9Zm6 0h3.84v1.64h.05c.54-1.02 1.85-2.1 3.8-2.1 4.07 0 4.82 2.68 4.82 6.16V21h-4v-5.5c0-1.31-.02-3-1.83-3-1.83 0-2.11 1.43-2.11 2.9V21H9V9Z" />
                </svg>
              </SocialLink>
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h2 className="text-xs font-semibold uppercase tracking-cta text-ink-muted">
                {col.heading}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="rounded text-sm text-ink-soft transition-colors hover:text-ink"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
          <p className="text-sm text-ink-muted">
            © {year} StealthPay. All rights reserved.
          </p>
          <p className="text-sm text-ink-muted">
            Built in Port Harcourt, Nigeria 🇳🇬
          </p>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-paper-pure text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
    >
      {children}
    </a>
  );
}
