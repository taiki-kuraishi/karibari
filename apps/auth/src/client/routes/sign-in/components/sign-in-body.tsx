import { Alert, AlertDescription, AlertTitle } from "@karibari/shadcn/components/alert";
import { Button } from "@karibari/shadcn/components/button";
import { CardContent } from "@karibari/shadcn/components/card";
import { Spinner } from "@karibari/shadcn/components/spinner";
import { CircleAlert } from "lucide-react";

import { useSignInDisplay } from "../hooks/use-sign-in-display";
import { useSignInPage } from "../hooks/use-sign-in-page";

export function SignInBody() {
  const {
    callbackURL,
    isLoggedIn,
    isOAuthFlow,
    isSignatureInvalid,
    isVerified,
    oauthError,
    showCancelled,
    showSignInButton,
  } = useSignInDisplay();
  const { requestError, signIn, signInPending } = useSignInPage();

  return (
    <CardContent className="flex flex-col gap-3">
      {showCancelled && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>ログインがキャンセルされました</AlertTitle>
          <AlertDescription>もう一度お試しください。</AlertDescription>
        </Alert>
      )}
      {requestError !== undefined && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>ログインに失敗しました</AlertTitle>
          <AlertDescription>{requestError}</AlertDescription>
        </Alert>
      )}
      {showSignInButton && (
        <Button className="w-full" disabled={signInPending} onClick={signIn} size="lg">
          {signInPending ? (
            <>
              <Spinner />
              ログインしています…
            </>
          ) : (
            "GitHub でログイン"
          )}
        </Button>
      )}
      {signInPending && isOAuthFlow && (
        <p className="text-muted-foreground text-xs leading-relaxed">
          GitHub の認証画面に移動します。このままお待ちください。
        </p>
      )}
      {!signInPending &&
        !isSignatureInvalid &&
        (isVerified && isOAuthFlow ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            許可する権限は、次の画面で確認できます。
          </p>
        ) : (
          <p className="text-muted-foreground text-xs leading-relaxed">
            karibari は GitHub のパスワードを受け取りません。
          </p>
        ))}
      {isLoggedIn && !isOAuthFlow && callbackURL === null && oauthError === null && (
        <p className="text-muted-foreground text-xs leading-relaxed">ログイン済みです。</p>
      )}
    </CardContent>
  );
}
