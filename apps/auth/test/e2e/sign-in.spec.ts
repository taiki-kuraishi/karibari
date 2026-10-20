import { expect, test } from "@playwright/test";
import { makeSignature } from "better-auth/crypto";

import { baseURL, TestBetterAuthDatabase } from "../helpers/test-better-auth-database";
import { TEST_BETTER_AUTH_SECRET } from "./global-setup";

const VIEWER_URL = "https://app.karibari.com/app";

// One TestBetterAuthDatabase per Playwright worker: the platform proxy behind it starts workerd, which is too expensive to reopen per test. The database itself is wiped in beforeEach/afterEach, so every test starts from a pristine D1.
// oxlint-disable-next-line eslint/init-declarations -- Assigned in beforeAll.
let authBackend: TestBetterAuthDatabase;

test.beforeAll(async () => {
  authBackend = await TestBetterAuthDatabase.open();
});

test.afterAll(async () => {
  await authBackend.close();
});

test.beforeEach(async () => {
  await authBackend.reset();
});

// The served Worker writes the same SQLite files concurrently, so a test-side
// Write colliding with it surfaces as SQLITE_BUSY. Retry the write a bounded
// Number of times instead of failing the test.
async function withBusyRetry<T>(write: () => Promise<T>, attemptsLeft = 5): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if (attemptsLeft <= 1) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    return withBusyRetry(write, attemptsLeft - 1);
  }
}

test.afterEach(async () => {
  await authBackend.reset();
});

// `reset()` wipes every row including the seeded `oauth_resource` rows the
// Plugin creates at startup, so a later DCR fails with `invalid_target`
// (`clientRegistrationDefaultResources` links the mcp resource). Re-seed the
// Row before registering; the served Worker reads the same D1.
async function ensureMcpResource() {
  const context = await authBackend.getBetterAuthInstance().$context;
  const existing = await context.adapter.findOne({
    model: "oauthResource",
    where: [{ field: "identifier", value: "https://mcp.karibari.com/mcp" }],
  });
  if (existing === null) {
    await withBusyRetry(async () =>
      context.adapter.create({
        data: {
          createdAt: new Date(),
          identifier: "https://mcp.karibari.com/mcp",
          name: "https://mcp.karibari.com/mcp",
          updatedAt: new Date(),
        },
        model: "oauthResource",
      }),
    );
  }
}

// GitHub and the external viewer origin stay mocked so nothing leaves the machine; every auth-server endpoint is the real Worker.
test("未ログインで GitHub ログインを押すと、アカウント選択付きで GitHub の認可画面へ移動する", async ({
  page,
}) => {
  // Arrange
  await page.route("https://github.com/**", async (route) => {
    await route.fulfill({ body: "github", status: 200 });
  });

  // Act
  await page.goto(`/sign-in?callbackURL=${encodeURIComponent(VIEWER_URL)}`);
  await page.getByRole("button", { name: "GitHub でログイン" }).click();
  // Assert
  await expect(page).toHaveURL(
    /^https:\/\/github\.com\/login\/oauth\/authorize\?(?:.*&)?prompt=select_account(?:&|$)/,
  );
});

test("ログイン済みで開くと callbackURL へ移動する", async ({ page }) => {
  // Arrange
  const betterAuthTest = await authBackend.getTestBetterAuth();
  const user = betterAuthTest.createUser({
    id: crypto.randomUUID(),
    email: `${crypto.randomUUID()}@example.com`,
    emailVerified: true,
    name: "E2E User",
  });
  const saved = await withBusyRetry(async () => betterAuthTest.saveUser(user));
  const cookies = await withBusyRetry(async () => betterAuthTest.getCookies({ userId: saved.id }));
  await page.context().addCookies(cookies);
  await page.route("https://app.karibari.com/**", async (route) => {
    await route.fulfill({ body: "viewer", status: 200 });
  });

  // Act
  await page.goto(`/sign-in?callbackURL=${encodeURIComponent(VIEWER_URL)}`);

  // Assert
  await expect(page).toHaveURL(VIEWER_URL);
});

