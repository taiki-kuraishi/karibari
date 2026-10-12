import { HtmlFrame } from "./components/html-frame";
import { ProjectHeader } from "./components/project-header";
import { useProjectView } from "./hooks/use-project-view";

export function ProjectView({ projectId }: { projectId: string }) {
  const { contentUrl, displayName } = useProjectView(projectId);

  return (
    <main className="flex h-svh flex-col">
      <ProjectHeader displayName={displayName} />
      <HtmlFrame contentUrl={contentUrl} title={displayName} />
    </main>
  );
}
