import { config, createAuthDatabase } from "@karibari/better-auth";
import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";

const TEST_SECRET = "karibari-test-secret-at-least-thirty-two-characters";
const createTestBetterAuth = (args: { baseURL: string; database: D1Database }) =>
  betterAuth({
    ...config,
    basePath: "/api/auth",
    baseURL: args.baseURL,
    database: createAuthDatabase(args.database),
    plugins: [testUtils()] as const,
    secret: TEST_SECRET,
  });

export class TestBetterAuthDatabase {
  readonly #auth: ReturnType<typeof createTestBetterAuth>;

  public constructor(args: { baseURL: string; database: D1Database }) {
    this.#auth = createTestBetterAuth(args);
  }

  public async fetch(input: RequestInfo | URL, init?: RequestInit) {
    return this.#auth.handler(new Request(input, init));
  }

  public async getAuthHeaders(args: { userId: string }) {
    const context = await this.#auth.$context;
    const { test } = context;
    const user = test.createUser({
      id: args.userId,
      email: `${args.userId}@example.com`,
      emailVerified: true,
      name: "Test User",
    });

    await test.saveUser(user);

    return test.getAuthHeaders({ userId: user.id });
  }
}
