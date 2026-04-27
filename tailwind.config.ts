import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Primary blue ──────────────────────────────────────────────
        primary: {
          DEFAULT: "#2563EB",
          hover:   "#1D4ED8",
          dark:    "#1E40AF",
          50:      "#EFF6FF",
          100:     "#DBEAFE",
          200:     "#BFDBFE",
          500:     "#3B82F6",
          600:     "#2563EB",
          700:     "#1D4ED8",
          800:     "#1E40AF",
        },
        // ── Sidebar ───────────────────────────────────────────────────
        sidebar: {
          bg:       "#071B3A",
          secondary:"#0B2550",
          active:   "#2563EB",
          text:     "#CBD5E1",
          section:  "#94A3B8",
        },
        // ── App surfaces ──────────────────────────────────────────────
        app: {
          bg:     "#F8FAFC",
          card:   "#FFFFFF",
          border: "#E2E8F0",
          soft:   "#EDF2F7",
        },
        // ── Text ──────────────────────────────────────────────────────
        strong:  "#0F172A",
        normal:  "#334155",
        muted:   "#64748B",
        faint:   "#94A3B8",
        // ── Semantic ──────────────────────────────────────────────────
        success: {
          DEFAULT: "#16A34A",
          bg:      "#DCFCE7",
          border:  "#BBF7D0",
        },
        warning: {
          DEFAULT: "#D97706",
          bg:      "#FEF3C7",
          border:  "#FDE68A",
        },
        danger: {
          DEFAULT: "#DC2626",
          bg:      "#FEE2E2",
          border:  "#FECACA",
        },
        info: {
          DEFAULT: "#2563EB",
          bg:      "#DBEAFE",
          border:  "#BFDBFE",
        },
        purple: {
          DEFAULT: "#7C3AED",
          bg:      "#EDE9FE",
          border:  "#DDD6FE",
        },
        neutral: {
          bg:     "#F1F5F9",
          text:   "#475569",
          border: "#E2E8F0",
        },
        // Keep slate for backward compat
        brand: {
          50:  "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a8a",
        },
      },
      borderRadius: {
        card:   "16px",
        btn:    "10px",
        input:  "10px",
        badge:  "6px",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px -1px rgb(0 0 0 / 0.05)",
        sidebar: "2px 0 8px 0 rgb(0 0 0 / 0.15)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
