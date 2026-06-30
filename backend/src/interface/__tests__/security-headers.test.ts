import { describe, it, expect, vi } from 'vitest';
import { applySecurityHeaders, SECURITY_HEADERS } from '../security-headers.js';

describe('applySecurityHeaders', () => {
  it('sets every baseline security header', () => {
    const setHeader = vi.fn();
    applySecurityHeaders({ setHeader });

    expect(setHeader).toHaveBeenCalledTimes(Object.keys(SECURITY_HEADERS).length);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(setHeader).toHaveBeenCalledWith(name, value);
    }
  });

  it('locks down the key headers expected by API security baselines', () => {
    expect(SECURITY_HEADERS['X-Content-Type-Options']).to.equal('nosniff');
    expect(SECURITY_HEADERS['X-Frame-Options']).to.equal('DENY');
    expect(SECURITY_HEADERS['Content-Security-Policy']).to.contain("default-src 'none'");
    expect(SECURITY_HEADERS['Strict-Transport-Security']).to.contain('max-age=');
  });
});
