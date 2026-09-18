import type { DpopReplayStore } from "better-auth/oauth2";

// KV-backed DPoP replay store. Accepted hole: cross-region writes take up to
// 60 seconds to propagate, so a replay in another region can slip through
// Inside that window. Same-region replays are rejected immediately.
export const createKvDpopReplayStore = (kv: KVNamespace): DpopReplayStore => ({
  reserve: async ({ expiresAt, key, now }) => {
    const kvKey = `dpop-replay:${key}`;
    const ttl = Math.max(60, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000));
    if ((await kv.get(kvKey)) !== null) {
      return false;
    }
    await kv.put(kvKey, "1", { expirationTtl: ttl });

    return true;
  },
});
