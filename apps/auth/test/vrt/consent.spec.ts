import type { Page } from "@playwright/test";

import { expect, test } from "@playwright/test";

// The client rebuilds `oauth_query` from the signed keys (`ba_param`) and
// Reads display values back from that string, so the VRT query mirrors the
// Real redirect: only signed keys, plus `sig`.
const SIGNED_QUERY =
  "client_id=example-app&redirect_uri=https%3A%2F%2Fapp.example%2Fcb&scope=openid+profile+email&resource=https%3A%2F%2Fmcp.example%2Fmcp&ba_param=client_id&ba_param=redirect_uri&ba_param=scope&ba_param=resource&ba_param=exp&ba_param=ba_iat&ba_param=ba_param&exp=9999999999&ba_iat=1000000000000&sig=testsig";
const CLIENT_NAME = "Example App";
const SESSION = {
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
};

async function mockConsentPage(page: Page) {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      body: JSON.stringify(SESSION),
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

test("consent render", async ({ page }) => {
  // Arrange
  await mockConsentPage(page);

  // Act
  await page.goto(`/consent?${SIGNED_QUERY}`);
  await page.locator("main h1").waitFor();

  // Assert
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("consent mobile", async ({ page }) => {
  // Arrange
  await page.setViewportSize({ height: 900, width: 390 });
  await mockConsentPage(page);

  // Act
  await page.goto(`/consent?${SIGNED_QUERY}`);
  await page.locator("main h1").waitFor();

  // Assert
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("consent pending", async ({ page }) => {
  // Arrange
  await mockConsentPage(page);
  await page.route("**/api/auth/oauth2/consent", () => {});
  await page.goto(`/consent?${SIGNED_QUERY}`);
  await page.locator("main button").last().waitFor();

  // Act
  await page.locator("main button").last().click();
  await page.locator("main button[disabled]").first().waitFor();

  // Assert
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("consent submit error", async ({ page }) => {
  // Arrange
  await mockConsentPage(page);
  await page.route("**/api/auth/oauth2/consent", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ code: "FAILED", message: "Failed" }),
      contentType: "application/json",
      status: 500,
    });
  });
  await page.goto(`/consent?${SIGNED_QUERY}`);
  await page.locator("main button").last().waitFor();

  // Act
  await page.locator("main button").last().click();
  // 失敗表示の p が出るまで待つ（文言ではなく要素の有無で待つ）。
  await expect.poll(async () => page.locator("main [data-slot=card-footer] p").count()).toBe(1);

  // Assert
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("consent verifying", async ({ page }) => {
  // Arrange
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      body: JSON.stringify(SESSION),
      contentType: "application/json",
    });
  });
  // A slow prelogin must show loading, not the expiry notice: the request is
  // Still being verified, not failed.
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
  await page.goto(`/consent?${SIGNED_QUERY}`);
  await page.locator("main [role='status']").waitFor();

  // Assert
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("consent invalid signature", async ({ page }) => {
  // Arrange
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      body: JSON.stringify(SESSION),
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
  await page.goto(`/consent?${SIGNED_QUERY}`);
  await page.locator("main [role='alert']").waitFor();

  // Assert
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("consent transport error", async ({ page }) => {
  // Arrange
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      body: JSON.stringify(SESSION),
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
  await page.goto(`/consent?${SIGNED_QUERY}`);
  await page.locator("main [role='alert']").waitFor();

  // Assert
  await expect(page).toHaveScreenshot({ fullPage: true });
});
