import { hc } from "hono/client";

// Type-only, so the server's runtime never enters a client bundle.
import type { app } from "./server";

// Callers get the typed RPC surface without importing `app` themselves.
export const createApiClient = (...args: Parameters<typeof hc>) => hc<typeof app>(...args);
