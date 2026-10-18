import { Button } from "@karibari/shadcn/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@karibari/shadcn/components/empty";

const mcpUrl = `${import.meta.env.VITE_MCP_ORIGIN}/mcp`;

export function ProjectOnboarding() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>まだプロジェクトがありません</EmptyTitle>
        <EmptyDescription>MCP から HTML を入稿すると、ここに並びます。</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="max-w-md">
        <ol className="flex w-full list-decimal flex-col gap-1 pl-5 text-left text-sm">
          <li>MCP クライアントに karibari を追加する</li>
          <li>create_project で HTML を入稿する</li>
          <li>このページに表示される</li>
        </ol>
        <div className="flex w-full items-center gap-2">
          <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 text-left font-mono text-sm">
            {mcpUrl}
          </code>
          <Button onClick={() => void navigator.clipboard.writeText(mcpUrl)} variant="outline">
            コピー
          </Button>
        </div>
      </EmptyContent>
    </Empty>
  );
}
