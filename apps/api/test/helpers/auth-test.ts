import { env, exports } from "cloudflare:workers";
import { expect, test, vi } from "vitest";

import { TestBetterAuthDatabase } from "./test-better-auth-database";

interface AuthFixture {
  headers: Headers;
  userId: string;
}

interface AuthRoute {
  init: RequestInit;
  path: string;
}

const authDatabase = new TestBetterAuthDatabase({
  baseURL: env.AUTH_BASE_URL,
  database: env.AUTH_DB,
});

export const testWithAuth = test.extend<{ auth: AuthFixture }>({
  // oxlint-disable-next-line eslint/no-empty-pattern -- Vitest fixtures require context before `use`.
  auth: async ({}, use) => {
    const userId = crypto.randomUUID();
    const headers = await authDatabase.getAuthHeaders({ userId });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (input: RequestInfo | URL, init?: RequestInit) =>
          await authDatabase.fetch(input, init),
      ),
    );

    await use({ headers, userId });

    vi.unstubAllGlobals();
  },
});

export function authTest(route: AuthRoute) {
  const routeTest = testWithAuth.extend<{ route: AuthRoute }>({ route });

  routeTest("404: rejects an unauthenticated request", async ({ route: target }) => {
    // Arrange
    const request = new Request(new URL(target.path, "http://api"), target.init);
    // Act
    const response = await exports.default.fetch(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });

  return routeTest;
}
