import { expect, test } from "@playwright/test";

import { stubApi } from "../helpers/api-stub";

test("`/` でカードを押すと `/p/:projectId` へ移動する", async ({ page }) => {
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
  await page.getByRole("link", { name: /ランディングページ/ }).click();

  // Assert
  await expect(page).toHaveURL(`/p/${projectId}`);
});

test("`/` で 2 ページ目を押すと `?page=2` になる", async ({ page }) => {
  // Arrange
  // One more project than a page holds, so a second page exists.
  await stubApi({
    page,
    projects: Array.from({ length: 25 }, (_, index) => ({
      created_at: 1_760_000_000,
      id: `project-${index}`,
      name: `案件 ${index}`,
      owner: "user-1",
      updated_at: 1_760_000_100,
    })),
  });
  await page.goto("/");

  // Act
  // Base UI's Button gives the pagination anchors `role="button"`.
  await page.getByRole("button", { name: "2", exact: true }).click();

  // Assert
  await expect(page).toHaveURL("/?page=2");
});

test("`/` でログアウトするとサインインへ移動する", async ({ baseURL, page }) => {
  // Arrange
  await stubApi({ page });
  const openedUrl = new URL("/", baseURL).href;
  await page.goto(openedUrl);
  await page.getByRole("button", { name: "ユーザーメニュー" }).click();

  // Act
  await page.getByRole("menuitem", { name: "ログアウト" }).click();

  // Assert
  await expect(page).toHaveURL(
    `https://auth.karibari.tsar-bmb.org/sign-in?callbackURL=${encodeURIComponent(openedUrl)}`,
  );
});
