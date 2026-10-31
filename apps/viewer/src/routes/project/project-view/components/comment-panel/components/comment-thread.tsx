import { CommentEntry } from "./comment-entry";
import { CommentForm } from "./comment-form";

export function CommentThread({
  onReply,
  thread,
}: {
  onReply: (commentId: string, body: string) => Promise<void>;
  thread: {
    author: { isMcp: boolean; name: string };
    body: string;
    createdAt: number;
    id: string;
    replies: {
      author: { isMcp: boolean; name: string };
      body: string;
      createdAt: number;
      id: string;
    }[];
    targetLabel: string;
  };
}) {
  return (
    <li className="flex flex-col gap-3 rounded-md bg-card p-3 ring-1 ring-border">
      <span className="text-muted-foreground text-xs">{thread.targetLabel}</span>
      <CommentEntry author={thread.author} body={thread.body} createdAt={thread.createdAt} />
      {thread.replies.length > 0 && (
        <ul aria-label="返信" className="flex flex-col gap-3 border-l-2 pl-3">
          {thread.replies.map(({ author, body, createdAt, id }) => (
            <li key={id}>
              <CommentEntry author={author} body={body} createdAt={createdAt} />
            </li>
          ))}
        </ul>
      )}
      <CommentForm
        label="返信"
        onSubmit={async (body) => {
          await onReply(thread.id, body);
        }}
        submitLabel="返信"
      />
    </li>
  );
}
