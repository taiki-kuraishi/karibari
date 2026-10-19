import { expect, test } from "@playwright/test";

// The browser makes the request: only it maps the auth host to the local Worker.
test("better-auth のエラーは SPA の /error へ 302 で送られる", async ({ page }) => {
  // Arrange

  // Act
  const response = await page.goto("/api/auth/error?error=access_denied");

  // Assert
  const redirect = await response?.request().redirectedFrom()?.response();
  expect(redirect?.status()).toBe(302);
  await expect(page).toHaveURL("/error?error=access_denied");
});
