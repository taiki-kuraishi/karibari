import { expect, test } from "@playwright/test";

import { stubApi } from "../helpers/api-stub";

test("`/` で行を押すと `/p/:projectId` へ移動する", async ({ page }) => {
  // Arrange
  const projectId = "2f1b6c1e-6a39-4c58-9a0f-6d6a4d0f9a11";
  await stubApi({
    page,
    projects: [
      {
        created_at: 1_760_000_000,
        id: projectId,
        name: "ランディングページ",
        owner: "user-1",
        updated_at: 1_760_000_100,
      },
    ],
  });
  await page.goto("/");

  // Act
  await page.getByRole("link", { name: "ランディングページ" }).click();

  // Assert
  await expect(page).toHaveURL(`/p/${projectId}`);
});
