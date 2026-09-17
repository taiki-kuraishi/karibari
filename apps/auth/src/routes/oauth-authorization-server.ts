import { Hono } from "hono";

import type { HonoEnv } from "../middlewares/dependency-injection";

export const oauthAuthorizationServerRoute = new Hono<HonoEnv>().get("/", async (c) =>
  c.env.auth.handler(c.req.raw),
);
