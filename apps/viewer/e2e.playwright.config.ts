import { defineConfig, devices } from "@playwright/test";

// URL assertions do not need the pixel-stable Docker browser server that VRT uses.
const e2ePort = Number(process.env.KARIBARI_VIEWER_E2E_PORT ?? 3102);
const baseURL = `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  reporter: "dot",
  retries: 0,
  testDir: "./test/e2e",
  workers: 1,
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { height: 900, width: 1440 },
      },
    },
  ],
  use: {
    baseURL,
    contextOptions: { reducedMotion: "reduce" },
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    // `--host 127.0.0.1` keeps the served origin identical to the asserted baseURL.
    command: `bun run build && bunx vite preview --host 127.0.0.1 --port ${e2ePort} --strictPort`,
    reuseExistingServer: false,
    timeout: 120 * 1000,
    url: baseURL,
  },
});
