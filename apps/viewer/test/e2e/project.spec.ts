import { expect, test } from "@playwright/test";

import { stubApi } from "../helpers/api-stub";

const projectId = "2f1b6c1e-6a39-4c58-9a0f-6d6a4d0f9a11";

test.use({ timezoneId: "Asia/Tokyo" });

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
      {
        created_at: Date.parse("2026-10-20T14:30:00+09:00") / 1000,
        id: olderId,
        project_id: projectId,
        type: "canvas",
      },
      {
        created_at: Date.parse("2026-10-20T14:30:00+09:00") / 1000,
        id: newerId,
        project_id: projectId,
        type: "full",
      },
    ],
  });
  await page.goto(`/p/${projectId}`);

  // Act
  await page
    .getByRole("combobox", { name: "version" })
    .selectOption({ label: "v1 · 2026/10/20 14:30" });

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
      {
        created_at: Date.parse("2026-10-20T14:30:00+09:00") / 1000,
        id: olderId,
        project_id: projectId,
        type: "full",
      },
      {
        created_at: Date.parse("2026-10-20T15:30:00+09:00") / 1000,
        id: newerId,
        project_id: projectId,
        type: "canvas",
      },
    ],
  });
  await page.goto(`/p/${projectId}`);

  // Act
  await page
    .getByRole("combobox", { name: "version" })
    .selectOption({ label: "v1 · 2026/10/20 14:30" });

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

