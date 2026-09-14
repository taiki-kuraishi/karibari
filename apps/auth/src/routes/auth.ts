import { Hono } from "hono";

import type { HonoEnv } from "../middlewares/dependency-injection";

export const authRoute = new Hono<HonoEnv>().on(["POST", "GET"], "/*", async (c) =>
  c.env.auth.handler(c.req.raw),
);
