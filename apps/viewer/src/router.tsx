import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";

import { NotFoundPage } from "./components/not-found";
import { HomePage } from "./routes/home";
import { ProjectPage } from "./routes/project";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});
const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/p/$projectId",
  component: ProjectPage,
  notFoundComponent: NotFoundPage,
});
const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "$",
  component: NotFoundPage,
});
const routeTree = rootRoute.addChildren([homeRoute, projectRoute, notFoundRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
