import { expect, test } from "@playwright/test";

test("consent initial render", async ({ page }) => {
  // Arrange

  // Act
  await page.goto("/consent?client_id=example-app&scope=openid%20profile%20email");

  // Assert
  await expect(page.getByRole("heading", { name: "アクセスの許可" })).toBeVisible();
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("consent empty query", async ({ page }) => {
  // Arrange

  // Act
  await page.goto("/consent");

  // Assert
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("consent unknown scope", async ({ page }) => {
  // Arrange

  // Act
  await page.goto("/consent?client_id=example-app&scope=custom_scope");

  // Assert
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("consent pending", async ({ page }) => {
  // Arrange
  await page.route("**/api/auth/**", () => {});
  await page.goto("/consent?client_id=example-app&scope=openid%20profile%20email");

  // Act
  await page.getByRole("button", { name: "許可する" }).click();
  await expect(page.getByRole("button", { name: "許可する" })).toBeDisabled();

  // Assert
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("consent submit error", async ({ page }) => {
  // Arrange
  await page.route("**/api/auth/**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ code: "FAILED", message: "Failed" }),
      contentType: "application/json",
      status: 500,
    });
  });
  await page.goto("/consent?client_id=example-app&scope=openid%20profile%20email");

  // Act
  await page.getByRole("button", { name: "許可する" }).click();
  await expect(
    page.getByText("リクエストを処理できませんでした。アプリケーションからやり直してください。"),
  ).toBeVisible();

  // Assert
  await expect(page).toHaveScreenshot({ fullPage: true });
});
