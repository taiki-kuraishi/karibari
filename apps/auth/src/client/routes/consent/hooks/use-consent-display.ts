import { useQuery } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";

import { authClient } from "../../../lib/auth-client";
import { buildSignedOAuthQuery } from "../lib/build-signed-oauth-query";

// 表示用の検証状態だけを読む hook。副作用も mutation 実行も持たないため、
// 複数の表示 component から読んでも重複動作しない。
// 実データは React Query の cache 共有で 1 リクエストにまとまる。
export function useConsentDisplay() {
  const [{ sig }] = useQueryStates({ sig: parseAsString });
  const oauthQuery = sig === null ? undefined : buildSignedOAuthQuery(globalThis.location.search);
  const signedParams = new URLSearchParams(oauthQuery ?? "");
  const clientId = signedParams.get("client_id");
  const redirectUri = signedParams.get("redirect_uri");
  const scopes =
    signedParams
      .get("scope")
      ?.split(" ")
      .filter((scope) => scope !== "") ?? [];
  const resources = signedParams.getAll("resource");
  const preloginQuery = useQuery({
    enabled: oauthQuery !== undefined && clientId !== null,
    queryFn: async () => {
      // 通信失敗は `{ data, error }` ではなく reject で返るため、
      // ここで捕まえて 401/400 以外と同様に通信失敗として扱う。
      try {
        const { data, error: preloginError } = await authClient.oauth2.publicClientPrelogin({
          client_id: clientId ?? "",
          oauth_query: oauthQuery ?? "",
        });
        if (preloginError) {
          // 署名自体の失敗（期限切れ・改変）か、検証に届かなかった失敗
          // （オフライン・5xx）かをメッセージで区別する。
          const kind =
            preloginError.status === 401 || preloginError.status === 400
              ? "invalid_signature"
              : "prelogin_transport_failed";
          throw new Error(kind);
        }

        return data;
      } catch (error) {
        if (error instanceof Error && error.message === "invalid_signature") {
          throw error;
        }
        throw new Error("prelogin_transport_failed", { cause: error });
      }
    },
    queryKey: ["prelogin", oauthQuery],
    retry: false,
  });
  const sessionQuery = useQuery({
    queryFn: async () => {
      const session = await authClient.getSession();

      return session.data;
    },
    queryKey: ["session"],
  });

  // 署名要求の検証ゲート。同意の値と操作は `prelogin` 成功後のみ出す。
  // それ以外は検証中・署名無効・通信失敗のいずれかになり、
  // 想定外の失敗形状でも同意を出さない（fail-closed）。
  // 401/400 は署名自体の失敗（改変・期限切れ）、それ以外は検証未到達。
  const isVerified = preloginQuery.isSuccess && preloginQuery.data !== undefined;
  const isVerifying = oauthQuery !== undefined && clientId !== null && preloginQuery.isPending;
  const isPreloginTransportError =
    preloginQuery.isError && preloginQuery.error?.message === "prelogin_transport_failed";
  const appName = preloginQuery.data?.client_name ?? clientId ?? "";
  const user = sessionQuery.data?.user;

  return {
    appName,
    clientId,
    isPreloginTransportError,
    isVerified,
    isVerifying,
    redirectUri,
    resources,
    scopes,
    user:
      user === undefined || user === null
        ? undefined
        : { email: user.email, image: user.image, name: user.name },
  };
}
