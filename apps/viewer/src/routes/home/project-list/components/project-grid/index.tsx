import { Badge } from "@karibari/shadcn/components/badge";
import { Card, CardContent, CardDescription, CardTitle } from "@karibari/shadcn/components/card";
import { Link } from "@tanstack/react-router";

import { useProjectGrid } from "./hooks/use-project-grid";

export function ProjectGrid({
  projects,
}: {
  projects: { id: string; name: string | null; updated_at: number }[];
}) {
  const view = useProjectGrid({ projects });

  if (view.status === "loading") {
    return <p className="text-muted-foreground text-sm">読み込み中…</p>;
  }

  if (view.status === "hidden") {
    return null;
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {view.cards.map((card) => (
        <li key={card.id}>
          <Link className="block" params={{ projectId: card.id }} to="/p/$projectId">
            <Card>
              <CardContent>
                <div className="aspect-video rounded-md bg-muted" />
              </CardContent>
              <CardContent className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="truncate">{card.displayName}</CardTitle>
                  {card.type && <Badge variant="secondary">{card.type}</Badge>}
                </div>
                <CardDescription>
                  <time title={card.updatedAt}>{card.updatedLabel}</time>
                  {` · 版 ${card.versionCount} · コメント ${card.commentCount} · 共有 ${card.shareCount}`}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
