// Test-only bindings defined in `vitest.config.ts`.
declare namespace Cloudflare {
  interface Env {
    TEST_AUTH_MIGRATIONS: { name: string; queries: string[] }[];
  }
}
