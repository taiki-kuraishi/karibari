import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

// Setup files run outside per-test storage isolation and migrations are idempotent.
await Promise.all([
  applyD1Migrations(env.DB, env.TEST_MIGRATIONS),
  applyD1Migrations(env.AUTH_DB, env.TEST_AUTH_MIGRATIONS),
]);
