/**
 * FOUNDATION · Z-INDEX
 * Mirrors the --z-* CSS variables in globals.css. One scale, no ad-hoc values.
 */
export const zIndex = {
  base: 0,
  sticky: 10,
  header: 50,
  modal: 100,
} as const;

export type ZIndex = typeof zIndex;
