import { Button } from "@karibari/shadcn/components/button";
import { cn } from "@karibari/shadcn/lib/utils";

import { type CommentEntryData, CommentEntry } from "./comment-entry";
import { CommentForm } from "./comment-form";

export interface CommentThreadActions {
  onDelete: (commentId: string) => Promise<void>;
  onEdit: (commentId: string, body: string) => Promise<void>;
  onReply: (commentId: string, body: string) => Promise<void>;
  onResolve: (commentId: string, resolved: boolean) => Promise<void>;
}

export function CommentThread({
  actions,
  thread,
}: {
  actions: CommentThreadActions;
  thread: CommentEntryData & {
    number: number;
    replies: CommentEntryData[];
    resolved: boolean;
    targetLabel: string;
  };
}) {
  let resolveLabel = "解決";

  if (thread.resolved) {
    resolveLabel = "再開";
  }

  return (
    <li
      className={cn(
        "flex scroll-mt-3 flex-col gap-3 rounded-md bg-card p-3 ring-1 ring-border",
        thread.resolved && "opacity-60",
      )}
      id={`comment-thread-${thread.id}`}
    >
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <span className="font-mono tabular-nums">#{thread.number}</span>
        <span className="truncate">{thread.targetLabel}</span>
        <Button
          className="ml-auto"
          onClick={() => {
            actions.onResolve(thread.id, !thread.resolved).catch(() => {
              // The button keeps its label on failure, so pressing it again retries.
            });
          }}
          size="xs"
          variant="outline"
        >
          {resolveLabel}
        </Button>
      </div>
      <CommentEntry entry={thread} isThread onDelete={actions.onDelete} onEdit={actions.onEdit} />
      {thread.replies.length > 0 && (
        <ul aria-label="返信" className="flex flex-col gap-3 border-l-2 pl-3">
          {thread.replies.map((reply) => (
            <li key={reply.id}>
              <CommentEntry
                entry={reply}
                isThread={false}
                onDelete={actions.onDelete}
                onEdit={actions.onEdit}
              />
            </li>
          ))}
        </ul>
      )}
      <CommentForm
        label="返信"
        onSubmit={async (body) => {
          await actions.onReply(thread.id, body);
        }}
        submitLabel="返信"
      />
    </li>
  );
}
