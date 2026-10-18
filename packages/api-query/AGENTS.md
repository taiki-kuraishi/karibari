# AGENTS.md

`@karibari/api-query` turns the api's REST routes into TanStack Query hooks (queries and mutations)
for the apps.
It is source-only: `exports` point at `./src`, apps consume it as source, and nothing is built.

## Scope

- In: the api client's context and provider, one query hook per GET route the apps read, and one
  mutation hook per write route (PATCH / DELETE / POST) the apps call.
- Out: building the client (origin and cookies are the app's job), creating the `QueryClient` and
  its `QueryClientProvider` (the app owns them; a mutation hook only reads the client through
  `useQueryClient`), and any shaping of a response (the app's view hook does that).

## Layout

- `src/index.ts` is the only public surface. List each export by name; never `export *`.
- `src/query/` holds the query hooks flat: one file per route, no per-resource subdirectories.
- `src/mutation/` holds the mutation hooks the same way.
- `src/context.ts`, `src/provider.tsx` and `src/use-api.ts` hold the client's context, its
  provider and the hook that reads it. `useApi` serves the package's own hooks, so `index.ts`
  leaves it out.

## Rules

- 1 route = 1 file. Name a list route in the plural and a one-item route in the singular
  (`use-projects-query.ts`, `use-project-query.ts`). A route nested under a parent takes its
  immediate parent's name as a prefix (`/api/projects/:id/versions` → `use-project-versions-query.ts`,
  `…/versions/:vid/screens` → `use-version-screens-query.ts`), so the bare plural stays free for the
  top-level batch route (`/api/versions` → `use-versions-query.ts`).
- Never hand-write a type. `data` is the route's 200 body (what `InferResponseType<…, 200>` gives),
  `null` (404) or `undefined` (loading), inferred through `parseResponse`; a hook's return type
  stays inferred.
- `queryFn` returns `null` on 404 and throws on any other non-2xx through hono's `parseResponse`
  (a `DetailedError`, re-exported from `index.ts` for the apps). The api answers "missing",
  "not yours" and "signed out" with the same 404, so the hook reports it as a result. A hook
  returns the response as it arrives; retry, mapping and formatting belong to the app.
- A hook that reads a screen's main data calls `useQuery`; `data === undefined` means loading, and
  the app's view hook turns that into its own `status`. A failure with no data reaches the app's
  Error Boundary through its `QueryClient` `throwOnError`, so a hook neither sets `throwOnError`
  nor reads `error`.
- The provider takes the api client, not an origin. The app renders `ApiQueryProvider` inside
  its own `QueryClientProvider`.
- Import `@karibari/api` as a type only (`import type`). `@tanstack/react-query` and `react` are
  peers; their versions live in the root catalog.
- The package has no tests; `bun run --cwd packages/api-query type-check` is its only gate.
- A mutation hook is named `use-<verb>-<resource>-mutation.ts` (`use-rename-project-mutation.ts`).
  Its `mutationFn` takes the route's request object as hono types it (`InferRequestType`, e.g.
  `{ param: { project_id }, json: { name } }`) and returns `parseResponse`'s body; any non-2xx, 404
  included, throws so the app reads it from the mutation's `error`.
- A mutation hook invalidates, in `onSuccess`, the query keys whose data the write changed. Query
  keys follow the route's path, so a prefix such as `["projects"]` also reaches
  `["projects", projectId]`. Anything else the app does after a write stays in the app.
- A query hook whose screen-specific options vary (`enabled`, `placeholderData`) takes them as
  `options?: Omit<UseQueryOptions<Data>, "queryFn" | "queryKey">`, with `Data` derived from the
  route (`InferResponseType<Route, 200> | null`), and spreads them before `queryFn` and `queryKey`.
  When an id list can be empty, the app passes `enabled: ids.length > 0`; a batch route answers
  400 to an empty list.

## Adding a query hook

1. Copy `src/query/use-projects-query.ts` to `src/query/use-<resource>-query.ts`.
2. Rename the hook and point the client call at the new route. Each route param becomes an
   argument of the hook.
3. Set the query key to the route's path with params as values: `["projects"]`,
   `["projects", projectId]`, `["projects", projectId, "versions"]`. A batch route's id list is the
   value after its path: `["versions", projectIds]`.
4. Add one line to `src/index.ts`: `export { use<Resource>Query } from "./query/use-<resource>-query";`
5. Run `bun run --cwd packages/api-query type-check`.
