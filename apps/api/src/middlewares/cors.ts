import type { MiddlewareHandler } from "hono";

import { cors } from "hono/cors";

import type { HonoEnv } from "../server";

// Mounted ahead of the auth middleware: a preflight carries no session and would be rejected.
export const corsMiddleware: MiddlewareHandler<HonoEnv> = async (c, next) =>
  await cors({ credentials: true, origin: c.env.VIEWER_ORIGIN })(c, next);
