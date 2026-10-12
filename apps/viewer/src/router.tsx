import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";

import { NotFoundPage } from "./components/not-found";
import { HomePage } from "./routes/home";
import { ProjectPage } from "./routes/project";
import { SessionGate } from "./routes/session-gate";

const rootRoute = createRootRoute({
  component: () => (
    <NuqsAdapter>
      <Outlet />
    </NuqsAdapter>
  ),
});
const sessionGateRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "session-gate",
  component: SessionGate,
});
const homeRoute = createRoute({
  getParentRoute: () => sessionGateRoute,
  path: "/",
  component: HomePage,
});
const projectRoute = createRoute({
  getParentRoute: () => sessionGateRoute,
  path: "/p/$projectId",
  component: ProjectPage,
  notFoundComponent: NotFoundPage,
});
const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "$",
  component: NotFoundPage,
});
const routeTree = rootRoute.addChildren([
  sessionGateRoute.addChildren([homeRoute, projectRoute]),
  notFoundRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
