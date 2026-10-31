import type { Config } from "tailwindcss";

/* Token colors resolve through styles/tokens.css. The callback form keeps the
   /opacity modifiers working with CSS variables (color-mix), so no component
   needs a raw hex value. */
const token = (name: string) =>
  (({ opacityValue }: { opacityValue?: string }) =>
    opacityValue
      ? `color-mix(in oklab, var(--${name}) calc(${opacityValue} * 100%), transparent)`
      : `var(--${name})`) as never;

const colorToken = (name: string) => token(`color-${name}`);

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      /* Every value here resolves through a token in styles/tokens.css.
         No raw colour past this point (Floor 48). */
      colors: {
        transparent: "transparent",
        current: "currentColor",
        background: colorToken("paper"),
        foreground: colorToken("ink"),
        studio: {
          950: token("studio-950"),
          900: token("studio-900"),
          850: token("studio-850"),
          800: token("studio-800"),
          700: token("studio-700"),
          600: token("studio-600"),
          500: token("studio-500"),
        },
        /* surfaces */
        paper: {
          DEFAULT: colorToken("paper"),
          2: colorToken("paper-2"),
          3: colorToken("paper-3"),
        },
        ink: {
          DEFAULT: colorToken("ink"),
          2: colorToken("ink-2"),
        },
        muted: colorToken("muted"),
        rule: colorToken("rule"),
        /* brand: lime accent, mint secondary, frosted glow */
        brand: {
          lime: colorToken("accent"),
          mint: colorToken("accent-2"),
          glow: colorToken("accent-glow"),
          ink: colorToken("accent-ink"),
        },
        accent: {
          DEFAULT: colorToken("accent"),
          lime: colorToken("accent"),
          mint: colorToken("accent-2"),
          glow: colorToken("accent-glow"),
          purple: colorToken("info"),
          blue: colorToken("info"),
          emerald: colorToken("success"),
          pink: colorToken("error"),
          amber: colorToken("warning"),
        },
        state: {
          success: colorToken("success"),
          error: colorToken("error"),
          warning: colorToken("warning"),
          info: colorToken("info"),
        },
        /* semantic aliases that replace the Tailwind palette usage */
        slate: {
          50: colorToken("paper-2"),
          100: colorToken("paper-2"),
          200: colorToken("paper-3"),
          300: colorToken("rule"),
          400: colorToken("muted"),
          500: colorToken("muted"),
          600: colorToken("ink-2"),
          700: colorToken("ink-2"),
          800: colorToken("ink"),
          900: colorToken("ink"),
          950: colorToken("paper"),
        },
        lime: {
          50: colorToken("accent-glow"),
          100: colorToken("accent-glow"),
          200: colorToken("accent-glow"),
          300: colorToken("accent-2"),
          400: colorToken("accent"),
          500: colorToken("accent"),
          600: colorToken("accent"),
          700: colorToken("accent"),
        },
        white: colorToken("ink"),
        black: colorToken("paper"),
        /* media overlays (video chrome, shimmer, scene badges) keep their own
           pair in both modes; they sit on footage, never on the page surface */
        overlay: {
          DEFAULT: colorToken("overlay"),
          ink: colorToken("overlay-ink"),
        },
        emerald: {
          50: colorToken("success-glow"),
          100: colorToken("success-glow"),
          300: colorToken("success"),
          400: colorToken("success"),
          500: colorToken("success"),
          600: colorToken("success"),
        },
        rose: {
          50: colorToken("error-glow"),
          100: colorToken("error-glow"),
          200: colorToken("error-glow"),
          300: colorToken("error"),
          500: colorToken("error"),
          600: colorToken("error"),
        },
        amber: {
          50: colorToken("warning-glow"),
          100: colorToken("warning-glow"),
          300: colorToken("warning"),
          400: colorToken("warning"),
          500: colorToken("warning"),
        },
        blue: {
          100: colorToken("info-glow"),
          300: colorToken("info"),
          500: colorToken("info"),
        },
        indigo: { 100: colorToken("info-glow"), 500: colorToken("info") },
        purple: { 500: colorToken("info") },
        gray: { 300: colorToken("rule") },
      },
      borderRadius: {
        "2xl": "var(--radius-card)",
        card: "var(--radius-card)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
      },
      fontFamily: {
        sans: ["var(--font-body)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-outlier)"],
      },
    },
  },
  plugins: [],
} satisfies Config;
