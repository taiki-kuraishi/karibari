import { Badge } from "@karibari/shadcn/components/badge";
import { CardDescription, CardHeader, CardTitle } from "@karibari/shadcn/components/card";

import { useSignInDisplay } from "../hooks/use-sign-in-display";

export function SignInHeader() {
  const { appName, isOAuthFlow, isPreloginTransportError, isVerified, showExpiredNotice } =
    useSignInDisplay();

  return (
    <CardHeader className="gap-1.5">
      {isVerified && isOAuthFlow && (
        <Badge className="mb-1.5" variant="secondary">
          外部アプリからのログイン
        </Badge>
      )}
      <CardTitle className="text-xl">
        {isVerified && isOAuthFlow ? (
          <h1>
            {appName} に<br />
            karibari でログイン
          </h1>
        ) : (
          <h1>ログイン</h1>
        )}
      </CardTitle>
      <CardDescription className="leading-relaxed">
        {showExpiredNotice &&
          "このログイン要求の有効期限が切れました。お手数ですが、アプリケーションからもう一度ログインしてください。"}
        {!showExpiredNotice &&
          isPreloginTransportError &&
          "リクエストを処理できませんでした。時間をおいて再度お試しください。"}
        {!showExpiredNotice &&
          !isPreloginTransportError &&
          "GitHub アカウントでログインしてください。"}
        {isVerified && isOAuthFlow && (
          <>
            <br />
            確認のあと {appName} に戻ります。
          </>
        )}
      </CardDescription>
    </CardHeader>
  );
}
