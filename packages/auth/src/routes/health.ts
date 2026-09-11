import { Hono } from "hono";

import type { HonoEnv } from "../server";

// Type-only import: a value import creates a runtime cycle.
export const healthRoute = new Hono<HonoEnv>().get("/", (c) => c.json({ message: "ok" }));
