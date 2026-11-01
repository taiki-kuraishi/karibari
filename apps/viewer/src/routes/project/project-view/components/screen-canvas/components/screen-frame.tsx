import { cn } from "@karibari/shadcn/lib/utils";

import { useSelectionFrame } from "../../../hooks/use-selection-frame";
import { ScreenPins } from "../../screen-pins";
import { ScreenFigure } from "./screen-figure";

export function ScreenFrame({
  height,
  label,
  projectId,
  screenId,
  versionId,
  width,
}: {
  height: number;
  label: string;
  projectId: string;
  screenId: string;
  versionId: string;
  width: number;
}) {
  const frame = useSelectionFrame({ forwardWheel: true, projectId, screenId, versionId });

  // Loading, or a screen whose stored HTML is missing: an empty sheet keeps the row's layout.
  if (frame.status !== "ready") {
    return (
      <ScreenFigure label={label} width={width}>
        <div className="bg-white shadow-md" style={{ height, width }} />
      </ScreenFigure>
    );
  }

  return (
    <ScreenFigure label={label} width={width}>
      {/* Outside comment mode, `inert` also keeps keyboard focus out of the screen; pointer-events
          alone would not. In comment mode the screen takes clicks and forwards wheels to the canvas.
          `scrolling="no"` is deprecated, yet the only way to drop the screen's scrollbar.
          Left visible, it would eat into the declared width. */}
      <div className="relative" style={{ height, width }}>
        <iframe
          className={cn("bg-white shadow-md", !frame.selecting && "pointer-events-none")}
          inert={!frame.selecting}
          ref={frame.ref}
          sandbox="allow-scripts"
          scrolling="no"
          srcDoc={frame.srcdoc}
          style={{ height, width }}
          title={label}
        />
        <ScreenPins projectId={projectId} screenId={screenId} versionId={versionId} />
      </div>
    </ScreenFigure>
  );
}
