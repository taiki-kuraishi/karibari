import { Alert, AlertDescription, AlertTitle } from "@karibari/shadcn/components/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@karibari/shadcn/components/avatar";
import { Button } from "@karibari/shadcn/components/button";
import { CardContent, CardFooter } from "@karibari/shadcn/components/card";
import { Separator } from "@karibari/shadcn/components/separator";
import { Spinner } from "@karibari/shadcn/components/spinner";
import { Check, TriangleAlert } from "lucide-react";

import { SCOPE_DESCRIPTIONS } from "../constant";
import { useConsentActions } from "../hooks/use-consent-actions";
import { useConsentDisplay } from "../hooks/use-consent-display";

export function ConsentVerified() {
  const { appName, clientId, redirectUri, resources, scopes, user } = useConsentDisplay();
  const { consent, consentPending, isPending, requestError, switchAccount } = useConsentActions();

  return (
    <>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5 rounded-lg border bg-secondary/40 px-3 py-2.5">
          <span className="font-heading text-lg leading-snug font-medium">{appName}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-muted-foreground w-12 flex-none text-xs">client_id</span>
            <span className="font-mono text-xs break-all">{clientId}</span>
          </div>
          {redirectUri !== null && (
            <div className="flex items-baseline gap-2">
              <span className="text-muted-foreground w-12 flex-none text-xs">戻り先</span>
              <span className="font-mono text-xs break-all">{redirectUri}</span>
            </div>
          )}
        </div>
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>karibari が確認していないアプリです</AlertTitle>
          <AlertDescription>アプリ名は自己申告です。提供元を確認してください。</AlertDescription>
        </Alert>
        <section className="flex flex-col gap-1.5">
          <h2 className="text-sm font-bold">許可する権限</h2>
          <ul className="flex list-none flex-col p-0">
            {scopes.map((scope) => (
              <li
                className="grid grid-cols-[auto_1fr] items-start gap-x-2 border-t py-1.5 first:border-t-0 [&_svg]:text-primary [&_svg]:mt-1 [&_svg]:size-3.5"
                key={scope}
              >
                <Check aria-hidden="true" />
                <div>
                  {SCOPE_DESCRIPTIONS[scope] !== undefined && (
                    <div className="text-sm leading-snug">{SCOPE_DESCRIPTIONS[scope]}</div>
                  )}
                  <div className="text-muted-foreground font-mono text-xs break-all">{scope}</div>
                </div>
              </li>
            ))}
            {resources.map((resource) => (
              <li
                className="grid grid-cols-[auto_1fr] items-start gap-x-2 border-t py-1.5 [&_svg]:text-primary [&_svg]:mt-1 [&_svg]:size-3.5"
                key={resource}
              >
                <Check aria-hidden="true" />
                <div>
                  <div className="text-sm leading-snug">
                    karibari の MCP ツール（project・コメント）を利用します。
                  </div>
                  <div className="text-muted-foreground font-mono text-xs break-all">
                    resource {resource}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <Separator />
        {user !== undefined && (
          <div className="flex items-center gap-2.5">
            <Avatar>
              {user.image !== undefined && user.image !== null && (
                <AvatarImage alt="" src={user.image} />
              )}
              <AvatarFallback>{user.name?.slice(0, 2) ?? user.email.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-0.5">
              {user.name !== undefined && user.name !== null && (
                <span className="text-sm leading-snug font-medium">{user.name}</span>
              )}
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-muted-foreground text-xs break-all">{user.email}</span>
                <Button disabled={isPending} onClick={switchAccount} variant="link">
                  別のアカウントでログイン
                </Button>
              </span>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter
        className={requestError !== undefined ? "flex-col items-stretch gap-2.5" : undefined}
      >
        {requestError !== undefined && (
          <p className="text-destructive flex items-start gap-1.5 text-xs leading-relaxed">
            {requestError}
          </p>
        )}
        <div className="ml-auto flex gap-2">
          <Button disabled={isPending} onClick={() => consent(false)} size="lg" variant="outline">
            許可しない
          </Button>
          <Button disabled={isPending} onClick={() => consent(true)} size="lg">
            {consentPending ? (
              <>
                <Spinner />
                許可しています…
              </>
            ) : (
              "許可する"
            )}
          </Button>
        </div>
      </CardFooter>
    </>
  );
}
