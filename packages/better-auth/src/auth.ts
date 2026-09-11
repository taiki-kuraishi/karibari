import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { type BetterAuthOptions, betterAuth } from "better-auth";

import * as schema from "./auth-schema";

const baseConfig = {
  basePath: "",
  baseURL: "",
  // Overridden by the worker with Secrets. Never commit a real value here.
  secret: "",
  // Real database is injected by the worker. CLI generate does not need a live DB.
  database: drizzleAdapter({}, { provider: "sqlite", schema }),
  socialProviders: {
    // Real credentials come from the worker env. Empty here on purpose.
    github: { clientId: "", clientSecret: "" },
  },
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
export function createBetterAuth(override: Partial<AuthConfig>) {
  return betterAuth({ ...baseConfig, ...override });
}

export type BetterAuth = ReturnType<typeof createBetterAuth>;
