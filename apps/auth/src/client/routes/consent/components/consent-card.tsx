import { Card, CardDescription, CardHeader, CardTitle } from "@karibari/shadcn/components/card";

import { useConsentDisplay } from "../hooks/use-consent-display";
import { ConsentError } from "./consent-error";
import { ConsentVerified } from "./consent-verified";
import { ConsentVerifying } from "./consent-verifying";

export function ConsentPage() {
  const { isPreloginTransportError, isVerified, isVerifying } = useConsentDisplay();

  return (
    <main className="w-full max-w-130">
      <Card className="gap-4 shadow-lg [--card-spacing:--spacing(6)]">
        <CardHeader className="gap-1.5">
          <CardTitle className="text-xl">
            <h1>アクセスの許可</h1>
          </CardTitle>
          <CardDescription className="leading-relaxed">
            以下のアプリケーションが、あなたのアカウントへのアクセスを求めています。
          </CardDescription>
        </CardHeader>
        {isVerifying && <ConsentVerifying />}
        {!isVerifying && !isVerified && (
          <ConsentError isTransportError={isPreloginTransportError} />
        )}
        {!isVerifying && isVerified && <ConsentVerified />}
      </Card>
    </main>
  );
}
