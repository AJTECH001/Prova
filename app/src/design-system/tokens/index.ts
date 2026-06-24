/**
 * PROVA DESIGN SYSTEM — canonical TypeScript token source.
 * =============================================================================
 * Three tiers: foundation → semantic → component.
 * These values are mirrored 1:1 by the CSS custom properties in
 * src/design-system/styles/*. Keep them synchronized (see scripts/check-tokens).
 *
 * Consume the semantic or component tiers in product code. Never import
 * foundation/color directly, and never hardcode hex in a component.
 * =============================================================================
 */
import {
  palette,
  space,
  radius,
  shadow,
  typography,
  motion,
  zIndex,
} from "./foundation";
import { semantic } from "./semantic";
import {
  button,
  input,
  card,
  table,
  navigation,
  modal,
} from "./component";

export const theme = {
  foundation: {
    palette,
    space,
    radius,
    shadow,
    typography,
    motion,
    zIndex,
  },
  /** Semantic roles — the primary API for product code. */
  semantic,
  component: {
    button,
    input,
    card,
    table,
    navigation,
    modal,
  },
  /**
   * Back-compat alias. Historically components read `theme.colors.brand.primary`;
   * that path now resolves to the semantic action/role layer.
   */
  colors: {
    brand: {
      primary: semantic.action.primary,
      hover: semantic.action.hover,
      active: semantic.action.active,
      subtle: semantic.action.subtle,
    },
    bg: {
      page: semantic.background.page,
      section: semantic.background.section,
      card: semantic.card.background,
    },
    text: semantic.text,
    border: semantic.border,
    success: semantic.success,
    warning: semantic.warning,
    error: semantic.error,
    info: semantic.info,
    neutral: semantic.neutral,
    dataViz: semantic.dataViz,
  },
} as const;

export type Theme = typeof theme;

export { palette, space, radius, shadow, typography, motion, zIndex, semantic };
export { button, input, card, table, navigation, modal };

export default theme;
