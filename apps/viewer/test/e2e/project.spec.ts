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
      url: `https://app.karibari.com/p/${projectId}`,
    },
    versions: [
      {
        created_at: 1_760_000_000,
        id: "9c1d1b7e-3b5e-4d7e-8f0a-0d6f6a1c2b33",
        project_id: projectId,
        type: "canvas",
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

test("`/p/:projectId` で canvas の `versions` の行を選ぶと `?v=<versions.id>` に移動する", async ({
  page,
}) => {
  // Arrange
  const olderId = "9c1d1b7e-3b5e-4d7e-8f0a-0d6f6a1c2b33";
  const newerId = "4a7e2c90-1d3f-4b8a-9e6c-5f2b7d8a1c44";

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
      url: `https://app.karibari.com/p/${projectId}`,
    },
    screenContent: "<p>トップ</p>",
    screens: [
      { height: 900, id: "5d3b8f2a-7c1e-4a9b-8e6d-2f4a6c8b0e55", name: "トップ", width: 1440 },
    ],
    versions: [
      { created_at: 1_760_000_000, id: olderId, project_id: projectId, type: "canvas" },
      { created_at: 1_760_000_050, id: newerId, project_id: projectId, type: "full" },
    ],
  });
  await page.goto(`/p/${projectId}`);

  // Act
  await page.getByRole("combobox", { name: "version" }).selectOption(olderId);

  // Assert
  await expect(page).toHaveURL(`/p/${projectId}?v=${olderId}`);
});

test("`/p/:projectId` で full の `versions` の行を選ぶと `?v=<versions.id>` に移動する", async ({
  page,
}) => {
  // Arrange
  const olderId = "9c1d1b7e-3b5e-4d7e-8f0a-0d6f6a1c2b33";
  const newerId = "4a7e2c90-1d3f-4b8a-9e6c-5f2b7d8a1c44";

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
      url: `https://app.karibari.com/p/${projectId}`,
    },
    screenContent: "<p>トップ</p>",
    screens: [
      { height: 900, id: "5d3b8f2a-7c1e-4a9b-8e6d-2f4a6c8b0e55", name: "トップ", width: 1440 },
    ],
    versions: [
      { created_at: 1_760_000_000, id: olderId, project_id: projectId, type: "full" },
      { created_at: 1_760_000_050, id: newerId, project_id: projectId, type: "canvas" },
    ],
  });
  await page.goto(`/p/${projectId}`);

  // Act
  await page.getByRole("combobox", { name: "version" }).selectOption(olderId);

  // Assert
  await expect(page).toHaveURL(`/p/${projectId}?v=${olderId}`);
});

test("`/p/:projectId` を一覧に無い `v` で開くと 404 画面を出す", async ({ page }) => {
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
      url: `https://app.karibari.com/p/${projectId}`,
    },
    versions: [
      {
        created_at: 1_760_000_000,
        id: "9c1d1b7e-3b5e-4d7e-8f0a-0d6f6a1c2b33",
        project_id: projectId,
        type: "canvas",
      },
    ],
  });

  // Act
  await page.goto(`/p/${projectId}?v=00000000-0000-4000-8000-000000000000`);

  // Assert
  await expect(page.getByRole("button", { name: "ホームへ戻る" })).toBeVisible();
});
