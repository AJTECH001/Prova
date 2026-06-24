/**
 * COMPONENT · NAVIGATION
 * Header / sidebar. Active state uses teal; everything else stays neutral.
 */
import { semantic } from "../semantic";

export const navigation = {
  background: semantic.surface.default,
  border: semantic.border.light,
  itemText: semantic.text.secondary,
  itemTextHover: semantic.text.primary,
  itemActiveText: semantic.action.primary,
  itemActiveBackground: semantic.action.subtle,
} as const;

export type Navigation = typeof navigation;