test("ログイン済みでも信頼されていない callbackURL へは移動しない", async ({ page }) => {
  // Arrange
  const betterAuthTest = await authBackend.getTestBetterAuth();
  const user = betterAuthTest.createUser({
    id: crypto.randomUUID(),
    email: `${crypto.randomUUID()}@example.com`,
    emailVerified: true,
    name: "E2E User",
  });
  const saved = await withBusyRetry(async () => betterAuthTest.saveUser(user));
  const cookies = await withBusyRetry(async () => betterAuthTest.getCookies({ userId: saved.id }));
  await page.context().addCookies(cookies);

  // Act
  await page.goto(`/sign-in?callbackURL=${encodeURIComponent("https://evil.example/steal")}`);

  // Assert
  await expect(page).toHaveURL(/\/sign-in\?callbackURL=/);
});

test("OAuth 認可フローでは認可後に client の redirect_uri へ移動する", async ({ page }) => {
  // Arrange
  const betterAuthTest = await authBackend.getTestBetterAuth();
  const user = betterAuthTest.createUser({
    id: crypto.randomUUID(),
    email: `${crypto.randomUUID()}@example.com`,
    emailVerified: true,
    name: "E2E User",
  });
  const saved = await withBusyRetry(async () => betterAuthTest.saveUser(user));
  const cookies = await withBusyRetry(async () => betterAuthTest.getCookies({ userId: saved.id }));
  // Anonymous dynamic client registration is enabled in the auth config and carries no Origin.
  await ensureMcpResource();
  const registered = await withBusyRetry(async () =>
    authBackend.getBetterAuthInstance().api.registerOAuthClient({
      body: {
        application_type: "web",
        redirect_uris: [VIEWER_URL],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code"],
      },
    }),
  );
  // The suite never redeems the code, so a fixed well-formed S256 challenge is enough.
  const challenge = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0";
  const authorizeUrl = new URL(`${baseURL}/api/auth/oauth2/authorize`);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", registered.client_id);
  authorizeUrl.searchParams.set("redirect_uri", VIEWER_URL);
  authorizeUrl.searchParams.set("scope", "openid");
  authorizeUrl.searchParams.set("state", "e2e-state");
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  await page.route("https://app.karibari.com/**", async (route) => {
    await route.fulfill({ body: "viewer", status: 200 });
  });

  // Act
  // An anonymous visit is redirected to the login page with the signed authorization query; signing in through the Test Utils cookies, the page then resumes the flow through /oauth2/continue and the consent page.
  await page.goto(authorizeUrl.toString());
  await expect(page).toHaveURL(/\/sign-in\?/);
  await page.context().addCookies(cookies);
  await page.reload();
  await page.getByRole("button", { name: "許可する" }).click();

  // Assert
  await expect(page).toHaveURL(/^https:\/\/app\.karibari\.com\/app\?/);
});

test("改変した query では GitHub ボタンが出ず再試行できない", async ({ page }) => {
  // Arrange
  const betterAuthTest = await authBackend.getTestBetterAuth();
  const user = betterAuthTest.createUser({
    id: crypto.randomUUID(),
    email: `${crypto.randomUUID()}@example.com`,
    emailVerified: true,
    name: "E2E User",
  });
  const saved = await withBusyRetry(async () => betterAuthTest.saveUser(user));
  const cookies = await withBusyRetry(async () => betterAuthTest.getCookies({ userId: saved.id }));
  await ensureMcpResource();
  const registered = await withBusyRetry(async () =>
    authBackend.getBetterAuthInstance().api.registerOAuthClient({
      body: {
        application_type: "web",
        redirect_uris: [VIEWER_URL],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code"],
      },
    }),
  );
  const challenge = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0";
  const authorizeUrl = new URL(`${baseURL}/api/auth/oauth2/authorize`);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", registered.client_id);
  authorizeUrl.searchParams.set("redirect_uri", VIEWER_URL);
  authorizeUrl.searchParams.set("scope", "openid");
  authorizeUrl.searchParams.set("state", "e2e-state");
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  await page.goto(authorizeUrl.toString());
  await expect(page).toHaveURL(/\/sign-in\?/);
  await page.context().addCookies(cookies);
  const tampered = new URL(page.url());
  tampered.searchParams.set("scope", "openid evil-scope");

  // Act
  await page.goto(tampered.toString());

  // Assert: 改変後は認可が再開できず /sign-in に留まる。表示は VRT（sign-in expired）で見る。
  await expect(page).toHaveURL(/\/sign-in\?/);
});

