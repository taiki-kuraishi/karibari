import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";

import { ConsentPage } from "./routes/consent";
import { SignInPage } from "./routes/sign-in";

const rootRoute = createRootRoute({
    component: Outlet,
  }),
  signInRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/sign-in",
    component: SignInPage,
  }),
  consentRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/consent",
    component: ConsentPage,
  }),
  routeTree = rootRoute.addChildren([signInRoute, consentRoute]);

// oxlint-disable-next-line one-var -- Router stays a separate export for TanStack's Register.
export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
