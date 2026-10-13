import { useCallback, useState } from "react";

// The frame's height until the screen reports its own; the screen-height script sizes
// `vh` against this same value.
const INITIAL_HEIGHT = 900;
// The screen-height script caps at the same value.
// A runaway page therefore cannot grow the canvas without bound.
const MAX_HEIGHT = 20_000;

export function useScreenFrame() {
  const [height, setHeight] = useState(INITIAL_HEIGHT);
  // Stable, so React subscribes once per iframe instead of on every render.
  const frameRef = useCallback((frame: HTMLIFrameElement) => {
    const onMessage = (event: MessageEvent) => {
      // Every frame shares `window`, so the source is what ties a message to this frame.
      if (event.source !== frame.contentWindow) {
        return;
      }
      const data: unknown = event.data;

      if (
        typeof data !== "object" ||
        data === null ||
        !("type" in data) ||
        data.type !== "karibari:screen-height" ||
        !("height" in data) ||
        typeof data.height !== "number" ||
        !Number.isFinite(data.height)
      ) {
        return;
      }
      setHeight(Math.min(Math.max(data.height, 0), MAX_HEIGHT));
    };
    window.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return { frameRef, height };
}
