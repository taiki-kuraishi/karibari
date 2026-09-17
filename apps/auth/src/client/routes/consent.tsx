import { useState } from "react";

import { authClient } from "../lib/auth-client";

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  email: "登録済みのメールアドレスを読み取ります。",
  offline_access: "あなたがログインしていない間もアクセスを継続します。",
  openid: "アカウントの識別子を読み取ります。",
  profile: "公開プロフィール情報を読み取ります。",
};

function readSearchParams() {
  const params = new URLSearchParams(globalThis.location.search);
  return {
    clientId: params.get("client_id") ?? "",
    scopes: (params.get("scope") ?? "").split(" ").filter(Boolean),
  };
}

export function ConsentPage() {
  const [{ clientId, scopes }] = useState(readSearchParams),
    [error, setError] = useState<string | undefined>(undefined),
    [pending, setPending] = useState(false),
    respond = async (accept: boolean) => {
      setError(undefined);
      setPending(true);

      const { data, error: consentError } = await authClient.oauth2.consent({ accept });

      setPending(false);

      if (consentError) {
        setError("リクエストを処理できませんでした。アプリケーションからやり直してください。");
        return;
      }

      if (data?.url) {
        globalThis.location.href = data.url;
      }
    };

  return (
    <main>
      <h1>アクセスの許可</h1>
      <p>以下のアプリケーションが、あなたのアカウントへのアクセスを求めています。</p>
      <p>
        <strong>{clientId}</strong> (client_id)
      </p>
      <h2>許可する権限</h2>
      <ul>
        {scopes.map((scope) => (
          <li key={scope}>
            <div>{scope}</div>
            {SCOPE_DESCRIPTIONS[scope] !== undefined && <div>{SCOPE_DESCRIPTIONS[scope]}</div>}
          </li>
        ))}
      </ul>
      {error !== undefined && <p>{error}</p>}
      <div>
        <button disabled={pending} onClick={async () => respond(false)} type="button">
          許可しない
        </button>
        <button disabled={pending} onClick={async () => respond(true)} type="button">
          許可する
        </button>
      </div>
    </main>
  );
}
