import { Hono } from "hono";

import { healthRoute } from "./routes/health";
import { mcpRoute } from "./routes/mcp";
import { oauthProtectedResourceRoute } from "./routes/oauth-protected-resource";

export interface HonoEnv {
  Bindings: Cloudflare.Env;
}

// Single method chain: breaking it loses Hono's RPC type inference.
export const app = new Hono<HonoEnv>()
  .route("/health", healthRoute)
  .route("/mcp", mcpRoute)
  .route("/.well-known/oauth-protected-resource/mcp", oauthProtectedResourceRoute);
