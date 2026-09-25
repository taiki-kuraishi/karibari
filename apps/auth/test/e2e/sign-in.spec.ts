import { expect, test } from "@playwright/test";

import { baseURL, TestBetterAuthDatabase } from "../helpers/test-better-auth-database";

const VIEWER_URL = "https://karibari.tsar-bmb.org/app";

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

test.afterEach(async () => {
  await authBackend.reset();
});

// GitHub and the external viewer origin stay mocked so nothing leaves the machine; every auth-server endpoint is the real Worker.
test("未ログインで GitHub ログインを押すと GitHub の認可画面へ移動する", async ({ page }) => {
  // Arrange
  await page.route("https://github.com/**", async (route) => {
    await route.fulfill({ body: "github", status: 200 });
  });

  // Act
  await page.goto(`/sign-in?callbackURL=${encodeURIComponent(VIEWER_URL)}`);
  await page.getByRole("button", { name: "GitHubでログインする" }).click();

  // Assert
  await expect(page).toHaveURL(/^https:\/\/github\.com\/login\/oauth\/authorize\?/);
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
  const saved = await betterAuthTest.saveUser(user);
  const cookies = await betterAuthTest.getCookies({ userId: saved.id });
  await page.context().addCookies(cookies);
  await page.route("https://karibari.tsar-bmb.org/**", async (route) => {
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
  const saved = await betterAuthTest.saveUser(user);
  const cookies = await betterAuthTest.getCookies({ userId: saved.id });
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
  const saved = await betterAuthTest.saveUser(user);
  const cookies = await betterAuthTest.getCookies({ userId: saved.id });
  // Anonymous dynamic client registration is enabled in the auth config and carries no Origin.
  const registered = await authBackend.getBetterAuthInstance().api.registerOAuthClient({
    body: {
      application_type: "web",
      redirect_uris: [VIEWER_URL],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code"],
    },
  });
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
  await page.route("https://karibari.tsar-bmb.org/**", async (route) => {
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
  await expect(page).toHaveURL(/^https:\/\/karibari\.tsar-bmb\.org\/app\?/);
});
