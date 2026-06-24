/**
 * FOUNDATION · TYPOGRAPHY
 * System font stack (institutional, no webfont dependency). Type scale and
 * weights follow an enterprise hierarchy — clarity over decoration.
 */
export const typography = {
  fontFamily: {
    sans: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    mono: "'SF Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  fontSize: {
    xs: "0.75rem", // 12
    sm: "0.875rem", // 14
    base: "1rem", // 16
    lg: "1.125rem", // 18
    xl: "1.25rem", // 20
    "2xl": "1.5rem", // 24
    "3xl": "1.875rem", // 30
    "4xl": "2.25rem", // 36
    "5xl": "3rem", // 48
  },
  fontWeight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeight: {
    tight: "1.2",
    snug: "1.4",
    normal: "1.6",
  },
  letterSpacing: {
    tight: "-0.02em",
    normal: "0em",
    wide: "0.02em",
  },
} as const;

export type Typography = typeof typography;
