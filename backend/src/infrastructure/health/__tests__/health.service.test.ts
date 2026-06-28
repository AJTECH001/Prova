import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetEnv, mockGetDb, mockExecute } = vi.hoisted(() => ({
  mockGetEnv: vi.fn(),
  mockGetDb: vi.fn(),
  mockExecute: vi.fn(),
}));

vi.mock('../../../core/config.js', () => ({ getEnv: mockGetEnv }));
vi.mock('../../repository/postgres/db.js', () => ({ getDb: mockGetDb }));

import { checkLiveness, checkReadiness } from '../health.service.js';

describe('checkLiveness', () => {
  it('reports ok with uptime and a timestamp', () => {
    const result = checkLiveness();
    expect(result.status).to.equal('ok');
    expect(result.uptimeSeconds).to.be.at.least(0);
    expect(() => new Date(result.timestamp).toISOString()).to.not.throw();
  });
});

describe('checkReadiness', () => {
  beforeEach(() => {
    mockGetEnv.mockReset();
    mockGetDb.mockReset();
    mockExecute.mockReset();
    mockGetDb.mockReturnValue({ execute: mockExecute });
  });

  it('skips the database check for the in-memory provider', async () => {
    mockGetEnv.mockReturnValue({ DB_PROVIDER: 'memory' });
    const result = await checkReadiness();
    expect(result.status).to.equal('ok');
    expect(result.checks.database).to.equal('skipped');
    expect(mockGetDb).not.toHaveBeenCalled();
  });

  it('reports ok when the postgres ping succeeds', async () => {
    mockGetEnv.mockReturnValue({ DB_PROVIDER: 'postgres' });
    mockExecute.mockResolvedValue(undefined);
    const result = await checkReadiness();
    expect(result.status).to.equal('ok');
    expect(result.checks.database).to.equal('ok');
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it('reports degraded when the postgres ping fails', async () => {
    mockGetEnv.mockReturnValue({ DB_PROVIDER: 'postgres' });
    mockExecute.mockRejectedValue(new Error('connection refused'));
    const result = await checkReadiness();
    expect(result.status).to.equal('degraded');
    expect(result.checks.database).to.equal('error');
  });
});
