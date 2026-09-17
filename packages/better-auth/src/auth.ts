import { oauthProvider } from "@better-auth/oauth-provider";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";

import type { createAuthDatabase } from "./database";

const baseConfig = {
  basePath: "",
  // CLI-only placeholder: the worker overrides both with env values.
  // `oauth-provider` parses this at init, so it must be a valid URL even here.
  baseURL: "https://auth.karibari.tsar-bmb.org",
  // Overridden by the worker with Secrets. Never commit a real value here.
  secret: "",
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
    // Spec: Lax. httpOnly stays on (better-auth default).
    defaultCookieAttributes: { sameSite: "lax", secure: true },
  },
  // `satisfies` (not a type annotation) so the literal spellings survive for
  // `createBetterAuth`'s override constraint, and a bad option fails here.
} satisfies BetterAuthOptions;

export type AuthConfig = typeof baseConfig;

// The CLI resolves its config by default export (or a binding named `auth`).
export default betterAuth(baseConfig);

// A function declaration, not a second module-scope const: `one-var` allows one per file.
// `database` is required: the worker always injects D1 here (base holds none for CLI use).
export function createBetterAuth(
  override: Partial<AuthConfig> & { database: ReturnType<typeof createAuthDatabase> },
) {
  return betterAuth({ ...baseConfig, ...override });
}

export type BetterAuth = ReturnType<typeof createBetterAuth>;
