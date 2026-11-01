import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@karibari/shadcn/components/resizable";

import { CommentPanel } from "./components/comment-panel";
import { CommentToggle } from "./components/comment-toggle";
import { ProjectHeader } from "./components/project-header";
import { VersionScreens } from "./components/version-screens";
import { useCommentModeStore } from "./hooks/use-comment-mode-store";
import { useProjectView } from "./hooks/use-project-view";

export function ProjectView({ projectId }: { projectId: string }) {
  const view = useProjectView(projectId);
  const commentMode = useCommentModeStore((store) => store.commentMode);

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
      >
        <CommentToggle projectId={projectId} versionId={view.versionId} />
      </ProjectHeader>
      <ResizablePanelGroup className="min-h-0 flex-1" orientation="horizontal">
        <ResizablePanel className="flex flex-col" id="screens">
          <VersionScreens
            projectId={projectId}
            title={view.displayName}
            type={view.type}
            versionId={view.versionId}
          />
        </ResizablePanel>
        {commentMode && (
          <>
            <ResizableHandle withHandle />
            {/* Numbers are pixels in react-resizable-panels v4: 320px by default, as in the design. */}
            <ResizablePanel defaultSize={320} id="comments" maxSize={640} minSize={240}>
              <CommentPanel projectId={projectId} versionId={view.versionId} />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </main>
  );
}
