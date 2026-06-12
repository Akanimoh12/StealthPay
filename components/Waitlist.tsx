"use client";

import { useState, type FormEvent } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = "idle" | "loading" | "success" | "error";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "loading") return;

    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, company: company.trim() }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };

      if (res.ok) {
        setStatus("success");
        setMessage("You're on the list — we'll be in touch.");
        setEmail("");
        setCompany("");
        return;
      }

      // 409 → duplicate; surface the friendly server message.
      setStatus("error");
      setMessage(data.error ?? "Something went wrong. Please try again.");
    } catch {
      setStatus("error");
      setMessage("Network error. Please check your connection and try again.");
    }
  }

  const isError = status === "error";

  return (
    <section id="waitlist" className="py-20 sm:py-28">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-2xl border border-line bg-ink px-6 py-14 shadow-card sm:px-12 sm:py-16">
          {/* warm accent glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange/20 blur-3xl"
          />

          <div className="relative mx-auto max-w-xl text-center">
            <p className="text-xs font-semibold uppercase tracking-cta text-orange">
              Early access
            </p>
            <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Run your first private payroll on Bitcoin
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-white/70">
              Join the waitlist for early access. We&apos;re onboarding teams in
              small cohorts and reviewing each one personally.
            </p>

            {status === "success" ? (
              <SuccessState message={message} />
            ) : (
              <form
                onSubmit={handleSubmit}
                noValidate
                className="mx-auto mt-9 max-w-md text-left"
              >
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="company"
                      className="mb-1.5 block text-sm font-medium text-white/80"
                    >
                      Company{" "}
                      <span className="font-normal text-white/40">
                        (optional)
                      </span>
                    </label>
                    <input
                      id="company"
                      name="company"
                      type="text"
                      autoComplete="organization"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Acme Labs"
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/35 focus-visible:border-orange focus-visible:ring-orange"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-sm font-medium text-white/80"
                    >
                      Work email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (isError) {
                          setStatus("idle");
                          setMessage("");
                        }
                      }}
                      aria-invalid={isError}
                      aria-describedby={isError ? "waitlist-error" : undefined}
                      placeholder="you@company.com"
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/35 focus-visible:border-orange focus-visible:ring-orange"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {status === "loading" ? (
                    <>
                      <Spinner /> Joining…
                    </>
                  ) : (
                    "Join Waitlist"
                  )}
                </button>

                {isError && (
                  <p
                    id="waitlist-error"
                    role="alert"
                    className="mt-3 text-center text-sm text-orange"
                  >
                    {message}
                  </p>
                )}

                <p className="mt-4 text-center text-xs text-white/40">
                  We&apos;ll only email you about StealthPay early access. No
                  spam, unsubscribe anytime.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SuccessState({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="mx-auto mt-9 flex max-w-md flex-col items-center gap-4 rounded-xl border border-orange/30 bg-white/[0.04] px-6 py-8 text-center"
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-orange/15 text-orange">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="m5 12.5 4.5 4.5L19 7"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <p className="text-lg font-semibold text-white">{message}</p>
      <p className="text-sm text-white/60">
        Keep an eye on your inbox — early cohorts get hands-on onboarding.
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
