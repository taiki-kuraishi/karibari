import { Card } from "@karibari/shadcn/components/card";

import { SignInBody } from "./sign-in-body";
import { SignInHeader } from "./sign-in-header";

export function SignInPage() {
  return (
    <main className="w-full max-w-100">
      <Card className="gap-4 shadow-lg [--card-spacing:--spacing(6)]">
        <SignInHeader />
        <SignInBody />
      </Card>
    </main>
  );
}
