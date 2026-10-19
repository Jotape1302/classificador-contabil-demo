import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--bg-canvas)",
        sidebar: "var(--bg-sidebar)",
        elevated: "var(--bg-elevated)",
        border: "var(--border-color)",
        copper: "var(--brand-copper, #C8753D)",
        action: "var(--brand-action, #F08A3E)",
        title: "var(--text-title)",
        muted: "var(--text-muted)",
        success: "#35B47A",
        danger: "#E05D5D",
        warning: "#E5A93C",
      },
      boxShadow: {
        copper: "0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(200, 117, 61, 0.08)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
} satisfies Config;
