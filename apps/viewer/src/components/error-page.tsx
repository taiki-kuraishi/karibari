import { Button } from "@karibari/shadcn/components/button";

export function ErrorPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-2">
      <h1 className="font-semibold text-2xl">読み込めませんでした</h1>
      <Button
        className="mt-2"
        onClick={() => {
          globalThis.location.reload();
        }}
      >
        再読み込み
      </Button>
    </main>
  );
}
