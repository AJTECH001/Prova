/**
 * FOUNDATION · RADIUS
 * Mirrors the --radius-* CSS variables in globals.css.
 */
export const radius = {
  minimal: "4px",
  subtle: "8px",
  button: "10px",
  input: "10px",
  block: "16px",
  lg: "20px",
  full: "9999px",
} as const;

export type Radius = typeof radius;
