import type { MiddlewareHandler } from "hono";

import { config } from "@karibari/better-auth";
import { cors } from "hono/cors";

import type { HonoEnv } from "./dependency-injection";

// The allowlist is better-auth's own `trustedOrigins`, so the viewer origin is not written down a second time.
// Hono sets `Access-Control-Allow-Credentials` even when no origin matched, so credentials are gated on the match too.
// Mounted ahead of the better-auth handler, which serves only GET and POST: a preflight would 404 there.
export const corsMiddleware: MiddlewareHandler<HonoEnv> = async (c, next) =>
  await cors({
    credentials: config.trustedOrigins.includes(c.req.header("origin") ?? ""),
    origin: config.trustedOrigins,
  })(c, next);
