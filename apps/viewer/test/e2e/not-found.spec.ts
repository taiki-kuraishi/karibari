import { expect, test } from "@playwright/test";

test("404 画面の「ホームへ戻る」を押すと `/` に移動する", async ({ page }) => {
  // Arrange
  await page.goto("/p/xyz");

  // Act
  await page.getByRole("button", { name: "ホームへ戻る" }).click();

  // Assert
  await expect(page).toHaveURL("/");
});
