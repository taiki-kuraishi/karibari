import { createMcpProtectedRequestHandler } from "@better-auth/mcp";
import { createMcpServer, toMcpContext } from "@karibari/mcp";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Hono } from "hono";

import type { HonoEnv } from "../server";

import { createKvDpopReplayStore } from "../dpop-replay-store";

// Better-auth's `basePath: "/api/auth"` makes `ctx.context.baseURL` (and thus
// The JWT `iss` claim) include that path segment; see `withPath` in
// `better-auth` 1.7.3's `dist/utils/url.mjs`.
const AUTH_ISSUER = "https://auth.karibari.tsar-bmb.org/api/auth";
const MCP_AUDIENCE = "https://mcp.karibari.tsar-bmb.org/mcp";

export const mcpRoute = new Hono<HonoEnv>().all("/", async (c) =>
  createMcpProtectedRequestHandler(
    {
      audience: MCP_AUDIENCE,
      dpop: { replayStore: createKvDpopReplayStore(c.env.DPOP_REPLAY) },
      issuer: AUTH_ISSUER,
      jwksUrl: `${AUTH_ISSUER}/jwks`,
    },
    async (request, accessTokenClaims) => {
      const context = toMcpContext(request, accessTokenClaims, c.env.API_BASE_URL);
      if (!context) {
        return c.json({ error: "unauthorized" }, 401);
      }
      // The `@modelcontextprotocol/sdk` 1.30.0 stateless transport throws when reused
      // ("Stateless transport cannot be reused across requests"); build one per request.
      const server = createMcpServer(context);
      const transport = new WebStandardStreamableHTTPServerTransport({
        enableJsonResponse: true,
        sessionIdGenerator: undefined,
      });

      await server.connect(transport);

      return transport.handleRequest(request);
    },
  )(c.req.raw),
);
