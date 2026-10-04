import { Button } from "@karibari/shadcn/components/button";

// The wording is deliberately vague about why.
// A missing project and a forbidden one should read the same.
export function NotFoundPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-2">
      <h1 className="font-semibold text-2xl">ページが見つかりません</h1>
      <p className="text-muted-foreground text-sm">
        お探しのページは存在しないか、表示する権限がありません。
      </p>
      {/* Not TanStack's `Link`: its typed `to` cannot point at an unregistered route. */}
      <Button className="mt-2" nativeButton={false} render={<a href="/" />}>
        ホームへ戻る
      </Button>
    </main>
  );
}
