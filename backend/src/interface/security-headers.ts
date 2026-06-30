/** Minimal shape needed to set response headers (works for Vercel + node http). */
interface HeaderSettable {
  setHeader(name: string, value: string): unknown;
}

/**
 * Baseline security response headers for a JSON API. Dependency-free
 * (helmet-equivalent), safe for non-browser API clients, and applied to every
 * response by the router.
 *
 * - nosniff: stop MIME sniffing of responses.
 * - frame-ancestors / X-Frame-Options: this API must never be framed.
 * - default-src 'none': API returns JSON only — disallow any resource loading
 *   should a response ever be rendered as a document.
 * - HSTS: enforce HTTPS (ignored by browsers over plain http, so dev-safe).
 * - Permissions-Policy: disable powerful browser features by default.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'X-DNS-Prefetch-Control': 'off',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=(), browsing-topics=()',
};

export function applySecurityHeaders(res: HeaderSettable): void {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(name, value);
  }
}
