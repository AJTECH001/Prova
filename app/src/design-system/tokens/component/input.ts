/**
 * COMPONENT · INPUT
 * Border neutral by default, teal on focus (per Prova component spec).
 */
import { semantic } from "../semantic";
import { radius } from "../foundation/radius";

export const input = {
  background: semantic.surface.default,
  text: semantic.text.primary,
  placeholder: semantic.text.tertiary,
  border: semantic.border.default,
  borderFocus: semantic.action.primary,
  disabledText: semantic.text.disabled,
  radius: radius.input,
} as const;

export type Input = typeof input;
