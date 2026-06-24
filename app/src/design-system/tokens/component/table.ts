/**
 * COMPONENT · TABLE
 * Dashboards: readability first. No gradients, no colored backgrounds behind
 * large data sets. Brand color indicates action/importance only.
 */
import { semantic } from "../semantic";

export const table = {
  headerBackground: semantic.background.section,
  headerText: semantic.text.secondary,
  rowBackground: semantic.surface.default,
  rowHover: semantic.surface.hover,
  rowBorder: semantic.border.light,
  cellText: semantic.text.primary,
} as const;

export type Table = typeof table;
