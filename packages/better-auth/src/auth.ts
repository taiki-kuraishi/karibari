import { oauthProvider } from "@better-auth/oauth-provider";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";

import type { createAuthDatabase } from "./database";

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
  plugins: [
    jwt(),
    oauthProvider({
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      // Provisional resource identifier until the production MCP URL is fixed.
      clientRegistrationDefaultResources: ["https://mcp.karibari.tsar-bmb.org/mcp"],
      consentPage: "/consent",
      loginPage: "/sign-in",
      resources: ["https://mcp.karibari.tsar-bmb.org/mcp"],
    }),
  ],
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
  override: Partial<AuthConfig> & { database: ReturnType<typeof createAuthDatabase> },
) {
  return betterAuth({ ...config, ...override });
}

export type BetterAuth = ReturnType<typeof createBetterAuth>;
