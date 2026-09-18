import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";
import { Hono } from "hono";

import type { HonoEnv } from "../server";

const resourceClient = oauthProviderResourceClient();

export const oauthProtectedResourceRoute = new Hono<HonoEnv>().get("/", async (c) => {
  const metadata = await resourceClient.getActions().getProtectedResourceMetadata({
    resource: "https://mcp.karibari.tsar-bmb.org/mcp",
    authorization_servers: ["https://auth.karibari.tsar-bmb.org/api/auth"],
  });

  return c.json(metadata);
});
