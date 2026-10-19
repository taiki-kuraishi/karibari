import { expect, test } from "@playwright/test";

test("not found", async ({ page }) => {
  // Arrange

  // Act
  await page.goto("/no/such/path");

  // Assert
  await expect(page.getByRole("heading", { name: "ページが見つかりません" })).toBeVisible();
  await expect(page).toHaveScreenshot({ fullPage: true });
});
