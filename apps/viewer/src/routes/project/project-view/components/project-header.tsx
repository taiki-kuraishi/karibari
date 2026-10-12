import { Link } from "@tanstack/react-router";

export function ProjectHeader({ displayName }: { displayName: string }) {
  return (
    <header className="flex items-center gap-4 border-b px-4 py-2">
      <Link className="text-muted-foreground text-sm hover:underline" to="/">
        ホーム
      </Link>
      <h1 className="font-semibold">{displayName}</h1>
    </header>
  );
}
