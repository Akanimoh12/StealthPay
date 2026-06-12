const LOGOS = ["Stacks", "USDCx", "Bitcoin", "sBTC", "Circle", "Clarity"];

export default function TrustStrip() {
  // Duplicate the list so the -50% marquee loops seamlessly.
  const items = [...LOGOS, ...LOGOS];

  return (
    <section
      aria-label="Built on Stacks, powered by USDCx and sBTC"
      className="border-y border-line bg-paper-pure py-10"
    >
      <div className="container-page">
        <p className="text-center text-sm font-medium text-ink-muted">
          Built on{" "}
          <span className="font-semibold text-ink">Stacks</span> · Powered by{" "}
          <span className="font-semibold text-ink">USDCx</span> &amp;{" "}
          <span className="font-semibold text-ink">sBTC</span>
        </p>
      </div>

      <div className="marquee-mask mt-7 overflow-hidden">
        <ul
          className="flex w-max items-center gap-12 animate-marquee"
          aria-hidden="true"
        >
          {items.map((name, i) => (
            <li
              key={i}
              className="select-none whitespace-nowrap text-xl font-bold tracking-tight text-ink-muted/60"
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
