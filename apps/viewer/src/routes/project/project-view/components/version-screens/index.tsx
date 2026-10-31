import { HtmlFrame } from "../html-frame";
import { ScreenCanvas } from "../screen-canvas";
import { useVersionScreens } from "./hooks/use-version-screens";

export function VersionScreens({
  projectId,
  title,
  type,
  versionId,
}: {
  projectId: string;
  title: string;
  type: "canvas" | "full";
  versionId: string;
}) {
  const view = useVersionScreens({ projectId, type, versionId });

  if (view.status === "loading") {
    return <p className="p-6 text-muted-foreground text-sm">読み込み中…</p>;
  }

  if (view.status === "full") {
    return (
      <HtmlFrame
        projectId={projectId}
        screenId={view.screenId}
        title={title}
        versionId={versionId}
      />
    );
  }
  // Keyed by version so switching versions fits the new row instead of keeping the old view.
  return (
    <ScreenCanvas
      key={versionId}
      projectId={projectId}
      screens={view.screens}
      versionId={versionId}
    />
  );
}
