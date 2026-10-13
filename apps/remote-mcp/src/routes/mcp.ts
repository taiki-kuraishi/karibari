import { createMcpProtectedRequestHandler } from "@better-auth/mcp";
import { createResourceServerChallenge } from "@better-auth/oauth-provider";
import { createMcpServer } from "@karibari/mcp";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { APIError } from "better-auth/api";
import { Hono } from "hono";

import type { HonoEnv } from "../server";

import { TokenExchangeClient } from "../client/token-exchange-client";
import { createKvDpopReplayStore } from "../dpop-replay-store";
import { SubjectTokenRejectedError } from "../errors/token-exchange-errors";

// Better-auth's `basePath: "/api/auth"` makes `ctx.context.baseURL` (and thus
// The JWT `iss` claim) include that path segment; see `withPath` in
// `better-auth` 1.7.3's `dist/utils/url.mjs`.
const AUTH_ISSUER = "https://auth.karibari.tsar-bmb.org/api/auth";
const MCP_AUDIENCE = "https://mcp.karibari.tsar-bmb.org/mcp";
const API_AUDIENCE = "https://api.karibari.tsar-bmb.org/api";
// Auth's token endpoint is a same-zone Worker call; a slow answer means it is unhealthy.
const TOKEN_EXCHANGE_TIMEOUT_MS = 10_000;

export const mcpRoute = new Hono<HonoEnv>().all("/", async (c) =>
  createMcpProtectedRequestHandler(
    {
      audience: MCP_AUDIENCE,
      dpop: { replayStore: createKvDpopReplayStore(c.env.DPOP_REPLAY) },
      issuer: AUTH_ISSUER,
      jwksUrl: `${AUTH_ISSUER}/jwks`,
    },
    async (request, accessTokenClaims) => {
      const subjectToken = request.headers.get("Authorization")?.split(" ", 2)[1];
      const userId = accessTokenClaims.sub;

      if (!subjectToken || typeof userId !== "string") {
        return c.json({ error: "unauthorized" }, 401);
      }

      // The MCP token is audience-bound to this server; the API only accepts one issued for it.
      const exchanged = await new TokenExchangeClient({
        clientId: c.env.MCP_CLIENT_ID,
        clientSecret: c.env.MCP_CLIENT_SECRET,
        resource: API_AUDIENCE,
        timeoutMs: TOKEN_EXCHANGE_TIMEOUT_MS,
        tokenUrl: c.env.AUTH_TOKEN_URL,
      }).exchange({ subjectToken });

      if (exchanged.isErr()) {
        const { error } = exchanged;

        // Only a rejected subject_token is fixed by signing in again; the rest is our fault or auth's.
        if (error instanceof SubjectTokenRejectedError) {
          const challenge = createResourceServerChallenge(
            new APIError("UNAUTHORIZED", { message: error.message }),
            MCP_AUDIENCE,
          );

          const wwwAuthenticate = new Headers(challenge?.headers).get("WWW-Authenticate");

          if (wwwAuthenticate) {
            c.header("WWW-Authenticate", wwwAuthenticate);
          }

          // Same JSON-RPC body as the 401 `createMcpProtectedRequestHandler` itself returns.
          return c.json(
            { error: { code: -32_000, message: error.message }, id: null, jsonrpc: "2.0" },
            401,
          );
        }

        console.error({ error, reason: "token_exchange_failed" });

        return c.json({ error: "token_exchange_failed" }, 502);
      }

      // The MCP SDK 1.30.0 stateless transport throws when reused
      // ("Stateless transport cannot be reused across requests"); build one per request.
      const server = createMcpServer({
        apiBaseUrl: c.env.API_BASE_URL,
        token: exchanged.value,
        userId,
      });
      const transport = new WebStandardStreamableHTTPServerTransport({
        enableJsonResponse: true,
        sessionIdGenerator: undefined,
      });

      await server.connect(transport);

      return transport.handleRequest(request);
    },
  )(c.req.raw),
);
