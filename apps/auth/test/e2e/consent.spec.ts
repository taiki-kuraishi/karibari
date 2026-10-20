import type { Page } from "@playwright/test";

import { expect, test } from "@playwright/test";
import { makeSignature } from "better-auth/crypto";

import { baseURL, TestBetterAuthDatabase } from "../helpers/test-better-auth-database";
import { TEST_BETTER_AUTH_SECRET } from "./global-setup";
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
// Drives DCR and the authorize redirect through page.goto, then returns the
// Signed login-page URL. The browser maps the auth host to the local Worker
// Via `--host-resolver-rules`, so Node-side fetch cannot reach it. Each spec
// Owns its OAuth setup; no shared helper.
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
async function startOAuthFlow(
  page: Page,
  args: {
    redirectUri: string;
    resource?: string;
    scope?: string;
  },
): Promise<{ clientId: string; signInUrl: string }> {
  await ensureMcpResource();
  const registered = await withBusyRetry(async () =>
    authBackend.getBetterAuthInstance().api.registerOAuthClient({
      body: {
        application_type: "web",
        redirect_uris: [args.redirectUri],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code"],
      },
    }),
  );
  const challenge = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0";
  const authorizeUrl = new URL(`${baseURL}/api/auth/oauth2/authorize`);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", registered.client_id);
  authorizeUrl.searchParams.set("redirect_uri", args.redirectUri);
  authorizeUrl.searchParams.set("scope", args.scope ?? "openid profile email");
  authorizeUrl.searchParams.set("state", "e2e-state");
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  if (args.resource !== undefined) {
    authorizeUrl.searchParams.set("resource", args.resource);
  }
  await page.goto(authorizeUrl.toString());
  await expect(page).toHaveURL(/\/sign-in\?/);

  return { clientId: registered.client_id, signInUrl: page.url() };
}

test("同意画面に到達する", async ({ page }) => {
  // Arrange
  const redirectUri = "https://app.karibari.com/app";
  const resource = "https://mcp.karibari.com/mcp";
  const { signInUrl } = await startOAuthFlow(page, { redirectUri, resource });
  const betterAuthTest = await authBackend.getTestBetterAuth();
  const user = betterAuthTest.createUser({
    id: crypto.randomUUID(),
    email: `${crypto.randomUUID()}@example.com`,
    emailVerified: true,
    name: "E2E User",
  });
  const saved = await withBusyRetry(async () => betterAuthTest.saveUser(user));
  const cookies = await withBusyRetry(async () => betterAuthTest.getCookies({ userId: saved.id }));
  await page.route("https://app.karibari.com/**", async (route) => {
    await route.fulfill({ body: "viewer", status: 200 });
  });

  // Act
  await page.goto(signInUrl);
  await page.context().addCookies(cookies);
  await page.reload();

  // Assert: 表示内容は VRT（consent render）で見る。ここでは同意画面への到達のみ見る。
  await expect(page).toHaveURL(/\/consent/);
});

test("許可すると client の redirect_uri へ移動する", async ({ page }) => {
  // Arrange
  const redirectUri = "https://app.karibari.com/app";
  const { signInUrl } = await startOAuthFlow(page, { redirectUri });
  const betterAuthTest = await authBackend.getTestBetterAuth();
  const user = betterAuthTest.createUser({
    id: crypto.randomUUID(),
    email: `${crypto.randomUUID()}@example.com`,
    emailVerified: true,
    name: "E2E User",
  });
  const saved = await withBusyRetry(async () => betterAuthTest.saveUser(user));
  const cookies = await withBusyRetry(async () => betterAuthTest.getCookies({ userId: saved.id }));
  await page.route("https://app.karibari.com/**", async (route) => {
    await route.fulfill({ body: "viewer", status: 200 });
  });

  // Act
  // The authorize redirect already lands on sign-in unsigned-in; sign in with
  // The Test Utils cookies and wait for the resume to reach consent.
  await page.context().addCookies(cookies);
  await page.goto(signInUrl);
  await expect(page).toHaveURL(/\/consent/);
  await page.getByRole("button", { name: "許可する" }).click();

  // Assert
  await expect(page).toHaveURL(/^https:\/\/app\.karibari\.com\/app\?/);
});

