/**
 * COMPONENT · CARD
 * White surface, light border (per Prova component spec). No gradients.
 */
import { semantic } from "../semantic";
import { radius } from "../foundation/radius";
import { shadow } from "../foundation/shadow";

export const card = {
  background: semantic.card.background,
  border: semantic.card.border,
  shadow: shadow.card,
  radius: radius.block,
} as const;

export type Card = typeof card;
