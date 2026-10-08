import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import type { HonoEnv } from "./middlewares/dependency-injection";

import { corsMiddleware } from "./middlewares/cors";
import { injectDependenciesMiddleware } from "./middlewares/dependency-injection";
import { authRoute } from "./routes/auth";
import { callbackUrlRoute } from "./routes/callback-url";
import { healthRoute } from "./routes/health";
import { oauthAuthorizationServerRoute } from "./routes/oauth-authorization-server";

// Single method chain: breaking it loses Hono's RPC type inference.
export const app = new Hono<HonoEnv>()
  .use("/api/auth/*", corsMiddleware)
  .use("/api/auth/*", injectDependenciesMiddleware)
  .use("/.well-known/oauth-authorization-server/api/auth", injectDependenciesMiddleware)
  .use("/api/callback-url", injectDependenciesMiddleware)
  .route("/health", healthRoute)
  .route("/api/auth", authRoute)
  .route("/api/callback-url", callbackUrlRoute)
  .route("/.well-known/oauth-authorization-server/api/auth", oauthAuthorizationServerRoute)
  .onError((err, c) => {
    if (err instanceof HTTPException) {
      return err.getResponse();
    }

    console.log({ err });

    return c.json({ error: "Internal Server Error" }, 500);
  });
