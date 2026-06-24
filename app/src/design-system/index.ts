/**
 * PROVA DESIGN SYSTEM — public entry point.
 *
 *   import { theme } from "@/design-system";
 *   theme.semantic.action.primary   // "#0D7377"
 *   theme.component.button.primary   // composed button contract
 *
 * The CSS-variable mirror is loaded via src/app/globals.css.
 */
export * from "./tokens";
export { theme as default } from "./tokens";
