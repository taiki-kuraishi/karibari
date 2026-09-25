import { config } from "@karibari/better-auth";
import { betterAuth } from "better-auth";
import { describe, expect, test } from "vitest";

import { callbackUrlRoute } from "../src/routes/callback-url";

describe("GET /api/callback-url", () => {
  // The endpoint validates through better-auth's own `isTrustedOrigin`, so the test builds its instance from the real config (`config.trustedOrigins`) minus the worker-only overrides (Secrets Store, D1). Hono accepts a partial env object here (`Env?: Bindings | {}`).
  const auth = betterAuth({ ...config, secret: "test-secret" });

  test("callbackURL がないと 400 を返す", async () => {
    const response = await callbackUrlRoute.request("/", { method: "GET" }, { auth });
    expect(response.status).toBe(400);
    expect(await response.json()).toHaveProperty("cause");
  });

  test("信頼されていない callbackURL は 403 を返す", async () => {
    const response = await callbackUrlRoute.request(
      "/?callbackURL=https://evil.example/steal",
      { method: "GET" },
      { auth },
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toStrictEqual({ error: "untrusted_callback_url" });
  });

  test("信頼された callbackURL をそのまま返す", async () => {
    const response = await callbackUrlRoute.request(
      "/?callbackURL=https%3A%2F%2Fkaribari.tsar-bmb.org%2Fapp",
      { method: "GET" },
      { auth },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({
      callbackURL: "https://karibari.tsar-bmb.org/app",
    });
  });

  test("信頼 origin に似せたホストは 403 を返す", async () => {
    const response = await callbackUrlRoute.request(
      "/?callbackURL=https%3A%2F%2Fkaribari.tsar-bmb.org.evil.example%2F",
      { method: "GET" },
      { auth },
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toStrictEqual({ error: "untrusted_callback_url" });
  });

  test("安全な相対パスの callbackURL は受け付ける", async () => {
    const response = await callbackUrlRoute.request(
      "/?callbackURL=%2Fsign-in",
      { method: "GET" },
      { auth },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ callbackURL: "/sign-in" });
  });
});
