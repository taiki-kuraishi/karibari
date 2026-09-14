import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "./auth-schema";

// D1 type comes from drizzle-orm's own declaration; the package has no
// @cloudflare/workers-types dependency and tsconfig.base sets `types: []`.
export const createAuthDatabase = (d1: Parameters<typeof drizzle>[0]) =>
  drizzleAdapter(drizzle(d1), { provider: "sqlite", schema });
