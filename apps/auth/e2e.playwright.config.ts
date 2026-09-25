import { defineConfig, devices } from "@playwright/test";

declare const process: { env: Record<string, string | undefined> };

// E2E asserts URLs only, so it skips the Docker browser server that VRT needs for pixel stability.
// A locally installed Chromium runs this suite (the `test:e2e` mise task installs it).
// The suite speaks to the auth Worker on its configured custom-domain host (`auth.karibari.tsar-bmb.org`): `wrangler dev` rewrites local-origin headers to that host, so better-auth's trustedOrigins match only there.
// The browser maps the host to 127.0.0.1 via `--host-resolver-rules`.
const e2ePort = Number(process.env.KARIBARI_AUTH_E2E_PORT ?? 3101);
const baseURL = `http://auth.karibari.tsar-bmb.org:${e2ePort}`;

export default defineConfig({
  reporter: "dot",
  // Playwright runs the webServer plugin's setup before globalSetup (createGlobalSetupTasks: plugin setup tasks precede global setup tasks), so the seeding below happens after `wrangler dev` is up and before the first test.
  globalSetup: "./test/e2e/global-setup.ts",
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
        launchOptions: { args: ["--host-resolver-rules=MAP auth.karibari.tsar-bmb.org 127.0.0.1"] },
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
    // Builds the client and serves the real Worker with the production wrangler.jsonc on a fresh, isolated local state: the E2E persistence lives in `.wrangler/e2e` (wiped at startup, so developers' `.wrangler/state` data is never touched), the D1 migrations apply locally, and the committed env file points better-auth at its custom-domain host, whose rewritten origin is the one trustedOrigins accepts.
    command: `rm -rf .wrangler/e2e && bunx wrangler d1 migrations apply DB --local --config wrangler.jsonc --persist-to .wrangler/e2e && bun run build && bunx wrangler dev --config wrangler.jsonc --port ${e2ePort} --env-file test/e2e/dev.vars.e2e --persist-to .wrangler/e2e`,
    reuseExistingServer: false,
    timeout: 120 * 1000,
    url: `http://127.0.0.1:${e2ePort}`,
  },
});
