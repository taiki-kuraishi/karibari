import type { ComponentProps } from "react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@karibari/shadcn/components/empty";

import { CommentThread } from "./comment-thread";

export function ThreadList({
  actions,
  threads,
}: {
  actions: ComponentProps<typeof CommentThread>["actions"];
  threads: ComponentProps<typeof CommentThread>["thread"][];
}) {
  if (threads.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>まだコメントはありません</EmptyTitle>
          <EmptyDescription>
            画面の要素をクリックして、コメントを書けます。AI からのコメントもここに並びます。
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {threads.map((thread) => (
        <CommentThread actions={actions} key={thread.id} thread={thread} />
      ))}
    </ul>
  );
}
