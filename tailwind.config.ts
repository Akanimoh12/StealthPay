import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Stacks-inspired palette
        ink: "#1A1A1A",
        "ink-soft": "#404040",
        "ink-muted": "#6B6B6B",
        paper: "#FAFAFA",
        "paper-pure": "#FFFFFF",
        orange: {
          DEFAULT: "#FC6432",
          dark: "#E8632A",
          deep: "#D4521C",
        },
        line: "#E0E0E0",
        "line-soft": "#ECECEC",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        cta: "0.08em",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(26,26,26,0.04), 0 8px 24px rgba(26,26,26,0.06)",
        "card-hover": "0 2px 4px rgba(26,26,26,0.06), 0 16px 40px rgba(26,26,26,0.10)",
        cta: "0 4px 14px rgba(252,100,50,0.30)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        marquee: "marquee 28s linear infinite",
        "fade-up": "fade-up 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
