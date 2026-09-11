import { Hono } from "hono";

import { healthRoute } from "./routes/health";

export interface HonoEnv {
  Bindings: Cloudflare.Env;
}

// Single method chain: breaking it loses Hono's RPC type inference.
export const app = new Hono<HonoEnv>().route("/health", healthRoute);
