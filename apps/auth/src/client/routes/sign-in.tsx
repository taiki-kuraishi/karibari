import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { authClient } from "../lib/auth-client";

export function SignInPage() {
  const [error, setError] = useState<string | undefined>(undefined),
    sessionQuery = useQuery({
      queryFn: async () => {
        const session = await authClient.getSession();

        return session.data;
      },
      queryKey: ["session"],
    }),
    continueMutation = useMutation({
      mutationFn: async () => {
        const { data, error: continueError } = await authClient.oauth2.continue({});
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
    }),
    signInMutation = useMutation({
      mutationFn: async () => {
        const { error: signInError } = await authClient.signIn.social({
          callbackURL: `/sign-in${globalThis.location.search}`,
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
    if (sessionQuery.data && !continueMutation.isPending && !continueMutation.isSuccess) {
      continueMutation.mutate();
    }
  });

  return (
    <main>
      <h1>ログイン</h1>
      <p>GitHubアカウントでログインしてください。</p>
      {error !== undefined && <p>{error}</p>}
      <button
        disabled={signInMutation.isPending}
        onClick={() => signInMutation.mutate()}
        type="button"
      >
        {signInMutation.isPending ? "ログインしています…" : "GitHubでログインする"}
      </button>
    </main>
  );
}
