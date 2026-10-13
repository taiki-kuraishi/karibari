import { Empty, EmptyDescription, EmptyHeader } from "@karibari/shadcn/components/empty";
import { Item, ItemContent, ItemTitle } from "@karibari/shadcn/components/item";
import { Link } from "@tanstack/react-router";

import { useProjectList } from "./hooks/use-project-list";

export function ProjectList() {
  const { items, status } = useProjectList();

  if (status === "loading") {
    return <p className="text-muted-foreground text-sm">読み込み中…</p>;
  }

  if (status === "hidden") {
    return null;
  }

  if (status === "empty") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyDescription>
            まだありません。MCP の create_project で HTML を入稿すると、ここに出ます。
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id}>
          <Item
            render={<Link params={{ projectId: item.id }} to="/p/$projectId" />}
            variant="outline"
          >
            <ItemContent>
              <ItemTitle>{item.displayName}</ItemTitle>
            </ItemContent>
          </Item>
        </li>
      ))}
    </ul>
  );
}
