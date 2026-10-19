import { Ban, CircleAlert, Clock } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";

import { StatusCard } from "@/components/status-card";

// Anyone can craft this URL, so only a short, plain code is echoed back on the page.
const SAFE_CODE = /^[\w-]{1,64}$/;

// The landing page of better-auth's `onAPIError.errorURL`.
export function ErrorPage() {
  const [error] = useQueryState("error", parseAsString);
  const code = error !== null && SAFE_CODE.test(error) ? error : "invalid_request";

  if (code === "access_denied") {
    return (
      <StatusCard
        code={code}
        description="このアプリケーションには、あなたのアカウントへのアクセスを許可していません。karibari のデータは変更されていません。"
        icon={<Ban />}
        title="アクセスを許可しませんでした"
      />
    );
  }
  // `better-auth` reports a lost or mismatched OAuth state with these: a stale or reused link.
  if (code === "state_not_found" || code === "state_mismatch") {
    return (
      <StatusCard
        code={code}
        description="ログインのリンクは一度だけ使えます。もう一度ログインしてください。"
        hint="アプリケーションから、もう一度ログインを開始してください。"
        icon={<Clock />}
        title="リンクの有効期限が切れています"
      />
    );
  }

  return (
    <StatusCard
      code={code}
      description="このログイン要求は無効です。アプリケーションからやり直してください。"
      icon={<CircleAlert />}
      title="リクエストを処理できません"
    />
  );
}
