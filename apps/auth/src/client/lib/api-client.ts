import { hc } from "hono/client";

// Type-only import: the server module must not enter the client bundle.
import type { app } from "../../server";

export const apiClient = hc<typeof app>("/");
