/**
 * FOUNDATION · COLOR
 * =============================================================================
 * Raw, context-free color values. This is the ONLY place hex literals are
 * allowed to live. Nothing in the app should import from here directly —
 * consume the semantic layer instead (background/text/action/...).
 *
 * Every value below is taken verbatim from the official Prova Design System.
 * Trade Credit Teal (#0D7377) is the only brand color. No new colors, no
 * invented brand variants. If a value is not in this file, it does not exist.
 * =============================================================================
 */

export const palette = {
  /** Trade Credit Teal — the only brand color. */
  teal: {
    600: "#0D7377", // brand.primary
    700: "#095C5F", // brand.hover
    800: "#074548", // brand.active
    50: "#E6F4F4", // brand.subtle / info.bg
    border: "#99D5D8", // info.border
  },

  /** Navy/slate text ramp. */
  ink: {
    900: "#0A1929", // text.primary
    700: "#2D3748", // neutral.text
    600: "#4A5568", // text.secondary / neutral.main
    400: "#8896A4", // text.tertiary
    300: "#C1CBD4", // text.disabled
  },

  /** Neutral surfaces. */
  surface: {
    page: "#FAFBFC",
    section: "#F0F4F4",
    subtle: "#F7F8FA", // neutral.bg
    white: "#FFFFFF",
  },

  /** Neutral borders. */
  line: {
    light: "#E8ECF0",
    default: "#D1D9E0",
    strong: "#A3AFBB",
  },

  /** Status — green. */
  green: {
    main: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    text: "#065F46",
  },

  /** Status — amber. */
  amber: {
    main: "#D97706",
    bg: "#FFFBEB",
    border: "#FCD34D",
    text: "#92400E",
  },

  /** Status — red. */
  red: {
    main: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
    text: "#991B1B",
  },

  /** Data-visualization only — never used for UI chrome, never extended. */
  dataViz: {
    revenue: "#0D7377",
    risk: "#D97706",
    protected: "#059669",
    claims: "#E11D48",
    exposure: "#475569",
    health: "#4ECDC4",
  },

  /** Absolutes. */
  common: {
    white: "#FFFFFF",
    black: "#000000",
  },
} as const;

export type Palette = typeof palette;
