// Global test environment baseline.
// Sets required env vars before any module-level code (e.g. getLogger) runs.
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-that-is-at-least-32-chars-long';
