import type { Metadata } from "next";
import { WalletProvider } from "@/components/app/WalletProvider";
import AppShell from "@/components/app/AppShell";

export const metadata: Metadata = {
  title: "StealthPay — App",
  description:
    "Run a private payroll cycle on Stacks: create, deposit, commit, claim, and verify without exposing a salary roster on-chain.",
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <AppShell>{children}</AppShell>
    </WalletProvider>
  );
}