test("改変した query では同意の操作が出ない", async ({ page }) => {
  // Arrange
  const redirectUri = "https://app.karibari.com/app";
  const { signInUrl } = await startOAuthFlow(page, { redirectUri });
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

  // Act: 同意画面まで正常到達させ、その consent URL の署名対象値を改変して再訪する。
  // ConsentPage の署名拒否を直接検証する（sign-in 残留では検証にならない）。
  await page.goto(signInUrl);
  await expect(page).toHaveURL(/\/consent/);
  const tampered = new URL(page.url());
  tampered.searchParams.set("scope", "openid profile email evil-scope");
  await page.goto(tampered.toString());

  // Assert: 改変後は同意が再開できず /consent に留まる。同意操作が出ないことは VRT（consent invalid signature）で見る。
  await expect(page).toHaveURL(/\/consent/);
});

test("署名外の scope・resource 追記は表示されず署名済みの値のみ出る", async ({ page }) => {
  // Arrange
  const redirectUri = "https://app.karibari.com/app";
  const { signInUrl } = await startOAuthFlow(page, { redirectUri, scope: "openid" });
  // A new key outside `ba_param` is not part of the signature: prelogin still
  // Succeeds, consent is reached, and only the signed values are displayed.
  // (`scope` is signed, so its value must stay untouched here.)
  const appended = new URL(signInUrl);
  appended.searchParams.append("scope2", "evil-scope");
  appended.searchParams.append("resource", "https://evil.example/mcp");
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
  await page.goto(appended.toString());

  // Assert: 署名外の追記は検証に影響せず /consent に到達する。追記値の非表示は VRT（consent render）で見る。
  await expect(page).toHaveURL(/\/consent/);
});

// A correctly signed but expired query: rewrite `exp`/`ba_iat` to the past
// And re-sign with the same secret the served Worker verifies against. The
// Signature is valid, only the timestamp fails, which is the real expiry path.
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

test("期限切れの query では同意の操作が出ない", async ({ page }) => {
  // Arrange
  const redirectUri = "https://app.karibari.com/app";
  const { signInUrl } = await startOAuthFlow(page, { redirectUri });
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

  // Act: 同意画面まで正常到達させ、その consent URL を正規署名のまま期限切れ化して再訪する。
  await page.goto(signInUrl);
  await expect(page).toHaveURL(/\/consent/);
  const expiredUrl = await expireSignedQuery(page.url());
  await page.goto(expiredUrl);

  // Assert: 期限切れでも /consent に留まる。同意操作が出ないことは VRT（consent invalid signature）で見る。
  await expect(page).toHaveURL(/\/consent/);
});

test("prelogin の通信失敗では同意の操作も期限切れ文言も出ない", async ({ page }) => {
  // Arrange
  const redirectUri = "https://app.karibari.com/app";
  const { signInUrl } = await startOAuthFlow(page, { redirectUri });
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
  // Act: 同意画面まで正常到達させた後、prelogin を abort して再読み込みする。
  // `publicClientPrelogin` 自体が reject する（queryFn の kind 変換を通らない）。
  // 否定ガードだと未検証の同意操作が出る fail-open になるため、肯定条件のみで出す。
  await page.goto(signInUrl);
  await expect(page).toHaveURL(/\/consent/);
  await expect(page.getByRole("button", { name: "許可する" })).toBeVisible();
  await page.route("**/api/auth/oauth2/public-client-prelogin", async (route) => route.abort());
  await page.reload();

  // Assert: 通信失敗でも /consent に留まる。表示は VRT（consent transport error）で見る。
  await expect(page).toHaveURL(/\/consent/);
});
