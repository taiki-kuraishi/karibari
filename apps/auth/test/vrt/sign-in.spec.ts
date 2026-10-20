import type { Page } from "@playwright/test";

import { expect, test } from "@playwright/test";

// Route mocks must distinguish endpoints: the client calls get-session for the
// Login state and public-client-prelogin for the signed client name, so a
// Blanket `**/api/auth/**` abort would hide which call each state exercises.
const SIGNED_QUERY =
  "client_id=example-app&redirect_uri=https%3A%2F%2Fapp.example%2Fcb&scope=openid+profile&ba_param=client_id&ba_param=redirect_uri&ba_param=scope&ba_param=exp&ba_param=ba_iat&ba_param=ba_param&exp=9999999999&ba_iat=1000000000000&sig=testsig";
const CLIENT_NAME = "Example App";
const CALLBACK_URL = "https://app.example/cb";

async function mockSignedClient(page: Page) {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      body: JSON.stringify(null),
      contentType: "application/json",
    });
  });
  await page.route("**/api/auth/oauth2/public-client-prelogin", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ client_id: "example-app", client_name: CLIENT_NAME }),
      contentType: "application/json",
    });
  });
}

async function mockSignedOut(page: Page) {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      body: JSON.stringify(null),
      contentType: "application/json",
    });
  });
}

test("sign-in plain render", async ({ page }) => {
  // Arrange
  await mockSignedOut(page);

  // Act
  await page.goto("/sign-in");
  await page.locator("main").waitFor();

  // Assert
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("sign-in external app render", async ({ page }) => {
  // Arrange
  await mockSignedClient(page);

  // Act
  await page.goto(`/sign-in?${SIGNED_QUERY}`);
  await page.locator("main button").waitFor();

  // Assert
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("sign-in external app mobile", async ({ page }) => {
  // Arrange
  await page.setViewportSize({ height: 900, width: 390 });
  await mockSignedClient(page);

  // Act
  await page.goto(`/sign-in?${SIGNED_QUERY}`);
  await page.locator("main button").waitFor();

  // Assert
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("sign-in pending", async ({ page }) => {
  // Arrange
  await mockSignedClient(page);
  await page.goto(`/sign-in?${SIGNED_QUERY}`);
  await page.route("**/api/auth/sign-in/social", () => {});
  await page.locator("main button").waitFor();

  // Act
  await page.locator("main button").click();
  await page.locator("main button[disabled]").waitFor();

  // Assert
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("sign-in login error", async ({ page }) => {
  // Arrange
  await mockSignedOut(page);
  await page.route("**/api/auth/sign-in/social", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ code: "FAILED", message: "Failed" }),
      contentType: "application/json",
      status: 500,
    });
  });
  await page.goto("/sign-in");
  await page.locator("main button").waitFor();

  // Act
  await page.locator("main button").click();
  await page.locator("main [role='alert']").waitFor();

  // Assert
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("sign-in expired", async ({ page }) => {
  // Arrange
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      body: JSON.stringify(null),
      contentType: "application/json",
    });
  });
  await page.route("**/api/auth/oauth2/public-client-prelogin", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ code: "UNAUTHORIZED", message: "Unauthorized" }),
      contentType: "application/json",
      status: 401,
    });
  });

  // Act
  await page.goto(`/sign-in?${SIGNED_QUERY}`);
  await page.locator("main h1").waitFor();

  // Assert
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("sign-in cancelled", async ({ page }) => {
  // Arrange
  await mockSignedOut(page);

  // Act
  await page.goto(`/sign-in?callbackURL=${encodeURIComponent(CALLBACK_URL)}&error=access_denied`);
  await page.locator("main [role='alert']").waitFor();

  // Assert
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("sign-in transport error", async ({ page }) => {
  // Arrange
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      body: JSON.stringify(null),
      contentType: "application/json",
    });
  });
  await page.route("**/api/auth/oauth2/public-client-prelogin", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ code: "FAILED", message: "Failed" }),
      contentType: "application/json",
      status: 500,
    });
  });

  // Act
  await page.goto(`/sign-in?${SIGNED_QUERY}`);
  await page.locator("main h1").waitFor();

  // Assert
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("sign-in verifying", async ({ page }) => {
  // Arrange
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      body: JSON.stringify(null),
      contentType: "application/json",
    });
  });
  // 検証前は未検証のアプリ名も確認後の説明も出さず、通常のログイン表示に留まる。
  const gate = Promise.withResolvers();
  await page.route("**/api/auth/oauth2/public-client-prelogin", async (route) => {
    setTimeout(gate.resolve, 2000);
    await gate.promise;
    await route.fulfill({
      body: JSON.stringify({ client_id: "example-app", client_name: CLIENT_NAME }),
      contentType: "application/json",
    });
  });

  // Act
  await page.goto(`/sign-in?${SIGNED_QUERY}`);
  await page.locator("main h1").waitFor();

  // Assert
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("sign-in continue error", async ({ page }) => {
  // Arrange: ログイン済みで開くと自動再開が走る。continue を 500 にすると
  // RequestError の Alert が出てボタンは隠れない（再試行できる）。
  const sessionBody = JSON.stringify({
    session: {
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      id: "session-id",
      token: "session-token",
      updatedAt: new Date().toISOString(),
      userId: "user-id",
    },
    user: {
      createdAt: new Date().toISOString(),
      email: "user@example.com",
      emailVerified: true,
      id: "user-id",
      name: "Example User",
      updatedAt: new Date().toISOString(),
    },
  });
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({ body: sessionBody, contentType: "application/json" });
  });
  await page.route("**/api/auth/oauth2/public-client-prelogin", async (route) => {
    const clientBody = JSON.stringify({ client_id: "example-app", client_name: CLIENT_NAME });
    await route.fulfill({ body: clientBody, contentType: "application/json" });
  });
  await page.route("**/api/auth/oauth2/continue", async (route) => {
    const failureBody = JSON.stringify({ code: "FAILED", message: "Failed" });
    await route.fulfill({ body: failureBody, contentType: "application/json", status: 500 });
  });

  // Act
  await page.goto(`/sign-in?${SIGNED_QUERY}`);
  await page.locator("main [role='alert']").waitFor();

  // Assert
  await expect(page).toHaveScreenshot({ fullPage: true });
});
