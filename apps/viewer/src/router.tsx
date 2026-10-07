import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";

import { NotFoundPage } from "./components/not-found";
import { HomePage } from "./routes/home";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});
const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "$",
  component: NotFoundPage,
});
const routeTree = rootRoute.addChildren([homeRoute, notFoundRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
