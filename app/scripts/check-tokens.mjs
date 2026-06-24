#!/usr/bin/env node
/**
 * Token sync guard — fails if the canonical hex palette in
 * src/design-system/tokens/foundation/color.ts is not also present (as the
 * inline hex comment) in src/design-system/styles/foundation.css.
 *
 * Run: node scripts/check-tokens.mjs   (wire into CI / pre-commit)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tsSrc = readFileSync(
  resolve(root, "src/design-system/tokens/foundation/color.ts"),
  "utf8",
);
const cssSrc = readFileSync(
  resolve(root, "src/design-system/styles/foundation.css"),
  "utf8",
);

// Absolutes (#FFFFFF/#000000) are intentional literals, not themed --ds-* vars.
const ABSOLUTES = new Set(["#FFFFFF", "#000000"]);
const hexes = [...tsSrc.matchAll(/#[0-9A-Fa-f]{6}\b/g)]
  .map((m) => m[0].toUpperCase())
  .filter((h) => !ABSOLUTES.has(h));
const cssHexes = new Set(
  [...cssSrc.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map((m) => m[0].toUpperCase()),
);

const missing = [...new Set(hexes)].filter((h) => !cssHexes.has(h));

if (missing.length) {
  console.error(
    "✗ Token drift: hex values in color.ts but not in foundation.css:\n  " +
      missing.join("\n  "),
  );
  process.exit(1);
}
console.log(
  `✓ Tokens synchronized — ${new Set(hexes).size} canonical colors present in both sources.`,
);