// A correctly signed but expired query shares the helper shape with the
// Consent spec; each spec owns its OAuth setup, so the re-signing lives here.
// Entry order for the canonical signed query: key first, then value.
function compareQueryEntry(a: [string, string], b: [string, string]): number {
  if (a[0] !== b[0]) {
    return a[0] < b[0] ? -1 : 1;
  }
  if (a[1] !== b[1]) {
    return a[1] < b[1] ? -1 : 1;
  }
  return 0;
}

async function expireSignedQuery(signInUrl: string): Promise<string> {
  const expired = new URL(signInUrl);
  const pastSeconds = Math.floor(Date.now() / 1000) - 60;
  const pastMillis = Date.now() - 3_600_000;
  expired.searchParams.set("exp", String(pastSeconds));
  expired.searchParams.set("ba_iat", String(pastMillis));
  expired.searchParams.delete("sig");
  // The server signs the canonical (key, value) sorted query without `sig`.
  const unsigned = new URLSearchParams(expired.searchParams);
  const entries = unsigned.entries().toArray();
  const sortedEntries = entries.toSorted(compareQueryEntry);
  const sorted = new URLSearchParams(sortedEntries);
  const sig = await makeSignature(sorted.toString(), TEST_BETTER_AUTH_SECRET);
  expired.searchParams.set("sig", sig);

  return expired.toString();
}

test("署名期限切れの query ではボタンが出ず期限切れの案内が出る", async ({ page }) => {
  // Arrange
  const betterAuthTest = await authBackend.getTestBetterAuth();
  const user = betterAuthTest.createUser({
    id: crypto.randomUUID(),
    email: `${crypto.randomUUID()}@example.com`,
    emailVerified: true,
    name: "E2E User",
  });
  const saved = await withBusyRetry(async () => betterAuthTest.saveUser(user));
  const cookies = await withBusyRetry(async () => betterAuthTest.getCookies({ userId: saved.id }));
  await ensureMcpResource();
  const registered = await withBusyRetry(async () =>
    authBackend.getBetterAuthInstance().api.registerOAuthClient({
      body: {
        application_type: "web",
        redirect_uris: [VIEWER_URL],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code"],
      },
    }),
  );
  const challenge = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0";
  const authorizeUrl = new URL(`${baseURL}/api/auth/oauth2/authorize`);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", registered.client_id);
  authorizeUrl.searchParams.set("redirect_uri", VIEWER_URL);
  authorizeUrl.searchParams.set("scope", "openid");
  authorizeUrl.searchParams.set("state", "e2e-state");
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  await page.goto(authorizeUrl.toString());
  await expect(page).toHaveURL(/\/sign-in\?/);
  await page.context().addCookies(cookies);
  const expiredUrl = await expireSignedQuery(page.url());

  // Act
  await page.goto(expiredUrl);

  // Assert: 期限切れでも /sign-in に留まる。表示は VRT（sign-in expired）で見る。
  await expect(page).toHaveURL(/\/sign-in\?/);
});

test("通常ログインの callbackURL 付きでキャンセル戻りすると固定エラーと再試行が出る", async ({
  page,
}) => {
  // Arrange
  await page.route("https://github.com/**", async (route) => {
    await route.fulfill({ body: "github", status: 200 });
  });

  // Act
  // GitHub でのキャンセルは errorCallbackURL（常に /sign-in+現在の query）へ
  // `?error=...` を付けて戻る。成功時の callbackURL（viewer）には戻らない。
  await page.goto(`/sign-in?callbackURL=${encodeURIComponent(VIEWER_URL)}&error=access_denied`);

  // Assert
  // 成功時の callbackURL（viewer）には遷移せず /sign-in に留まる。表示は VRT（sign-in cancelled）で見る。
  await expect(page).toHaveURL(new RegExp(`^${baseURL}/sign-in\\?callbackURL=`));
});
