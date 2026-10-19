# AGENTS.md

`@karibari/auth-query` turns the better-auth client's session calls into TanStack Query hooks for
the apps. It is source-only: `exports` point at `./src`, apps consume it as source, and nothing is
built.

## Scope

- In: the auth client's context and provider, the session query hook, and mutation hooks for the
  better-auth calls the apps make (sign-out).
- Out: building the client with `createAuthClient` (origin and base path are the app's job),
  creating the `QueryClient` and its `QueryClientProvider` (the app owns them), deciding where a
  signed-out visitor goes (the app's session gate does that), and the api's routes
  (`@karibari/api-query`).

## Rules

- Same layout and naming as `packages/api-query`: `src/index.ts` lists exports by name,
  `src/query/` and `src/mutation/` hold one hook per file, and `useAuth` reads the provider's
  client for the package's own hooks only.
- The session's query key is `["session"]`. A hook that changes the session invalidates that key
  in `onSuccess`, so every reader, including the app's session gate, sees the new state.
- better-fetch resolves a non-2xx as `{ data: null, error }`. A hook rethrows `error` so a failure
  is never mistaken for "signed out".
- Import `better-auth` as a type only (`import type`). `@tanstack/react-query` and `react` are
  peers; their versions live in the root catalog.
- The package has no tests; `bun run --cwd packages/auth-query type-check` is its only gate.
