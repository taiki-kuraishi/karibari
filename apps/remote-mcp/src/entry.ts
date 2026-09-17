import { z } from "zod";

import { app } from "./server";

// Better-auth's zod usage put zod's classic module in an import cycle.
// Esbuild's lazy init for that cycle isn't reentrancy-safe.
// A mid-init re-entry can leave `ZodCustom` unset.
// `@modelcontextprotocol/sdk` then crashes its top-level `z.custom(...)` with
// "Class2 is not a constructor" (measured 2026-09-15: wrangler 4.127.1,
// Esbuild 0.28.1, zod 4.6.2).
// This forces that init to finish, uninterrupted, before anything re-enters it.
void z.string();

export default { fetch: app.fetch } satisfies ExportedHandler<Cloudflare.Env>;
