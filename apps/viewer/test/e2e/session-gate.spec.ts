import { expect, test } from "@playwright/test";

import { stubApi } from "../helpers/api-stub";

const signInUrl = "https://auth.karibari.tsar-bmb.org/sign-in";

test("セッションが無いまま `/` を開くとサインインへ移動する", async ({ baseURL, page }) => {
  // Arrange
  await stubApi({ page, session: false });
  const openedUrl = new URL("/", baseURL).href;

  // Act
  await page.goto(openedUrl);

  // Assert
  await expect(page).toHaveURL(`${signInUrl}?callbackURL=${encodeURIComponent(openedUrl)}`);
});

test("セッションが無いまま `/p/:projectId` を開くとサインインへ移動する", async ({
  baseURL,
  page,
}) => {
  // Arrange
  await stubApi({ page, session: false });
  const openedUrl = new URL("/p/2f1b6c1e-6a39-4c58-9a0f-6d6a4d0f9a11", baseURL).href;

  // Act
  await page.goto(openedUrl);

  // Assert
  await expect(page).toHaveURL(`${signInUrl}?callbackURL=${encodeURIComponent(openedUrl)}`);
});
