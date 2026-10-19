import type { ReactNode } from "react";

import { Badge } from "@karibari/shadcn/components/badge";
import { Button } from "@karibari/shadcn/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@karibari/shadcn/components/card";
import { Link } from "@tanstack/react-router";

// The card the error and 404 screens share: a state mark, the message, its code, and a way back.
export function StatusCard({
  code,
  description,
  hint,
  icon,
  title,
}: {
  code: string;
  description: string;
  hint?: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <main className="w-full max-w-110">
      <Card className="gap-4 shadow-lg [--card-spacing:--spacing(6)]">
        <CardHeader className="gap-1.5">
          <span className="mb-1.5 flex size-9 items-center justify-center rounded-md border bg-secondary text-primary [&_svg]:size-4.5">
            {icon}
          </span>
          <CardTitle className="text-xl">
            <h1>{title}</h1>
          </CardTitle>
          <CardDescription className="leading-relaxed">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Badge className="font-mono text-muted-foreground" variant="outline">
            {code}
          </Badge>
          {hint !== undefined && (
            <p className="text-muted-foreground text-xs leading-relaxed">{hint}</p>
          )}
          <Button className="w-full" nativeButton={false} render={<Link to="/sign-in" />} size="lg">
            ログイン画面へ
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
