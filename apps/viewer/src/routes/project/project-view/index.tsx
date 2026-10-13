import { HtmlFrame } from "./components/html-frame";
import { ProjectHeader } from "./components/project-header";
import { useProjectView } from "./hooks/use-project-view";

export function ProjectView({ projectId }: { projectId: string }) {
  const view = useProjectView(projectId);

  if (view.status === "loading") {
    return <p className="p-6 text-muted-foreground text-sm">読み込み中…</p>;
  }

  return (
    <main className="flex h-svh flex-col">
      <ProjectHeader
        displayName={view.displayName}
        onSelect={view.select}
        options={view.options}
        versionId={view.versionId}
      />
      <HtmlFrame contentUrl={view.contentUrl} title={view.displayName} />
    </main>
  );
}
