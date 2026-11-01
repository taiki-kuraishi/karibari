import { Badge } from "@karibari/shadcn/components/badge";
import { Button } from "@karibari/shadcn/components/button";
import { useState } from "react";

import type { CommentThreadData } from "../../../hooks/use-comment-threads";

import { CommentForm } from "./comment-form";
import { DeleteCommentDialog } from "./delete-comment-dialog";

const createdAtFormatter = new Intl.DateTimeFormat("ja-JP", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
});

export type CommentEntryData = Pick<
  CommentThreadData,
  "author" | "body" | "canEdit" | "createdAt" | "edited" | "id"
>;

export function CommentEntry({
  entry,
  isThread,
  onDelete,
  onEdit,
}: {
  entry: CommentEntryData;
  isThread: boolean;
  onDelete: (commentId: string) => Promise<void>;
  onEdit: (commentId: string, body: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"deleting" | "editing" | "idle">("idle");

  if (mode === "editing") {
    return (
      <CommentForm
        initialBody={entry.body}
        label="コメントを編集"
        onCancel={() => {
          setMode("idle");
        }}
        onSubmit={async (body) => {
          await onEdit(entry.id, body);
          setMode("idle");
        }}
        submitLabel="保存"
      />
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium text-foreground">{entry.author.name}</span>
        {entry.author.isMcp && <Badge variant="secondary">MCP</Badge>}
        <time className="ml-auto text-muted-foreground tabular-nums">
          {createdAtFormatter.format(entry.createdAt * 1000)}
        </time>
      </div>
      <p className="whitespace-pre-wrap text-sm">{entry.body}</p>
      <div className="flex items-center gap-1 text-xs">
        {entry.edited && <span className="text-muted-foreground">編集済み</span>}
        {entry.canEdit && (
          <Button
            onClick={() => {
              setMode("editing");
            }}
            size="xs"
            variant="ghost"
          >
            編集
          </Button>
        )}
        <Button
          onClick={() => {
            setMode("deleting");
          }}
          size="xs"
          variant="ghost"
        >
          削除
        </Button>
      </div>
      {mode === "deleting" && (
        <DeleteCommentDialog
          isThread={isThread}
          onClose={() => {
            setMode("idle");
          }}
          onConfirm={async () => {
            await onDelete(entry.id);
          }}
        />
      )}
    </div>
  );
}
