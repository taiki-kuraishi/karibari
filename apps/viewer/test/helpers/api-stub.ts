import type { Page, Route } from "@playwright/test";

import type { apiClient } from "@/lib/api-client";

// `@karibari/api/client` exports no named response types, so read the body type off the endpoint.
type ResponseBody<Endpoint> = Endpoint extends (
  ...args: never[]
) => Promise<{ json: () => Promise<infer Body> }>
  ? Body
  : never;
type ProjectRow = ResponseBody<typeof apiClient.api.projects.$get>["projects"][number];
type ProjectBody = Extract<
  ResponseBody<(typeof apiClient.api.projects)[":project_id"]["$get"]>,
  { project: unknown }
>;
type VersionRow = Extract<
  ResponseBody<(typeof apiClient.api.projects)[":project_id"]["versions"]["$get"]>,
  { versions: unknown }
>["versions"][number];

// Must equal `VITE_API_ORIGIN` in `apps/viewer/.env`: the bundle under test calls this origin.
const apiOrigin = "https://api.karibari.tsar-bmb.org";
const authOrigin = "https://auth.karibari.tsar-bmb.org";

// The viewer is served from another origin than the api, and the port it runs on is configurable.
// So the caller's own origin is echoed back instead of a fixed one.
async function fulfill({
  json,
  route,
  status = 200,
}: {
  json: unknown;
  route: Route;
  status?: number;
}) {
  const { origin } = route.request().headers();

  // No `Origin` header means no CORS request (an iframe's navigation, say), so it needs no CORS headers.
  if (origin === undefined) {
    await route.fulfill({ json, status });
    return;
  }

  await route.fulfill({
    headers: {
      "access-control-allow-credentials": "true",
      "access-control-allow-origin": origin,
    },
    json,
    status,
  });
}

// `project` and `versions` are served for any project id, and `content` for any version id: one project per test.
// Leaving `project` out leaves GET /api/projects/:project_id on the catch-all 404.
export async function stubApi({
  content = "",
  page,
  project,
  projects = [],
  session = true,
  versions = [],
}: {
  content?: string;
  page: Page;
  project?: ProjectBody;
  projects?: ProjectRow[];
  // GET /api/auth/get-session answers `null` when there is no session.
  session?: boolean;
  versions?: VersionRow[];
}) {
  // Playwright runs the most recently registered matching route first, so this catch-all goes first and the stubs below override it.
  // Whatever no stub claims must still never reach a real Worker.
  await page.route(
    (url) => url.origin === apiOrigin || url.origin === authOrigin,
    async (route) => {
      await fulfill({ json: { error: "not_found" }, route, status: 404 });
    },
  );
  await page.route(`${authOrigin}/api/auth/get-session`, async (route) => {
    await fulfill({
      json: session ? { session: { id: "session-1" }, user: { id: "user-1" } } : null,
      route,
    });
  });
  await page.route(`${authOrigin}/sign-in*`, async (route) => {
    await route.fulfill({ body: "", contentType: "text/html" });
  });
  await page.route(`${apiOrigin}/api/projects`, async (route) => {
    await fulfill({ json: { projects }, route });
  });

  if (project === undefined) {
    return;
  }

  await page.route(/\/api\/projects\/[^/]+$/, async (route) => {
    await fulfill({ json: project, route });
  });
  await page.route(/\/api\/projects\/[^/]+\/versions$/, async (route) => {
    await fulfill({ json: { versions }, route });
  });
  await page.route(/\/api\/projects\/[^/]+\/versions\/[^/]+\/content$/, async (route) => {
    await route.fulfill({ body: content, contentType: "text/html" });
  });
}
