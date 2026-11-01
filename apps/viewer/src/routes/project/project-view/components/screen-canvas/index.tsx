import { cn } from "@karibari/shadcn/lib/utils";

import { ScreenFrame } from "./components/screen-frame";
import { useScreenCanvas } from "./hooks/use-screen-canvas";

export function ScreenCanvas({
  projectId,
  screens,
  versionId,
}: {
  projectId: string;
  screens: { height: number; id: string; name: string | null; width: number }[];
  versionId: string;
}) {
  const canvas = useScreenCanvas(screens);

  return (
    <div
      className="relative flex-1 cursor-grab touch-none select-none overflow-hidden bg-muted active:cursor-grabbing"
      onPointerCancel={canvas.onPointerUp}
      onPointerDown={canvas.onPointerDown}
      onPointerMove={canvas.onPointerMove}
      onPointerUp={canvas.onPointerUp}
      ref={canvas.viewportRef}
    >
      {/* Hidden, not unmounted, until the viewport is measured, so the iframes start loading. */}
      <div
        className={cn(
          "absolute top-0 left-0 flex w-max origin-top-left items-start",
          canvas.transform === undefined && "invisible",
        )}
        style={{ gap: canvas.gap, transform: canvas.transform }}
      >
        {canvas.frames.map(({ height, id, label, width }) => (
          <ScreenFrame
            height={height}
            key={id}
            label={label}
            projectId={projectId}
            screenId={id}
            versionId={versionId}
            width={width}
          />
        ))}
      </div>
    </div>
  );
}
