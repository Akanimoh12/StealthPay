<div align="center">

# 🛡️ StealthPay

### Private payroll on Bitcoin. Pay your team in USDCx & sBTC — without exposing salaries on-chain.

**[🚀 Live Site](https://stealthpay.vercel.app)** · **[🎥 Demo Video](https://www.loom.com/share/your-loom-id)** · **[📊 Pitch Deck](https://your-pitch-deck-link.com)**

*Built on Stacks · Powered by USDCx & sBTC*

</div>

---

## The problem

Crypto payroll has a privacy problem. The moment a company pays its team on a public blockchain, **everyone's salary becomes public** — colleagues can see who earns more, competitors can see your comp bands, and any employee can reverse-engineer the whole team's pay from a block explorer. For most companies, that's a dealbreaker.

So teams that *want* the speed, finality, and global reach of Bitcoin-settled payroll are stuck using traditional rails — slow, expensive, and closed off to the millions of people who'd rather be paid in stable digital dollars or Bitcoin.

## What StealthPay does

**StealthPay lets companies run payroll in USDCx and sBTC on the Stacks Bitcoin L2 — settling on-chain in a single batch while keeping each person's salary off the public ledger.**

You fund one contract. Each employee's amount is committed as a cryptographic hash, never written out as a number. Then you disburse everyone in one Bitcoin-anchored transaction. An outside observer sees *that* you ran payroll and the total that left your treasury — never what any individual took home.

> We don't claim zero-knowledge magic. We're precise about the line between what's hidden and what Bitcoin's ledger still records — and we put that honesty front and center on the site.

---

## Why it matters

| | |
| --- | --- |
| 🔒 **Salaries stay private** | Individual amounts, raises, and who-earns-what never hit a public block explorer. |
| ₿ **Secured by Bitcoin** | Payroll settles on the Stacks L2, anchored to Bitcoin — fast, final, and irreversible. |
| 💵 **Stable or Bitcoin-native** | Pay in USDCx (USD-pegged) or sBTC. Employees choose stability or upside. |
| 🙅 **No crypto homework** | Employees get a simple claim link — no seed phrases or wallet setup to get paid. |
| 🔓 **No lock-in** | The treasury is a contract you control. Audit it or withdraw at any time. |

---

## How it works

1. **Deposit your payroll budget** — Fund the StealthPay contract once with USDCx or sBTC. Only the *total* is visible on-chain, never the split.
2. **Commit salaries as hashes** — Each employee's amount is hashed off-chain and committed as a fingerprint. The numbers themselves never get written to a public ledger.
3. **Disburse in one click** — Trigger a single batch payout. Everyone is paid in the same Bitcoin-settled transaction — impossible to reverse-engineer per person.

### What's private vs. what's visible

**Private:** each individual salary · who earns more than whom · per-person history and raises · the wallet-to-employee mapping.

**Visible on-chain:** the total budget deposited · that a payout happened and when · a hash committing to the salary set · aggregate token flows in and out.

---

## Status

🟠 **Early access.** We're onboarding teams in small cohorts and reviewing each one personally. [Join the waitlist on the live site](https://stealthpay.vercel.app#waitlist) to get an invite as spots open up.

---

## Built with

Next.js 14 · TypeScript · Tailwind CSS · Supabase · the Stacks Bitcoin L2 (USDCx & sBTC)

---

<div align="center">

Made with care in **Port Harcourt, Nigeria** 🇳🇬

**[Visit StealthPay →](https://stealthpay.vercel.app)**

</div>

---

<details>
<summary><strong>Running this project locally (for developers)</strong></summary>

<br>

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase

```bash
npm install
```

**1. Create a Supabase project** at [supabase.com](https://supabase.com). In the SQL Editor, run the contents of [`supabase/schema.sql`](supabase/schema.sql) to create the `waitlist` table and enable Row Level Security.

**2. Configure env vars** — copy the example and fill in values from Supabase → Project Settings → API:

```bash
cp .env.local.example .env.local
```

| Variable | Source | Browser-exposed? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | ✅ yes |
| `SUPABASE_SERVICE_ROLE_KEY` | API keys → `service_role` | ❌ **never** |

The service role key is read only inside [`lib/supabase.ts`](lib/supabase.ts) (imported solely by the server Route Handler). All waitlist writes flow through the validated `/api/waitlist` endpoint — RLS blocks any direct client access.

**3. Run it:**

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm start
```

Deploys cleanly to Vercel — add the two env vars in project settings and ship.

</details>
