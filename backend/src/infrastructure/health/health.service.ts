import { sql } from 'drizzle-orm';
import { getEnv } from '../../core/config.js';
import { getDb } from '../repository/postgres/db.js';

const PROCESS_STARTED_AT = Date.now();

export type HealthState = 'ok' | 'degraded';
export type DependencyState = 'ok' | 'skipped' | 'error';

export interface LivenessStatus {
  status: HealthState;
  uptimeSeconds: number;
  timestamp: string;
}

export interface ReadinessStatus extends LivenessStatus {
  checks: {
    database: DependencyState;
  };
}

/**
 * Liveness: is the process up and able to respond? Intentionally cheap and
 * dependency-free so orchestrator health checks never cascade-fail on a slow
 * downstream dependency.
 */
export function checkLiveness(): LivenessStatus {
  return {
    status: 'ok',
    uptimeSeconds: Math.floor((Date.now() - PROCESS_STARTED_AT) / 1000),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Readiness: can the service handle traffic right now? Verifies critical
 * dependencies. With the in-memory provider the database check is skipped;
 * with postgres it issues a lightweight `SELECT 1`.
 */
export async function checkReadiness(): Promise<ReadinessStatus> {
  const base = checkLiveness();

  if (getEnv().DB_PROVIDER !== 'postgres') {
    return { ...base, checks: { database: 'skipped' } };
  }

  try {
    await getDb().execute(sql`select 1`);
    return { ...base, checks: { database: 'ok' } };
  } catch {
    return { ...base, status: 'degraded', checks: { database: 'error' } };
  }
}
