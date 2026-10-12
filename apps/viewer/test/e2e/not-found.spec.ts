import { expect, test } from "@playwright/test";

import { stubApi } from "../helpers/api-stub";

test("404 画面の「ホームへ戻る」を押すと `/` に移動する", async ({ page }) => {
  // Arrange
  await stubApi({ page });
  await page.goto("/no/such/path");

  // Act
  await page.getByRole("button", { name: "ホームへ戻る" }).click();

  // Assert
  await expect(page).toHaveURL("/");
});
