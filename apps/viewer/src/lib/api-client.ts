import { createApiClient } from "@karibari/api/client";

// The API is cross-origin, so the session cookie has to be sent explicitly.
export const apiClient = createApiClient(import.meta.env.VITE_API_ORIGIN, {
  init: { credentials: "include" },
});
