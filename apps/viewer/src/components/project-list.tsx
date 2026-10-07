import { Item, ItemContent, ItemTitle } from "@karibari/shadcn/components/item";

export function ProjectList({ projects }: { projects: { id: string; name: string | null }[] }) {
  if (projects.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        まだありません。MCP の create_project で HTML を入稿すると、ここに出ます。
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {projects.map((project) => (
        <li key={project.id}>
          {/* Not TanStack's `Link`: its typed `to` cannot point at the unregistered `/p/$projectId` route. */}
          <Item render={<a href={`/p/${project.id}`} />} variant="outline">
            <ItemContent>
              <ItemTitle>{project.name ?? "無題"}</ItemTitle>
            </ItemContent>
          </Item>
        </li>
      ))}
    </ul>
  );
}
