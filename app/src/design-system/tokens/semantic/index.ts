/**
 * SEMANTIC TOKENS
 * =============================================================================
 * Roles, not raw colors. This is the layer product code and the Tailwind
 * `@theme` block consume. Each role references a foundation value — never a
 * new hex. Renaming a role here is the supported way to re-theme the product.
 * =============================================================================
 */
import { palette } from "../foundation/color";

export const semantic = {
  /** Page-level background. */
  background: {
    page: palette.surface.page,
    section: palette.surface.section,
    subtle: palette.surface.subtle,
  },

  /** Raised surfaces sitting on the background. */
  surface: {
    default: palette.surface.white,
    subtle: palette.surface.subtle,
    hover: palette.surface.subtle,
    active: palette.teal[50],
  },

  /** Card container. */
  card: {
    background: palette.surface.white,
    border: palette.line.light,
  },

  /** Text hierarchy. */
  text: {
    primary: palette.ink[900],
    secondary: palette.ink[600],
    tertiary: palette.ink[400],
    disabled: palette.ink[300],
    onBrand: palette.common.white,
  },

  /** Dividers and outlines. */
  border: {
    light: palette.line.light,
    default: palette.line.default,
    strong: palette.line.strong,
  },

  /** Primary action / brand. Trade Credit Teal — the only brand color. */
  action: {
    primary: palette.teal[600],
    hover: palette.teal[700],
    active: palette.teal[800],
    subtle: palette.teal[50],
    onAction: palette.common.white,
  },

  /** Status — success. */
  success: {
    main: palette.green.main,
    bg: palette.green.bg,
    border: palette.green.border,
    text: palette.green.text,
  },

  /** Status — warning. */
  warning: {
    main: palette.amber.main,
    bg: palette.amber.bg,
    border: palette.amber.border,
    text: palette.amber.text,
  },

  /** Status — error. */
  error: {
    main: palette.red.main,
    bg: palette.red.bg,
    border: palette.red.border,
    text: palette.red.text,
  },

  /** Status — info (teal family, never blue). */
  info: {
    main: palette.teal[600],
    bg: palette.teal[50],
    border: palette.teal.border,
    text: palette.teal[700],
  },

  /** Neutral chip / muted UI. */
  neutral: {
    main: palette.ink[600],
    bg: palette.surface.subtle,
    border: palette.line.default,
    text: palette.ink[700],
  },

  /** Charts only. */
  dataViz: palette.dataViz,
} as const;

export type Semantic = typeof semantic;
