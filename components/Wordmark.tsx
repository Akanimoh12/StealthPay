/**
 * StealthPay wordmark — a small "stealth" glyph (a shielded dot) plus the
 * product name. Pure SVG/markup so it stays crisp and themeable.
 */
export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden="true"
        className="relative grid h-7 w-7 place-items-center rounded-lg bg-ink"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8 1.5 13 3.6v3.5c0 3.1-2.1 5.3-5 6.4-2.9-1.1-5-3.3-5-6.4V3.6L8 1.5Z"
            fill="#FC6432"
          />
          <circle cx="8" cy="7" r="2" fill="#1A1A1A" />
        </svg>
      </span>
      <span className="text-[1.05rem] font-bold tracking-tight text-ink">
        Stealth<span className="text-orange-dark">Pay</span>
      </span>
    </span>
  );
}
