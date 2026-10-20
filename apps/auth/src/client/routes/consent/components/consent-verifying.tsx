import { CardContent } from "@karibari/shadcn/components/card";
import { Spinner } from "@karibari/shadcn/components/spinner";

export function ConsentVerifying() {
  return (
    <CardContent className="flex flex-col gap-3">
      <div className="flex items-center gap-2 py-4">
        <Spinner />
        <p className="text-muted-foreground text-sm leading-relaxed">確認しています…</p>
      </div>
    </CardContent>
  );
}
