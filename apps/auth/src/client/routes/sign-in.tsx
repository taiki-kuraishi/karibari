import { useMutation, useQuery } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";
import { useEffect, useState } from "react";

import { apiClient } from "../lib/api-client";
import { authClient } from "../lib/auth-client";

export function SignInPage() {
  const [{ callbackURL, sig }] = useQueryStates({
    callbackURL: parseAsString,
    sig: parseAsString,
  });
  const [error, setError] = useState<string | undefined>(undefined);
  const sessionQuery = useQuery({
    queryFn: async () => {
      const session = await authClient.getSession();

      return session.data;
    },
    queryKey: ["session"],
  });
  // A `sig` query parameter marks the OAuth authorization flow.
  // The plugin signs the whole query when redirecting here (see its `signParams`).
  // A visit without `sig` is a plain login from another app (the Viewer).
  // It must return to `callbackURL` instead of resuming the request.
  const isOAuthFlow = sig !== null;
  const continueMutation = useMutation({
    mutationFn: async () => {
      // `selected: true` is what resumes the authorization request: the plugin
      // Attaches the signed query (`oauth_query`) and the server redirects to
      // The consent page or the client's redirect_uri. An empty body is sent
      // As GET by the client (no known method) and 404s against the server.
      const { data, error: continueError } = await authClient.oauth2.continue({ selected: true });
      if (continueError) {
        throw new Error("continue failed");
      }

      return data;
    },
    onError: () => {
      setError("リクエストを処理できませんでした。アプリケーションからやり直してください。");
    },
    onSuccess: (data) => {
      if (data?.redirect) {
        globalThis.location.href = data.url;
      } else {
        setError("リクエストを処理できませんでした。アプリケーションからやり直してください。");
      }
    },
  });
  const callbackUrlMutation = useMutation({
    mutationFn: async (target: string) => {
      const res = await apiClient.api["callback-url"].$get({ query: { callbackURL: target } });
      // A non-ok response (400/403) means the server rejected the callbackURL; the browser must not leave this page.
      if (!res.ok) {
        throw new Error("untrusted callbackURL");
      }

      const { callbackURL: validated } = await res.json();
      return validated;
    },
    onError: () => {
      setError("リクエストを処理できませんでした。アプリケーションからやり直してください。");
    },
    onSuccess: (validated) => {
      globalThis.location.href = validated;
    },
  });
  const signInMutation = useMutation({
    mutationFn: async () => {
      // OAuth flow: GitHub returns to this page with its signed query, which `oauth2.continue` resumes.
      // Plain mode: GitHub returns straight to the callback URL. Without a callbackURL, GitHub returns here, and a signed-in visit shows the logged-in state below.
      // Untrusted callbackURL values are rejected server-side (originCheckMiddleware), so an attacker-supplied origin never receives the redirect.
      const callbackURLForSignIn = isOAuthFlow
        ? `/sign-in${globalThis.location.search}`
        : (callbackURL ?? "/sign-in");
      const { error: signInError } = await authClient.signIn.social({
        callbackURL: callbackURLForSignIn,
        provider: "github",
      });
      if (signInError) {
        throw new Error("sign-in failed");
      }
    },
    onError: () => {
      setError("ログインに失敗しました。時間をおいて再度お試しください。");
    },
  });

  useEffect(() => {
    if (!sessionQuery.data) {
      return;
    }
    if (isOAuthFlow) {
      if (!continueMutation.isPending && !continueMutation.isSuccess) {
        continueMutation.mutate();
      }

      return;
    }
    // Plain mode with a callbackURL: validate through the server endpoint, then navigate. `isError` stops retry loops — a rejected callbackURL stays rejected, and retrying would spam the endpoint on every render.
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
  const showSignInButton = !(isLoggedIn && !isOAuthFlow);

  return (
    <main>
      <h1>ログイン</h1>
      <p>GitHubアカウントでログインしてください。</p>
      {error !== undefined && <p>{error}</p>}
      {isLoggedIn && !isOAuthFlow && callbackURL === null && <p>ログイン済みです。</p>}
      {showSignInButton && (
        <button
          disabled={signInMutation.isPending}
          onClick={() => signInMutation.mutate()}
          type="button"
        >
          {signInMutation.isPending ? "ログインしています…" : "GitHubでログインする"}
        </button>
      )}
    </main>
  );
}