test.describe("comment mode", () => {
  const screenContent = "<main><h1>見出し</h1><button>カートに入れる</button></main>";
  const project = {
    project: {
      created_at: 1_760_000_000,
      id: projectId,
      name: "ランディングページ",
      owner: "user-1",
      updated_at: 1_760_000_100,
    },
    url: `https://app.karibari.com/p/${projectId}`,
  };
  const screens = [
    { height: 900, id: "5d3b8f2a-7c1e-4a9b-8e6d-2f4a6c8b0e55", name: "トップ", width: 1440 },
  ];

  test.beforeEach(async ({ page }) => {
    // The comment mode toggle persists here; seeding it stands in for pressing the toggle.
    await page.addInitScript(() => {
      localStorage.setItem(
        "karibari-comment-mode",
        JSON.stringify({ state: { commentMode: true }, version: 0 }),
      );
    });
  });

  test(`canvas の画面で要素をクリックすると、その要素が選択状態になる`, async ({ page }) => {
    // Arrange
    await stubApi({
      page,
      project,
      screenContent,
      screens,
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
    const button = page.frameLocator("iframe").getByRole("button", { name: "カートに入れる" });

    // Act
    await button.click();

    // Assert
    await expect(button).toHaveAttribute("data-karibari-selected", "");
    await expect(
      page.frameLocator("iframe").getByRole("heading", { name: "見出し" }),
    ).not.toHaveAttribute("data-karibari-selected");
  });

  test(`full の画面で要素をクリックすると、その要素が選択状態になる`, async ({ page }) => {
    // Arrange
    await stubApi({
      page,
      project,
      screenContent,
      screens,
      versions: [
        {
          created_at: 1_760_000_000,
          id: "9c1d1b7e-3b5e-4d7e-8f0a-0d6f6a1c2b33",
          project_id: projectId,
          type: "full",
        },
      ],
    });
    await page.goto(`/p/${projectId}`);
    const button = page.frameLocator("iframe").getByRole("button", { name: "カートに入れる" });

    // Act
    await button.click();

    // Assert
    await expect(button).toHaveAttribute("data-karibari-selected", "");
    await expect(
      page.frameLocator("iframe").getByRole("heading", { name: "見出し" }),
    ).not.toHaveAttribute("data-karibari-selected");
  });

  test("canvas の画面の上でホイールを回すと canvas が動く", async ({ page }) => {
    // Arrange
    await stubApi({
      page,
      project,
      screenContent,
      screens,
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
    const row = page.locator("figure").locator("..");
    await expect(
      page.frameLocator("iframe").getByRole("heading", { name: "見出し" }),
    ).toBeVisible();
    const before = await row.getAttribute("style");
    const box = await page.locator("iframe").boundingBox();

    // Act
    await page.mouse.move((box?.x ?? 0) + 50, (box?.y ?? 0) + 50);
    await page.mouse.wheel(0, 200);

    // Assert
    await expect(row).not.toHaveAttribute("style", before ?? "");
  });
});

test("画面の HTML の相対 URL は、その画面の content と同じ場所から読む", async ({ page }) => {
  // Arrange
  const versionId = "9c1d1b7e-3b5e-4d7e-8f0a-0d6f6a1c2b33";
  const screenId = "5d3b8f2a-7c1e-4a9b-8e6d-2f4a6c8b0e55";
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
    screenContent:
      '<!doctype html><html><head></head><body><img src="shot.png" alt=""></body></html>',
    screens: [{ height: 900, id: screenId, name: "トップ", width: 1440 }],
    versions: [{ created_at: 1_760_000_000, id: versionId, project_id: projectId, type: "full" }],
  });
  const image = page.waitForRequest(/shot\.png$/u);

  // Act
  await page.goto(`/p/${projectId}`);

  const request = await image;

  // Assert
  expect(request.url()).toBe(
    `https://api.karibari.com/api/projects/${projectId}/versions/${versionId}/screens/${screenId}/shot.png`,
  );
});

test.describe("comment panel", () => {
  const versionId = "9c1d1b7e-3b5e-4d7e-8f0a-0d6f6a1c2b33";
  const screenId = "5d3b8f2a-7c1e-4a9b-8e6d-2f4a6c8b0e55";
  const stub = {
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
    screenContent: "<main><h1>見出し</h1><button>カートに入れる</button></main>",
    screens: [{ height: 900, id: screenId, name: "トップ", width: 1440 }],
    versions: [
      { created_at: 1_760_000_000, id: versionId, project_id: projectId, type: "full" as const },
    ],
  };

  test("コメントのボタンを押すと、コメントのパネルが開く", async ({ page }) => {
    // Arrange
    await stubApi({ page, ...stub });
    await page.goto(`/p/${projectId}`);

    // Act
    await page.getByRole("button", { name: "コメント 0" }).click();

    // Assert
    await expect(page.getByRole("complementary", { name: "コメント" })).toBeVisible();
    await expect(page.getByText("まだコメントはありません")).toBeVisible();
  });

  test("要素を選んで送信すると、そのコメントが一覧に出る", async ({ page }) => {
    // Arrange
    await page.addInitScript(() => {
      localStorage.setItem(
        "karibari-comment-mode",
        JSON.stringify({ state: { commentMode: true }, version: 0 }),
      );
    });
    await stubApi({ page, ...stub });
    await page.goto(`/p/${projectId}`);
    await page.frameLocator("iframe").getByRole("button", { name: "カートに入れる" }).click();
    const panel = page.getByRole("complementary", { name: "コメント" });
    await expect(panel.getByText("トップ / button")).toBeVisible();

    // Act
    await panel.getByRole("textbox", { name: "新しいコメント" }).fill("色を濃くしてほしい");
    await panel.getByRole("textbox", { name: "新しいコメント" }).press("Control+Enter");

    // Assert
    await expect(panel.getByRole("listitem").getByText("色を濃くしてほしい")).toBeVisible();
  });

  test("スレッドに返信すると、返信が入れ子で出る", async ({ page }) => {
    // Arrange
    await page.addInitScript(() => {
      localStorage.setItem(
        "karibari-comment-mode",
        JSON.stringify({ state: { commentMode: true }, version: 0 }),
      );
    });
    await stubApi({
      page,
      ...stub,
      comments: [
        {
          author: "user-1",
          body: "見出しを大きく",
          created_at: 1_760_000_200,
          id: "c1",
          parent_id: null,
          project_id: projectId,
          resolved_at: null,
          screen_id: screenId,
          source: "mcp",
          target: "body > main:nth-of-type(1) > h1:nth-of-type(1)",
          updated_at: null,
          version_id: versionId,
        },
      ],
    });
    await page.goto(`/p/${projectId}`);
    const panel = page.getByRole("complementary", { name: "コメント" });

    // Act
    await panel.getByRole("textbox", { name: "返信" }).fill("対応しました");
    await panel.getByRole("button", { name: "返信" }).click();

    // Assert
    await expect(panel.getByRole("list", { name: "返信" }).getByText("対応しました")).toBeVisible();
  });
});

test.describe("comment actions", () => {
  const versionId = "9c1d1b7e-3b5e-4d7e-8f0a-0d6f6a1c2b33";
  const screenId = "5d3b8f2a-7c1e-4a9b-8e6d-2f4a6c8b0e55";
  const stub = {
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
    screenContent: "<main><h1>見出し</h1><button>カートに入れる</button></main>",
    screens: [{ height: 900, id: screenId, name: "トップ", width: 1440 }],
    versions: [
      { created_at: 1_760_000_000, id: versionId, project_id: projectId, type: "full" as const },
    ],
  };
  const comment = (fields: { body: string; id: string; source: "mcp" | "viewer" }) => ({
    author: "user-1",
    created_at: 1_760_000_200,
    parent_id: null,
    project_id: projectId,
    resolved_at: null,
    screen_id: screenId,
    target: "body > main:nth-of-type(1) > h1:nth-of-type(1)",
    updated_at: null,
    version_id: versionId,
    ...fields,
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "karibari-comment-mode",
        JSON.stringify({ state: { commentMode: true }, version: 0 }),
      );
    });
  });

  test("自分のコメントを編集すると、本文が変わり「編集済み」が付く", async ({ page }) => {
    // Arrange
    await stubApi({
      page,
      ...stub,
      comments: [comment({ body: "旧文", id: "c1", source: "viewer" })],
    });
    await page.goto(`/p/${projectId}`);
    const panel = page.getByRole("complementary", { name: "コメント" });
    await panel.getByRole("button", { name: "編集" }).click();

    // Act
    await panel.getByRole("textbox", { name: "コメントを編集" }).fill("新しい文");
    await panel.getByRole("button", { name: "保存" }).click();

    // Assert
    await expect(panel.getByText("新しい文")).toBeVisible();
    await expect(panel.getByText("編集済み")).toBeVisible();
  });

  test("AI のコメントには「編集」が出ない", async ({ page }) => {
    // Arrange
    await stubApi({
      page,
      ...stub,
      comments: [comment({ body: "AI の指摘", id: "c1", source: "mcp" })],
    });

    // Act
    await page.goto(`/p/${projectId}`);

    // Assert
    const panel = page.getByRole("complementary", { name: "コメント" });
    await expect(panel.getByText("AI の指摘")).toBeVisible();
    await expect(panel.getByRole("button", { name: "編集" })).toHaveCount(0);
  });

  test("解決すると未解決タブから消え、すべてタブでは再開できる", async ({ page }) => {
    // Arrange
    await stubApi({
      page,
      ...stub,
      comments: [comment({ body: "直して", id: "c1", source: "mcp" })],
    });
    await page.goto(`/p/${projectId}`);
    const panel = page.getByRole("complementary", { name: "コメント" });

    // Act
    await panel.getByRole("button", { name: "解決" }).click();

    // Assert
    await expect(panel.getByText("まだコメントはありません")).toBeVisible();
    await panel.getByRole("tab", { name: "すべて" }).click();
    await expect(panel.getByRole("button", { name: "再開" })).toBeVisible();
  });

  test("削除を確定すると、スレッドが消える", async ({ page }) => {
    // Arrange
    await stubApi({
      page,
      ...stub,
      comments: [comment({ body: "消す", id: "c1", source: "viewer" })],
    });
    await page.goto(`/p/${projectId}`);
    const panel = page.getByRole("complementary", { name: "コメント" });
    await panel.getByRole("button", { name: "削除" }).click();

    // Act
    await page.getByRole("alertdialog").getByRole("button", { name: "削除する" }).click();

    // Assert
    await expect(panel.getByText("まだコメントはありません")).toBeVisible();
  });

  test("スレッドは作成順ではなく、要素の上から順に番号が付く", async ({ page }) => {
    // Arrange
    await stubApi({
      page,
      ...stub,
      comments: [
        {
          ...comment({ body: "ボタン", id: "c1", source: "mcp" }),
          target: "body > main:nth-of-type(1) > button:nth-of-type(1)",
        },
        { ...comment({ body: "見出し", id: "c2", source: "mcp" }), created_at: 1_760_000_300 },
      ],
    });

    // Act
    await page.goto(`/p/${projectId}`);

    // Assert
    const threads = page.getByRole("complementary", { name: "コメント" }).getByRole("listitem");
    await expect(threads.filter({ hasText: "#1" })).toContainText("トップ / h1");
    await expect(threads.filter({ hasText: "#2" })).toContainText("トップ / button");
  });

  test("コメントのある要素に、番号付きのピンが出る", async ({ page }) => {
    // Arrange
    await stubApi({
      page,
      ...stub,
      comments: [comment({ body: "見出し", id: "c1", source: "mcp" })],
    });

    // Act
    await page.goto(`/p/${projectId}`);

    // Assert
    await expect(page.getByRole("button", { name: "ピン 1" })).toBeVisible();
  });
});
