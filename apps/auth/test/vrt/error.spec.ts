import { expect, test } from "@playwright/test";

test("error invalid request", async ({ page }) => {
  // Arrange

  // Act
  await page.goto("/error?error=invalid_request");

  // Assert
  await expect(page.getByRole("heading", { name: "リクエストを処理できません" })).toBeVisible();
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("error link expired", async ({ page }) => {
  // Arrange

  // Act
  await page.goto("/error?error=state_not_found");

  // Assert
  await expect(page.getByRole("heading", { name: "リンクの有効期限が切れています" })).toBeVisible();
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("error access denied", async ({ page }) => {
  // Arrange

  // Act
  await page.goto("/error?error=access_denied");

  // Assert
  await expect(page.getByRole("heading", { name: "アクセスを許可しませんでした" })).toBeVisible();
  await expect(page).toHaveScreenshot({ fullPage: true });
});
