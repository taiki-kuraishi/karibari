import { useEffect, useState } from "react";

import { authClient } from "../lib/auth-client";

export function SignInPage() {
  const [error, setError] = useState<string | undefined>(undefined),
    [pending, setPending] = useState(false),
    signIn = async () => {
      setError(undefined);
      setPending(true);

      const { error: signInError } = await authClient.signIn.social({
        provider: "github",
        callbackURL: `/sign-in${globalThis.location.search}`,
      });

      setPending(false);

      if (signInError) {
        setError("ログインに失敗しました。時間をおいて再度お試しください。");
      }
    };

  useEffect(() => {
    const resumeAuthorize = async () => {
      const { data: session } = await authClient.getSession();
      if (!session) {
        return;
      }

      // oxlint-disable-next-line one-var -- Runs only after the session check above, so it cannot share the earlier binding.
      const { data, error: continueError } = await authClient.oauth2.continue({});
      if (continueError || !data?.redirect) {
        setError("リクエストを処理できませんでした。アプリケーションからやり直してください。");
        return;
      }

      globalThis.location.href = data.url;
    };

    void resumeAuthorize();
  }, []);

  return (
    <main>
      <h1>ログイン</h1>
      <p>GitHubアカウントでログインしてください。</p>
      {error !== undefined && <p>{error}</p>}
      <button disabled={pending} onClick={signIn} type="button">
        {pending ? "ログインしています…" : "GitHubでログインする"}
      </button>
    </main>
  );
}
