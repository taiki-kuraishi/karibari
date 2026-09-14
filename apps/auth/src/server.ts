import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import type { HonoEnv } from "./middlewares/dependency-injection";

import { injectDependenciesMiddleware } from "./middlewares/dependency-injection";
import { authRoute } from "./routes/auth";
import { healthRoute } from "./routes/health";

// Single method chain: breaking it loses Hono's RPC type inference.
export const app = new Hono<HonoEnv>()
  .use("/api/auth/*", injectDependenciesMiddleware)
  .route("/health", healthRoute)
  .route("/api/auth", authRoute)
  .onError((err, c) => {
    if (err instanceof HTTPException) {
      return err.getResponse();
    }

    console.log({ err });

    return c.json({ error: "Internal Server Error" }, 500);
  });
