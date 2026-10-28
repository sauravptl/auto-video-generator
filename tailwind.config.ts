import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        studio: {
          950: "#090a0f",
          900: "#10121a",
          850: "#151824",
          800: "#1a1f2e",
          700: "#262e42",
          600: "#384461",
          500: "#4f5f87",
        },
        accent: {
          purple: "#8b5cf6",
          blue: "#3b82f6",
          emerald: "#10b981",
          pink: "#ec4899",
          amber: "#f59e0b",
        }
      },
    },
  },
  plugins: [],
} satisfies Config;
