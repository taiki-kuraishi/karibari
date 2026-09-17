import { expect, test } from "@playwright/test";

test("sign-in initial render", async ({ page }) => {
  // Arrange

  // Act
  await page.goto("/sign-in");

  // Assert
  await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
  await expect(page.getByRole("button", { name: "GitHubでログインする" })).toBeVisible();
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("sign-in pending", async ({ page }) => {
  // Arrange
  await page.route("**/api/auth/**", () => {});
  await page.goto("/sign-in");

  // Act
  await page.getByRole("button", { name: "GitHubでログインする" }).click();
  await expect(page.getByRole("button", { name: "ログインしています…" })).toBeVisible();

  // Assert
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("sign-in login error", async ({ page }) => {
  // Arrange
  await page.route("**/api/auth/**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ code: "FAILED", message: "Failed" }),
      contentType: "application/json",
      status: 500,
    });
  });
  await page.goto("/sign-in");

  // Act
  await page.getByRole("button", { name: "GitHubでログインする" }).click();
  await expect(
    page.getByText("ログインに失敗しました。時間をおいて再度お試しください。"),
  ).toBeVisible();

  // Assert
  await expect(page).toHaveScreenshot({ fullPage: true });
});
