import { expect, test } from "@playwright/test";

import { stubApi } from "../helpers/api-stub";

const projectId = "2f1b6c1e-6a39-4c58-9a0f-6d6a4d0f9a11";

test("`/p/:projectId` で `/` への link を押すと `/` に移動する", async ({ page }) => {
  // Arrange
  await stubApi({
    page,
    project: {
      project: {
        created_at: 1_760_000_000,
        id: projectId,
        name: "ランディングページ",
        owner: "user-1",
        updated_at: 1_760_000_100,
      },
      url: `https://karibari.tsar-bmb.org/p/${projectId}`,
    },
    versions: [
      {
        created_at: 1_760_000_000,
        id: "9c1d1b7e-3b5e-4d7e-8f0a-0d6f6a1c2b33",
        project_id: projectId,
      },
    ],
  });
  await page.goto(`/p/${projectId}`);

  // Act
  await page.getByRole("link", { name: "ホーム" }).click();

  // Assert
  await expect(page).toHaveURL("/");
});

test("`/p/:projectId` が 404 のとき、404 画面の「ホームへ戻る」を押すと `/` に移動する", async ({
  page,
}) => {
  // Arrange
  await stubApi({ page });
  await page.goto(`/p/${projectId}`);

  // Act
  await page.getByRole("button", { name: "ホームへ戻る" }).click();

  // Assert
  await expect(page).toHaveURL("/");
});
