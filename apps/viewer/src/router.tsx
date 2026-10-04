import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";

import { NotFoundPage } from "./components/not-found";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});
const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "$",
  component: NotFoundPage,
});
const routeTree = rootRoute.addChildren([notFoundRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
