import { Empty, EmptyDescription, EmptyHeader } from "@karibari/shadcn/components/empty";
import { Item, ItemContent, ItemTitle } from "@karibari/shadcn/components/item";

import { useProjectList } from "./hooks/use-project-list";

export function ProjectList() {
  const { items, status } = useProjectList();
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
          {/* Not TanStack's `Link`: its typed `to` cannot point at the unregistered `/p/$projectId` route. */}
          <Item render={<a href={`/p/${item.id}`} />} variant="outline">
            <ItemContent>
              <ItemTitle>{item.displayName}</ItemTitle>
            </ItemContent>
          </Item>
        </li>
      ))}
    </ul>
  );
}
