import { defineConfig, devices } from "@playwright/test";

declare const process: { env: Record<string, string | undefined> };

if (!process.env.PW_TEST_CONNECT_WS_ENDPOINT) {
  throw new Error("VRT must run via `mise run test:vrt` (uses the Docker browser server)");
}

// oxlint-disable-next-line one-var -- Cannot merge into the ambient process declaration above.
const vrtPort = Number(process.env.KARIBARI_AUTH_VRT_PORT ?? 3100),
  baseURL = `http://127.0.0.1:${vrtPort}`;

export default defineConfig({
  reporter: "dot",
  retries: 0,
  testDir: "./test/vrt",
  workers: 1,
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
    toHaveScreenshot: { maxDiffPixels: 100 },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { height: 900, width: 1440 } },
    },
  ],
  use: {
    baseURL,
    contextOptions: { reducedMotion: "reduce" },
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    connectOptions: process.env.PW_TEST_CONNECT_WS_ENDPOINT
      ? {
          wsEndpoint: process.env.PW_TEST_CONNECT_WS_ENDPOINT,
          // Browser runs in a separate container, so <loopback> maps the host webServer into it (Playwright connectOptions).
          exposeNetwork: "<loopback>",
        }
      : undefined,
  },
  webServer: {
    command: `bun run build && bunx vite preview --outDir dist/client --host 127.0.0.1 --port ${vrtPort} --strictPort`,
    reuseExistingServer: false,
    timeout: 120 * 1000,
    url: baseURL,
  },
});
