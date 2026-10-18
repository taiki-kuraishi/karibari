import { useCallback, useState } from "react";

export function useProjectThumbnail(
  cover: { contentUrl: string; height: number; width: number } | undefined,
) {
  const [frameWidth, setFrameWidth] = useState<number>();

  // A ref callback, not an effect: the card's width follows the responsive grid.
  const frameRef = useCallback((frame: HTMLDivElement) => {
    const observer = new ResizeObserver(([entry]) => setFrameWidth(entry?.contentRect.width));
    observer.observe(frame);

    return () => observer.disconnect();
  }, []);

  if (cover === undefined) {
    return { frameRef, status: "empty" as const };
  }

  if (frameWidth === undefined) {
    return { frameRef, status: "measuring" as const };
  }

  return { ...cover, frameRef, scale: frameWidth / cover.width, status: "ready" as const };
}
