import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = "https://stealthpay.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "StealthPay — Private payroll on Bitcoin",
  description:
    "Pay your team in USDCx and sBTC on the Stacks Bitcoin L2 — without exposing individual salary amounts on-chain. Private payroll, secured by Bitcoin.",
  keywords: [
    "private payroll",
    "Bitcoin payroll",
    "Stacks",
    "sBTC",
    "USDCx",
    "crypto payroll",
    "confidential salaries",
  ],
  authors: [{ name: "StealthPay" }],
  openGraph: {
    title: "StealthPay — Private payroll on Bitcoin",
    description:
      "Pay your team in USDCx and sBTC on Stacks without exposing salaries on-chain.",
    url: siteUrl,
    siteName: "StealthPay",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StealthPay — Private payroll on Bitcoin",
    description:
      "Pay your team in USDCx and sBTC on Stacks without exposing salaries on-chain.",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAFAFA",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <a
          href="#waitlist"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to waitlist
        </a>
        {children}
      </body>
    </html>
  );
}
