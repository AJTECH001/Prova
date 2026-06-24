/**
 * COMPONENT · MODAL
 * Surface + scrim. Scrim derives from ink.900 for an institutional feel.
 */
import { semantic } from "../semantic";
import { radius } from "../foundation/radius";
import { shadow } from "../foundation/shadow";
import { zIndex } from "../foundation/z-index";

export const modal = {
  background: semantic.surface.default,
  border: semantic.border.light,
  scrim: "rgba(10, 25, 41, 0.48)",
  shadow: shadow.xl,
  radius: radius.lg,
  zIndex: zIndex.modal,
} as const;

export type Modal = typeof modal;
