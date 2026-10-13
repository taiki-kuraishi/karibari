import { oauthProvider } from "@better-auth/oauth-provider";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";

import type { createAuthDatabase } from "./database";

import { createTokenExchangeExtension } from "./token-exchange";

export const apiAudience = "https://api.karibari.tsar-bmb.org/api";
export const mcpAudience = "https://mcp.karibari.tsar-bmb.org/mcp";

// `config` passes no client, so token exchange refuses everyone until the worker injects
// `TOKEN_EXCHANGE_CLIENT_IDS` through `createBetterAuth`.
function createPlugins(tokenExchangeClientIds: readonly string[]) {
  return [
    jwt(),
    oauthProvider({
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      // Provisional resource identifier until the production MCP URL is fixed.
      // DCR cannot link a client to the api audience. After re-registering the remote-mcp
      // Client, insert its client and api (`apiAudience`) row into `oauth_client_resource` in
      // The auth D1 by hand: without it the client cannot use token exchange.
      clientRegistrationDefaultResources: [mcpAudience],
      consentPage: "/consent",
      loginPage: "/sign-in",
      // A client holding an MCP-audience token reaches the API by exchanging it for an
      // API-audience token (RFC 8693, see token-exchange.ts).
      resources: [mcpAudience, apiAudience],
      extensions: [
        createTokenExchangeExtension({
          allowedClientIds: tokenExchangeClientIds,
          sourceAudience: mcpAudience,
          targetAudience: apiAudience,
        }),
      ],
    }),
  ];
}

export const config = {
  basePath: "",
  // CLI-only placeholder: the worker overrides both with env values.
  // `oauth-provider` parses this at init, so it must be a valid URL even here.
  baseURL: "https://auth.karibari.tsar-bmb.org",
  // Overridden by the worker with Secrets. Never commit a real value here.
  secret: "",
  trustedOrigins: ["https://karibari.tsar-bmb.org"],
  socialProviders: {
    // Real credentials come from the worker env. Empty here on purpose.
    github: { clientId: "", clientSecret: "" },
  },
  plugins: createPlugins([]),
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  advanced: {
    crossSubDomainCookies: { enabled: true, domain: "karibari.tsar-bmb.org" },
    // Spec: Lax. httpOnly stays on (better-auth default).
    defaultCookieAttributes: { sameSite: "lax", secure: true },
  },
  // `satisfies` (not a type annotation) so the literal spellings survive for
  // `createBetterAuth`'s override constraint, and a bad option fails here.
} satisfies BetterAuthOptions;

export type AuthConfig = typeof config;

// The CLI resolves its config by default export (or a binding named `auth`).
export default betterAuth(config);

// `database` is required: the worker always injects D1 here (base holds none for CLI use).
export function createBetterAuth(
  override: Partial<AuthConfig> & {
    database: ReturnType<typeof createAuthDatabase>;
    tokenExchangeClientIds: readonly string[];
  },
) {
  const { tokenExchangeClientIds, ...rest } = override;

  return betterAuth({ ...config, plugins: createPlugins(tokenExchangeClientIds), ...rest });
}

export type BetterAuth = ReturnType<typeof createBetterAuth>;
