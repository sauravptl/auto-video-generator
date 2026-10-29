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
          950: "var(--studio-950)",
          900: "var(--studio-900)",
          850: "var(--studio-850)",
          800: "var(--studio-800)",
          700: "var(--studio-700)",
          600: "var(--studio-600)",
          500: "var(--studio-500)",
        },
        brand: {
          lime: "#BFF97E",
          mint: "#98F899",
          glow: "#CCFFEA",
          dark: "#0c0f0c",
          surface: "#121612",
          surfaceHover: "#182018",
          black: "#000000",
        },
        accent: {
          lime: "#BFF97E",
          mint: "#98F899",
          glow: "#CCFFEA",
          purple: "#8b5cf6",
          blue: "#3b82f6",
          emerald: "#10b981",
          pink: "#ec4899",
          amber: "#f59e0b",
        }
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "SF Pro",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
