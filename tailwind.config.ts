import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          0: "#080c14",
          1: "#0d1220",
          2: "#121929",
          3: "#182133",
          4: "#1e2a3e",
        },
        border: {
          DEFAULT: "#1a2540",
          hover: "#253354",
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
          bg: "rgba(34,197,94,0.08)",
        },
        gain: {
          DEFAULT: "#22c55e",
        },
        loss: {
          DEFAULT: "#ef4444",
          muted: "#7f1d1d",
          bg: "rgba(239,68,68,0.08)",
        },
        text: {
          primary: "#e8edf5",
          secondary: "#94a3b8",
          muted: "#5a6a82",
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      boxShadow: {
        "glow-sm":     "0 0 12px -2px rgba(59,130,246,0.25)",
        "glow-md":     "0 0 24px -4px rgba(59,130,246,0.35)",
        "glow-accent": "0 0 32px -6px rgba(59,130,246,0.4)",
        "glow-profit": "0 0 20px -4px rgba(34,197,94,0.3)",
        "card":        "0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)",
        "card-hover":  "0 2px 8px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.3)",
        "elevated":    "0 4px 24px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.4)",
      },
      animation: {
        "fade-in":        "fadeIn 0.25s ease-out",
        "slide-up":       "slideUp 0.35s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "pulse-slow":     "pulse 3s ease-in-out infinite",
        "breathe":        "breathe 4s ease-in-out infinite",
        "shimmer":        "shimmer 1.8s linear infinite",
        "float":          "float 6s ease-in-out infinite",
        "glow-pulse":     "glowPulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.7", transform: "scale(1.08)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 12px -2px rgba(59,130,246,0.2)" },
          "50%": { boxShadow: "0 0 28px -2px rgba(59,130,246,0.5)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
