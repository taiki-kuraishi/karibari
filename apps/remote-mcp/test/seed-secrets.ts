import { adminSecretsStore } from "cloudflare:test";
import { env } from "cloudflare:workers";

// The Secrets Store binding has no value locally, so its `get()` throws until one is seeded.
await adminSecretsStore(env.MCP_CLIENT_SECRET).create("test-client-secret");
