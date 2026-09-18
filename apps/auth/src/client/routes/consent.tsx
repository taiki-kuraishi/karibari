import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";
import { useState } from "react";

import { authClient } from "../lib/auth-client";

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  email: "登録済みのメールアドレスを読み取ります。",
  offline_access: "あなたがログインしていない間もアクセスを継続します。",
  openid: "アカウントの識別子を読み取ります。",
  profile: "公開プロフィール情報を読み取ります。",
};

export function ConsentPage() {
  const [{ client_id: clientId, scope: scopes }] = useQueryStates({
    client_id: parseAsString.withDefault(""),
    scope: parseAsArrayOf(parseAsString, " ").withDefault([]),
  });
  const [error, setError] = useState<string | undefined>(undefined);
  const consentMutation = useMutation({
    mutationFn: async (accept: boolean) => {
      const { data, error: consentError } = await authClient.oauth2.consent({ accept });
      if (consentError) {
        throw new Error("consent failed");
      }

      return data;
    },
    onError: () => {
      setError("リクエストを処理できませんでした。アプリケーションからやり直してください。");
    },
    onSuccess: (data) => {
      if (data?.url) {
        globalThis.location.href = data.url;
      }
    },
  });
  const form = useForm({
    defaultValues: { decision: "none" as "none" | "approve" | "deny" },
    onSubmit: ({ value }) => {
      if (value.decision !== "none") {
        consentMutation.mutate(value.decision === "approve");
      }
    },
  });

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
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(submitting) => (
          <div>
            <button
              disabled={submitting || consentMutation.isPending}
              onClick={() => {
                form.setFieldValue("decision", "deny");
                void form.handleSubmit();
              }}
              type="button"
            >
              許可しない
            </button>
            <button
              disabled={submitting || consentMutation.isPending}
              onClick={() => {
                form.setFieldValue("decision", "approve");
                void form.handleSubmit();
              }}
              type="button"
            >
              許可する
            </button>
          </div>
        )}
      </form.Subscribe>
    </main>
  );
}
