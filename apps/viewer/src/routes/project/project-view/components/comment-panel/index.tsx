import { Tabs, TabsList, TabsTrigger } from "@karibari/shadcn/components/tabs";

import { CommentForm } from "./components/comment-form";
import { SelectionChip } from "./components/selection-chip";
import { ThreadList } from "./components/thread-list";
import { useCommentPanel } from "./hooks/use-comment-panel";

export function CommentPanel({ projectId, versionId }: { projectId: string; versionId: string }) {
  const panel = useCommentPanel({ projectId, versionId });

  if (panel.status === "loading") {
    return <p className="p-4 text-muted-foreground text-sm">読み込み中…</p>;
  }

  return (
    <aside aria-label="コメント" className="flex h-full flex-col border-l bg-background">
      <Tabs className="border-b p-3" onValueChange={panel.onTabChange} value={panel.tab}>
        <TabsList>
          <TabsTrigger value="open">未解決</TabsTrigger>
          <TabsTrigger value="all">すべて</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <ThreadList actions={panel} threads={panel.threads} />
      </div>
      <div className="flex flex-col gap-2 border-t p-3">
        <SelectionChip label={panel.selectionLabel} />
        <CommentForm
          disabled={panel.selectionLabel === null}
          label="新しいコメント"
          onSubmit={panel.onCreate}
          submitLabel="送信"
        />
      </div>
    </aside>
  );
}
