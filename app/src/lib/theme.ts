/**
 * PROVA DESIGN SYSTEM — back-compat shim.
 * =============================================================================
 * The canonical TypeScript source now lives in src/design-system/tokens/*.
 * This file is kept only so existing `@/lib/theme` imports keep working; it
 * re-exports the design system unchanged.
 *
 * Prefer importing from the design system directly in new code:
 *     import { theme } from "@/design-system";
 *     theme.semantic.action.primary    // "#0D7377"
 *     theme.component.button.primary    // button contract
 *
 * `theme.colors.brand.primary` still resolves (mapped to the semantic action
 * role) for legacy call sites.
 * =============================================================================
 */
export * from "@/design-system";
export { theme as default, theme, semantic, palette } from "@/design-system";

import { theme } from "@/design-system";

/** Legacy named export — colors namespace. Prefer `theme.semantic`. */
export const colors = theme.colors;

/**
 * Returns the CSS custom-property reference for a brand/semantic role so a
 * single source (the --ds-* foundation) drives runtime theming.
 * Prefer the generated Tailwind utilities (bg-action-primary, …) where possible.
 */
export function cssVar(
  token:
    | "action.primary"
    | "action.hover"
    | "action.active"
    | "action.subtle"
    | "text.primary"
    | "text.secondary"
    | "text.tertiary"
    | "border.default"
    | "success"
    | "warning"
    | "error"
    | "info",
): string {
  const map: Record<string, string> = {
    "action.primary": "--color-action-primary",
    "action.hover": "--color-action-hover",
    "action.active": "--color-action-active",
    "action.subtle": "--color-action-subtle",
    "text.primary": "--color-text-primary",
    "text.secondary": "--color-text-secondary",
    "text.tertiary": "--color-text-tertiary",
    "border.default": "--color-border-default",
    success: "--color-success",
    warning: "--color-warning",
    error: "--color-error",
    info: "--color-info",
  };
  return `var(${map[token]})`;
}
