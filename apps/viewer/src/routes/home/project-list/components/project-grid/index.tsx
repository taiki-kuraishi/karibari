import { Badge } from "@karibari/shadcn/components/badge";
import { Card, CardContent, CardDescription, CardTitle } from "@karibari/shadcn/components/card";
import { Link } from "@tanstack/react-router";

import { ProjectCardMenu } from "./components/project-card-menu";
import { ProjectThumbnail } from "./components/project-thumbnail";
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
          <Card>
            <CardContent>
              {/* A mouse shortcut to the title's link: kept out of the tab order and the a11y tree. */}
              <Link aria-hidden params={{ projectId: card.id }} tabIndex={-1} to="/p/$projectId">
                <ProjectThumbnail cover={card.cover} title={card.displayName} />
              </Link>
            </CardContent>
            <CardContent className="flex items-start gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="truncate">
                    <Link params={{ projectId: card.id }} to="/p/$projectId">
                      {card.displayName}
                    </Link>
                  </CardTitle>
                  {card.type && <Badge variant="secondary">{card.type}</Badge>}
                </div>
                <CardDescription>
                  <time title={card.updatedAt}>{card.updatedLabel}</time>
                  {` · 版 ${card.versionCount} · コメント ${card.commentCount} · 共有 ${card.shareCount}`}
                </CardDescription>
              </div>
              <ProjectCardMenu
                displayName={card.displayName}
                name={card.name}
                projectId={card.id}
              />
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
