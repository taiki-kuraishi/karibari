import { execFileSync } from "node:child_process";
import { unstable_readConfig } from "wrangler";

// Values for the Secrets Store entries `wrangler dev` reads locally; the store IDs and secret names are not duplicated here — they come straight from wrangler.jsonc. The values are committed test secrets — never replace them with real credentials.
const TEST_SECRET_VALUES: Record<string, string> = {
  BETTER_AUTH_SECRET: "karibari-e2e-secret-0123456789abcdef0123456789ab",
  GITHUB_CLIENT_ID: "e2e-github-client-id",
  GITHUB_CLIENT_SECRET: "e2e-github-client-secret",
};

// Seeds the LOCAL Secrets Store so the served Worker can read its Secrets Store bindings; wrangler's CLI is local by default (`--remote` defaults to false), so nothing touches the remote store.
// The state is always fresh because the webServer wipes `.wrangler/e2e` before it starts (`createGlobalSetupTasks` runs the webServer plugin's setup before global setup tasks), so a single create per binding is enough.
function createSecret(args: {
  storeId: string;
  name: string;
  value: string;
  persist: string;
}): void {
  // `execFileSync` throws on a non-zero exit, which surfaces the failure to Playwright.
  execFileSync(
    "bunx",
    [
      "wrangler",
      "secrets-store",
      "secret",
      "create",
      args.storeId,
      "--name",
      args.name,
      "--value",
      args.value,
      "--scopes",
      "workers",
      "--persist-to",
      args.persist,
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
}

export default function globalSetup(): void {
  const config = unstable_readConfig({ configPath: "./wrangler.jsonc" });
  for (const binding of config.secrets_store_secrets ?? []) {
    const value = TEST_SECRET_VALUES[binding.binding];
    if (value === undefined) {
      throw new Error(`no committed test value for Secrets Store binding ${binding.binding}`);
    }
    createSecret({
      storeId: binding.store_id,
      name: binding.secret_name,
      value,
      persist: ".wrangler/e2e",
    });
  }
}
