import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          0: "#0a0e17",
          1: "#0f1420",
          2: "#151c2c",
          3: "#1b2438",
          4: "#222d45",
        },
        border: {
          DEFAULT: "#1e2a3e",
          hover: "#2a3a54",
          active: "#3a4f6e",
        },
        accent: {
          DEFAULT: "#3b82f6",
          hover: "#60a5fa",
          muted: "#1e3a5f",
        },
        profit: {
          DEFAULT: "#22c55e",
          muted: "#14532d",
          bg: "rgba(34, 197, 94, 0.08)",
        },
        loss: {
          DEFAULT: "#ef4444",
          muted: "#7f1d1d",
          bg: "rgba(239, 68, 68, 0.08)",
        },
        text: {
          primary: "#e2e8f0",
          secondary: "#94a3b8",
          muted: "#64748b",
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        pulse_slow: "pulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
