import type { Page, Route } from "@playwright/test";

import type { apiClient } from "../../src/lib/api-client";

// `@karibari/api/client` exports no named response types, so read the body type off the endpoint.
type ResponseBody<Endpoint> = Endpoint extends (
  ...args: never[]
) => Promise<{ json: () => Promise<infer Body> }>
  ? Body
  : never;
type ProjectRow = ResponseBody<typeof apiClient.api.projects.$get>["projects"][number];

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

export async function stubApi({ page, projects = [] }: { page: Page; projects?: ProjectRow[] }) {
  // Playwright runs the most recently registered matching route first, so this catch-all goes first and the stubs below override it.
  // Whatever no stub claims must still never reach a real Worker.
  await page.route(
    (url) => url.origin === apiOrigin || url.origin === authOrigin,
    async (route) => {
      await fulfill({ json: { error: "not_found" }, route, status: 404 });
    },
  );
  await page.route(`${apiOrigin}/api/projects`, async (route) => {
    await fulfill({ json: { projects }, route });
  });
}
