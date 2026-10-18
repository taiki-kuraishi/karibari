import { ApiQueryProvider } from "@karibari/api-query";
import { AuthQueryProvider } from "@karibari/auth-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles.css";
import { apiClient } from "./lib/api-client";
import { authClient } from "./lib/auth-client";
import { router } from "./router";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { throwOnError: (_error, query) => query.state.data === undefined },
  },
});
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("missing #root element");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthQueryProvider client={authClient}>
        <ApiQueryProvider client={apiClient}>
          <RouterProvider router={router} />
        </ApiQueryProvider>
      </AuthQueryProvider>
    </QueryClientProvider>
  </StrictMode>,
);
