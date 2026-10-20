import { useMutation, useQuery } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";
import { useEffect, useState } from "react";

import { apiClient } from "../../../lib/api-client";
import { authClient } from "../../../lib/auth-client";
import { REQUEST_FAILED } from "../constant";
import { buildSignedOAuthQuery } from "../lib/build-signed-oauth-query";

// 副作用（自動再開）と全 mutation・error state の所有者。SignInBody が 1 回だけ呼ぶ。
// Header は読み取り専用の useSignInDisplay を使うため、重複実行も状態分離もない。
export function useSignInPage() {
  const [{ callbackURL, error: oauthError, sig }] = useQueryStates({
    callbackURL: parseAsString,
    error: parseAsString,
    sig: parseAsString,
  });
  const [requestError, setRequestError] = useState<string | undefined>(undefined);
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
  const continueMutation = useMutation({
    mutationFn: async () => {
      // 認可再開は `selected: true` で行う。プラグインが署名クエリ
      // （`oauth_query`）を付けて送り、サーバが同意画面か redirect_uri に戻す。
      // 空 body はクライアントが GET で送り 404 になるため必ず付ける。
      const { data, error: continueError } = await authClient.oauth2.continue({ selected: true });
      if (continueError) {
        throw new Error("continue failed");
      }

      return data;
    },
    onError: () => {
      setRequestError(REQUEST_FAILED);
    },
    onSuccess: (data) => {
      if (data?.redirect) {
        globalThis.location.href = data.url;
      } else {
        setRequestError(REQUEST_FAILED);
      }
    },
  });
  const callbackUrlMutation = useMutation({
    mutationFn: async (target: string) => {
      const res = await apiClient.api["callback-url"].$get({ query: { callbackURL: target } });
      // 非 ok（400/403）はサーバが callbackURL を拒否した意味。この画面から離れてはならない。
      if (!res.ok) {
        throw new Error("untrusted callbackURL");
      }

      const { callbackURL: validated } = await res.json();
      return validated;
    },
    onError: () => {
      setRequestError(REQUEST_FAILED);
    },
    onSuccess: (validated) => {
      globalThis.location.href = validated;
    },
  });
  const signInMutation = useMutation({
    mutationFn: async () => {
      // OAuth 時は署名クエリ付きでこの画面に戻り `oauth2.continue` が再開する。
      // 通常時は callbackURL に直接戻る（無ければこの画面に戻り、ログイン済み表示になる）。
      // 信頼できない callbackURL はサーバ側（originCheckMiddleware）が弾く。
      // GitHub キャンセルは必ずこの画面（`/sign-in`＋現在のクエリ）に戻す。
      // 通常時も成功先（viewer）ではなくここに戻し、固定エラーと再試行を出す。
      const callbackURLForSignIn = isOAuthFlow
        ? `/sign-in${globalThis.location.search}`
        : (callbackURL ?? "/sign-in");
      const errorCallbackURLForSignIn = `/sign-in${globalThis.location.search}`;
      const { error: signInError } = await authClient.signIn.social({
        callbackURL: callbackURLForSignIn,
        errorCallbackURL: errorCallbackURLForSignIn,
        provider: "github",
      });
      if (signInError) {
        throw new Error("sign-in failed");
      }
    },
    onError: () => {
      setRequestError("時間をおいて再度お試しください。");
    },
  });

  useEffect(() => {
    if (!sessionQuery.data) {
      return;
    }
    if (isOAuthFlow) {
      // 未検証の要求からは再開しない。prelogin 失敗（改変・期限切れ）のまま
      // `continue` すると期限切れ表示の横に二重でエラーが出る。
      if (preloginQuery.isError || oauthQuery === undefined || clientId === null) {
        return;
      }
      if (preloginQuery.isPending) {
        return;
      }
      if (!continueMutation.isPending && !continueMutation.isSuccess && !continueMutation.isError) {
        continueMutation.mutate();
      }

      return;
    }
    // 通常時の callbackURL はサーバ endpoint で検証してから遷移する。`isError` で再試行ループを止める。
    if (
      callbackURL &&
      !callbackUrlMutation.isPending &&
      !callbackUrlMutation.isSuccess &&
      !callbackUrlMutation.isError
    ) {
      callbackUrlMutation.mutate(callbackURL);
    }
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
  const showHint = !(signInMutation.isPending || isSignatureInvalid);

  return {
    appName,
    callbackURL,
    isLoggedIn,
    isOAuthFlow,
    isPreloginTransportError,
    isSignatureInvalid,
    isVerified,
    oauthError,
    requestError,
    showCancelled,
    showExpiredNotice,
    showHint,
    showSignInButton,
    signIn: () => signInMutation.mutate(),
    signInPending: signInMutation.isPending,
  };
}
