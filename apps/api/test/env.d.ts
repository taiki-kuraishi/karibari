// Test-only bindings defined in `vitest.config.ts`.
declare namespace Cloudflare {
  interface Env {
    AUTH_DB: D1Database;
    TEST_AUTH_MIGRATIONS: { name: string; queries: string[] }[];
    TEST_MIGRATIONS: { name: string; queries: string[] }[];
  }
}
