import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";

import { AuthShell } from "./components/auth-shell";
import { NotFoundPage } from "./components/not-found";
import { ConsentPage } from "./routes/consent";
import { ErrorPage } from "./routes/error";
import { SignInPage } from "./routes/sign-in";

const rootRoute = createRootRoute({
  // The shell wraps the root match, so the 404 below renders inside it too.
  shellComponent: AuthShell,
  component: () => (
    <NuqsAdapter>
      <Outlet />
    </NuqsAdapter>
  ),
});
const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-in",
  component: SignInPage,
});
const consentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/consent",
  component: ConsentPage,
});
const errorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/error",
  component: ErrorPage,
});
const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "$",
  component: NotFoundPage,
});
const routeTree = rootRoute.addChildren([signInRoute, consentRoute, errorRoute, notFoundRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
