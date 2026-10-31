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
type ScreenRow = Extract<
  ResponseBody<
    (typeof apiClient.api.projects)[":project_id"]["versions"][":version_id"]["screens"]["$get"]
  >,
  { screens: unknown }
>["screens"][number];
type CommentRow = Extract<
  ResponseBody<
    (typeof apiClient.api.projects)[":project_id"]["versions"][":version_id"]["comments"]["$get"]
  >,
  { comments: unknown }
>["comments"][number];

// Must equal `VITE_API_ORIGIN` in `apps/viewer/.env`: the bundle under test calls this origin.
const apiOrigin = "https://api.karibari.com";
const authOrigin = "https://auth.karibari.com";

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

function newComment(
  fields: Pick<CommentRow, "body" | "parent_id" | "screen_id" | "target">,
): CommentRow {
  return {
    ...fields,
    author: "user-1",
    created_at: Math.floor(Date.now() / 1000),
    id: crypto.randomUUID(),
    project_id: "project",
    resolved_at: null,
    source: "viewer",
    updated_at: null,
    version_id: "version",
  };
}

// `project` and `versions` are served for any project id, `screens` for any version id and
// `screenContent` for any screen id: one project per test.
// Leaving `project` out leaves GET /api/projects/:project_id on the catch-all 404.
export async function stubApi({
  comments = [],
  page,
  project,
  projects = [],
  screenContent = "",
  screens = [],
  session = true,
  versions = [],
}: {
  // Seeds the version's comments; POSTs below append to this list, so a test sees its own writes.
  comments?: CommentRow[];
  page: Page;
  project?: ProjectBody;
  projects?: ProjectRow[];
  screenContent?: string;
  screens?: ScreenRow[];
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
  // Sign-out flips this, so the session gate's next get-session sees no session.
  let signedIn = session;
  await page.route(`${authOrigin}/api/auth/get-session`, async (route) => {
    await fulfill({
      json: signedIn
        ? {
            session: { id: "session-1" },
            user: { id: "user-1", name: "Taiki", email: "taiki@example.com", image: null },
          }
        : null,
      route,
    });
  });
  await page.route(`${authOrigin}/api/auth/sign-out`, async (route) => {
    signedIn = false;
    await fulfill({ json: { success: true }, route });
  });
  await page.route(`${authOrigin}/sign-in*`, async (route) => {
    await route.fulfill({ body: "", contentType: "text/html" });
  });
  await page.route(`${apiOrigin}/api/projects`, async (route) => {
    await fulfill({ json: { projects }, route });
  });
  // The home grid reads these for the listed projects; no test needs their rows yet.
  await page.route(`${apiOrigin}/api/versions?*`, async (route) => {
    await fulfill({ json: { versions: [] }, route });
  });
  await page.route(`${apiOrigin}/api/comments?*`, async (route) => {
    await fulfill({ json: { comments: [] }, route });
  });
  await page.route(`${apiOrigin}/api/shares?*`, async (route) => {
    await fulfill({ json: { shares: [] }, route });
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
  await page.route(/\/api\/projects\/[^/]+\/versions\/[^/]+\/screens$/, async (route) => {
    await fulfill({ json: { screens }, route });
  });
  await page.route(/\/api\/projects\/[^/]+\/versions\/[^/]+\/comments$/, async (route) => {
    const request = route.request();

    if (request.method() !== "POST") {
      await fulfill({ json: { comments }, route });
      return;
    }
    const json: Record<string, unknown> = request.postDataJSON();
    const comment = newComment({
      body: String(json.body),
      parent_id: null,
      screen_id: String(json.screen_id),
      target: String(json.target),
    });
    comments.push(comment);
    await fulfill({ json: { commentId: comment.id }, route, status: 201 });
  });
  await page.route(
    /\/api\/projects\/[^/]+\/versions\/[^/]+\/comments\/[^/]+\/replies$/,
    async (route) => {
      const parentId =
        /comments\/(?<parentId>[^/]+)\/replies$/u.exec(route.request().url())?.groups?.parentId ??
        "";
      const parent = comments.find(({ id }) => id === parentId);
      const json: Record<string, unknown> = route.request().postDataJSON();
      const body = String(json.body);
      const comment = newComment({
        body,
        parent_id: parentId,
        screen_id: parent?.screen_id ?? null,
        target: parent?.target ?? "",
      });
      comments.push(comment);
      await fulfill({ json: { commentId: comment.id }, route, status: 201 });
    },
  );
  await page.route(
    /\/api\/projects\/[^/]+\/versions\/[^/]+\/screens\/[^/]+\/content$/,
    async (route) => {
      // Fetched with credentials for the iframe's `srcdoc`, so it needs the CORS headers too.
      await route.fulfill({
        body: screenContent,
        contentType: "text/html",
        headers: {
          "access-control-allow-credentials": "true",
          "access-control-allow-origin": route.request().headers().origin ?? "*",
        },
      });
    },
  );
}
