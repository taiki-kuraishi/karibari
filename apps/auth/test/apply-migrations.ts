import { adminSecretsStore, applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

// The Secrets Store binding has no value locally, so its `get()` throws until one is seeded.
// Setup files run outside per-test storage isolation and migrations are idempotent.
await Promise.all([
  applyD1Migrations(env.DB, env.TEST_AUTH_MIGRATIONS),
  adminSecretsStore(env.BETTER_AUTH_SECRET).create(
    "karibari-test-secret-at-least-thirty-two-characters",
  ),
  adminSecretsStore(env.GITHUB_CLIENT_ID).create("test-github-client-id"),
  adminSecretsStore(env.GITHUB_CLIENT_SECRET).create("test-github-client-secret"),
]);
