/**
 * COMPONENT · BUTTON
 * Composed from semantic tokens only. Matches the Prova component spec:
 * primary = teal, secondary = transparent + neutral border.
 */
import { semantic } from "../semantic";
import { radius } from "../foundation/radius";

export const button = {
  primary: {
    background: semantic.action.primary,
    backgroundHover: semantic.action.hover,
    backgroundActive: semantic.action.active,
    text: semantic.action.onAction,
    border: "transparent",
  },
  secondary: {
    background: "transparent",
    backgroundHover: semantic.surface.hover,
    text: semantic.text.primary,
    border: semantic.border.default,
  },
  radius: radius.button,
} as const;

export type Button = typeof button;
