/**
 * FOUNDATION · SHADOW
 * Navy-tinted elevation. Mirrors the --shadow-* CSS variables in globals.css.
 * Tint derives from ink.900 (#0A1929) for an institutional, low-noise feel.
 */
export const shadow = {
  sm: "0 1px 2px rgba(10, 25, 41, 0.05)",
  card: "0 1px 3px rgba(10, 25, 41, 0.08), 0 1px 2px rgba(10, 25, 41, 0.04)",
  md: "0 4px 6px -1px rgba(10, 25, 41, 0.10)",
  lg: "0 10px 15px -3px rgba(10, 25, 41, 0.10)",
  xl: "0 20px 25px -5px rgba(10, 25, 41, 0.10)",
} as const;

export type Shadow = typeof shadow;
