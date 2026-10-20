import { useQuery } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";

import { authClient } from "../../../lib/auth-client";
import { buildSignedOAuthQuery } from "../lib/build-signed-oauth-query";

// 表示用の検証状態だけを読む hook。副作用（自動再開）も mutation 実行も
// 持たないため、複数の表示 component から読んでも重複動作しない。
// 実データは React Query の cache 共有で 1 リクエストにまとまる。
export function useSignInDisplay() {
  const [{ callbackURL, error: oauthError, sig }] = useQueryStates({
    callbackURL: parseAsString,
    error: parseAsString,
    sig: parseAsString,
  });
  const sessionQuery = useQuery({
    queryFn: async () => {
      const session = await authClient.getSession();

      return session.data;
    },
    queryKey: ["session"],
  });
  // `sig` クエリ付きが OAuth 認可フロー（プラグインが署名してここへ戻す）。
  // `sig` 無しは他アプリ（Viewer）からの通常ログインで、`callbackURL` に戻す。
  const isOAuthFlow = sig !== null;
  const oauthQuery = isOAuthFlow ? buildSignedOAuthQuery(globalThis.location.search) : undefined;
  const clientId = new URLSearchParams(oauthQuery ?? "").get("client_id");
  const preloginQuery = useQuery({
    enabled: isOAuthFlow && oauthQuery !== undefined && clientId !== null,
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
  const isLoggedIn = sessionQuery.data !== undefined && sessionQuery.data !== null;
  // 署名要求の検証ゲート。OAuth アプリ名・確認後の戻り先説明・ボタンは
  // `prelogin` 成功後のみ出す。検証前・失敗時は通常のログイン表示に留め、
  // 未検証の client_id をアプリ名として出さない（fail-closed）。
  const isVerified = preloginQuery.isSuccess && preloginQuery.data !== undefined;
  // 期限切れ・改変の署名は成功しない（サーバが署名中の `exp` を現在時刻と比べる）。
  // 同じクエリでの再試行は無意味なため GitHub ボタンは出さない。
  const isSignatureInvalid =
    isOAuthFlow && (oauthQuery === undefined || clientId === null || preloginQuery.isError);
  // Prelogin の通信失敗（オフライン・5xx）は期限切れではないため再試行を出す。
  const isPreloginTransportError =
    preloginQuery.isError && preloginQuery.error?.message === "prelogin_transport_failed";
  // GitHub キャンセルは `?error=...` 付きでここに戻る。
  const appName = preloginQuery.data?.client_name ?? clientId ?? "";
  const showCancelled = oauthError !== null && !isSignatureInvalid;
  // 通信失敗時は GitHub ボタンを残す。署名自体は有効な可能性があり再試行に意味がある。
  // 文言も期限切れと分け、検証に届かなかった旨を出す。
  // OAuth 時のボタンは検証成功後のみ出す（検証前に GitHub へ進めない）。
  const showExpiredNotice = isSignatureInvalid && !isPreloginTransportError;
  const showSignInButton = isOAuthFlow ? isVerified && !isLoggedIn : !isLoggedIn;
  return {
    appName,
    callbackURL,
    isLoggedIn,
    isOAuthFlow,
    isPreloginTransportError,
    isSignatureInvalid,
    isVerified,
    oauthError,
    showCancelled,
    showExpiredNotice,
    showSignInButton,
  };
}
