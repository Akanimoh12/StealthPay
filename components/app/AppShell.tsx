"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Wordmark from "@/components/Wordmark";
import WalletButton, { NetworkBadge } from "./WalletButton";

const TABS = [
  { href: "/dashboard", label: "Employer" },
  { href: "/claim", label: "Claim" },
  { href: "/verify", label: "Verify" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="StealthPay home" className="rounded-md">
              <Wordmark />
            </Link>
            <NetworkBadge />
          </div>
          <div className="flex items-center gap-3">
            <WalletButton />
          </div>
        </div>
        <nav
          aria-label="App sections"
          className="container-page flex items-center gap-1 overflow-x-auto pb-px"
        >
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-orange text-ink"
                    : "border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="container-page flex-1 py-8 sm:py-12">{children}</main>

      <footer className="border-t border-line bg-paper-pure">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            StealthPay — private payroll on the Stacks Bitcoin L2. Grant-stage
            software, unaudited. Do not use for real funds.
          </p>
          <Link href="/" className="font-medium text-ink-soft hover:text-ink">
            ← Back to landing
          </Link>
        </div>
      </footer>
    </div>
  );
}
