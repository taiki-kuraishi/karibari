import { Badge } from "@karibari/shadcn/components/badge";

const createdAtFormatter = new Intl.DateTimeFormat("ja-JP", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
});

export function CommentEntry({
  author,
  body,
  createdAt,
}: {
  author: { isMcp: boolean; name: string };
  body: string;
  createdAt: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium text-foreground">{author.name}</span>
        {author.isMcp && <Badge variant="secondary">MCP</Badge>}
        <time className="ml-auto text-muted-foreground tabular-nums">
          {createdAtFormatter.format(createdAt * 1000)}
        </time>
      </div>
      <p className="whitespace-pre-wrap text-sm">{body}</p>
    </div>
  );
}
