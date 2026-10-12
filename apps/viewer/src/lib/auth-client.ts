import { createAuthClient } from "better-auth/client";

// No `credentials` option: the client sends the session cookie cross-origin by default.
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_ORIGIN,
  basePath: "/api/auth",
});
