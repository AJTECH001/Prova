/**
 * FOUNDATION · MOTION
 * Mirrors the --ease-* / --duration-* CSS variables in globals.css.
 */
export const motion = {
  easing: {
    smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
    spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  },
  duration: {
    fast: "150ms",
    base: "200ms",
    slow: "300ms",
  },
} as const;

export type Motion = typeof motion;
