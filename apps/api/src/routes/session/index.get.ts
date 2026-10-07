import { Hono } from "hono";

import type { HonoEnv } from "../../server";

export const getSession = new Hono<HonoEnv>().get("", (c) => c.json({ userId: c.get("userId") }));
