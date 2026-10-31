import { cn } from "@karibari/shadcn/lib/utils";

import { useScreenPins } from "./hooks/use-screen-pins";

// Drawn over a screen's iframe, in the screen's own pixels, so a canvas scales them with it.
export function ScreenPins({
  projectId,
  screenId,
  versionId,
}: {
  projectId: string;
  screenId: string;
  versionId: string;
}) {
  const view = useScreenPins({ projectId, screenId, versionId });

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {view.pins.map(({ id, label, onSelect, text, tone, x, y }) => (
        <button
          aria-label={label}
          className={cn(
            "pointer-events-auto absolute flex size-6 -translate-1/2 items-center justify-center rounded-full font-mono text-xs shadow-md ring-2 ring-background",
            tone,
          )}
          key={id}
          onClick={onSelect}
          // Keeps the canvas from starting a pan under the pin.
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          style={{ left: x, top: y }}
          type="button"
        >
          {text}
        </button>
      ))}
    </div>
  );
}
