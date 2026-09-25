import { config, createAuthDatabase } from "@karibari/better-auth";
import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { getPlatformProxy } from "wrangler";

// The port the e2e webServer serves the Worker on; e2e.playwright.config.ts derives the served origin from the same override.
const port = Number(process.env.KARIBARI_AUTH_E2E_PORT ?? 3101);
export const baseURL = `http://auth.karibari.tsar-bmb.org:${port}`;

// Mirrors apps/api/test/helpers/test-better-auth-database.ts: the production config plus Test Utils, with the worker-only overrides replaced by what the local E2E origin needs. Never touch the production config in packages/better-auth/src/auth.ts.
const createTestBetterAuth = (args: { database: D1Database; secret: string }) =>
  betterAuth({
    ...config,
    basePath: "/api/auth",
    baseURL,
    database: createAuthDatabase(args.database),
    secret: args.secret,
    plugins: [...config.plugins, testUtils()],
    // The served Worker keeps the production cookie security, which is unsendable over this plain-http origin.
    // Issuing non-secure cookies here is test-only: the Worker reads the session by cookie name, which better-auth accepts with or without the `__Secure-` prefix.
    advanced: {
      ...config.advanced,
      defaultCookieAttributes: { sameSite: "lax", secure: false },
    },
  });

// Named at the module that owns the value instead of leaking `ReturnType` through the API.
type TestBetterAuth = ReturnType<typeof createTestBetterAuth>;

export class TestBetterAuthDatabase {
  readonly #auth: TestBetterAuth;
  readonly #proxy: Awaited<ReturnType<typeof getPlatformProxy<Cloudflare.Env>>>;

  private constructor(
    proxy: Awaited<ReturnType<typeof getPlatformProxy<Cloudflare.Env>>>,
    auth: TestBetterAuth,
  ) {
    this.#proxy = proxy;
    this.#auth = auth;
  }

  public static async open(): Promise<TestBetterAuthDatabase> {
    // The proxy must never fall back to a remote binding even if wrangler.jsonc later marks one `remote: true`: reset() deletes every row of the local D1.
    // The E2E persistence is isolated in `.wrangler/e2e`; wrangler's `--persist-to` appends a `v3` subdir, so getPlatformProxy's `persist.path` must include it too (verified against the on-disk layout).
    const proxy = await getPlatformProxy<Cloudflare.Env>({
      configPath: "./wrangler.jsonc",
      remoteBindings: false,
      persist: { path: ".wrangler/e2e/v3" },
    });
    const auth = createTestBetterAuth({
      database: proxy.env.DB,
      secret: await proxy.env.BETTER_AUTH_SECRET.get(),
    });

    return new TestBetterAuthDatabase(proxy, auth);
  }

  public getBetterAuthInstance(): TestBetterAuth {
    return this.#auth;
  }

  public async getTestBetterAuth() {
    const context = await this.#auth.$context;

    return context.test;
  }

  // The served Worker and this instance cannot share a transaction, so the reset deletes every better-auth row from the shared D1; the table list is enumerated from sqlite_master and excludes wrangler/system tables.
  // The served Worker writes the same SQLite files concurrently, so transient D1 contention is retried a bounded number of times instead of failing the test.
  public async reset(attemptsLeft = 3): Promise<void> {
    try {
      const tables = await this.#proxy.env.DB.prepare(
        String.raw`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\_%' ESCAPE '\' AND name != 'd1_migrations'`,
      ).all<{ name: string }>();
      // Sessions and accounts reference users, so the user table is emptied last.
      const tableNames = tables.results
        .map((table) => table.name)
        .filter((name) => name !== "user");
      tableNames.push("user");
      const statements = tableNames.map((name) =>
        this.#proxy.env.DB.prepare(`DELETE FROM "${name}"`),
      );
      await this.#proxy.env.DB.batch(statements);
    } catch (error) {
      if (attemptsLeft <= 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      await this.reset(attemptsLeft - 1);
    }
  }

  public async close(): Promise<void> {
    await this.#proxy.dispose();
  }
}
