import { Hono } from "hono";
import * as v from "valibot";

import type { HonoEnv } from "../middlewares/dependency-injection";

import { validator } from "../validator";

const querySchema = v.object({
  callbackURL: v.pipe(v.string(), v.nonEmpty()),
});

export const callbackUrlRoute = new Hono<HonoEnv>().get(
  "/",
  validator("query", querySchema),
  async (c) => {
    const { callbackURL } = c.req.valid("query");

    // Client-side callbackURL values must not be followed blindly, and duplicating the trustedOrigins list here would drift from the auth config. This endpoint reuses better-auth's own `isTrustedOrigin` (the exact check its originCheckMiddleware applies to signIn.social's callbackURL), so both flows validate against the same list with the same matcher.
    const authContext = await c.env.auth.$context;
    if (!authContext.isTrustedOrigin(callbackURL, { allowRelativePaths: true })) {
      return c.json({ error: "untrusted_callback_url" }, 403);
    }

    return c.json({ callbackURL });
  },
);
