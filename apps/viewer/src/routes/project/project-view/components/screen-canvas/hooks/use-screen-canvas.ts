import { type PointerEvent, useCallback, useRef, useState } from "react";

// Canvas units between neighbouring screens.
const SCREEN_GAP = 80;
// Viewport pixels kept clear around the row in the initial view.
const FIT_PADDING = 40;
// Below the ~0.04 that fits 20 screens of 1440px into a laptop-wide viewport.
// The initial fit is therefore never clamped.
const MIN_SCALE = 0.01;
const MAX_SCALE = 4;
// A mouse wheel notch reports a `deltaY` of about 100 and a pinch step only a few units.
// Clamping the delta keeps one notch from jumping while a pinch still feels direct.
const ZOOM_SPEED = 0.005;
const MAX_ZOOM_DELTA = 50;
// `WheelEvent.DOM_DELTA_LINE` in pixels; Firefox reports mouse wheels in lines.
const LINE_HEIGHT = 16;

export function useScreenCanvas(
  screens: { contentUrl: string; id: string; name: string | null; width: number }[],
) {
  const [transform, setTransform] = useState<{ scale: number; x: number; y: number }>();
  const dragPoint = useRef<{ x: number; y: number }>(undefined);
  const rowWidth =
    screens.reduce((total, { width }) => total + width, 0) +
    SCREEN_GAP * Math.max(screens.length - 1, 0);

  // A ref callback rather than `onWheel`: React registers wheel listeners as passive.
  // Only a non-passive one can stop ctrl+wheel and pinch from zooming the whole page.
  const viewportRef = useCallback(
    (viewport: HTMLDivElement) => {
      // The row never fits above 1: a lone narrow screen stays at its real size.
      const scale = Math.max(
        Math.min((viewport.clientWidth - FIT_PADDING * 2) / rowWidth, 1),
        MIN_SCALE,
      );
      // Fit the whole row's width once, top-aligned; later height reports keep the view.
      setTransform(
        (current) =>
          current ?? { scale, x: (viewport.clientWidth - rowWidth * scale) / 2, y: FIT_PADDING },
      );

      const onWheel = (event: WheelEvent) => {
        event.preventDefault();
        let unit = 1;

        if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
          unit = LINE_HEIGHT;
        }
        const deltaX = event.deltaX * unit;
        const deltaY = event.deltaY * unit;
        const bounds = viewport.getBoundingClientRect();
        const pointX = event.clientX - bounds.left;
        const pointY = event.clientY - bounds.top;
        // Browsers report a trackpad pinch as a wheel event with `ctrlKey` set.
        const zoom = event.ctrlKey || event.metaKey;

        setTransform((current) => {
          if (current === undefined) {
            return current;
          }

          if (!zoom) {
            return { scale: current.scale, x: current.x - deltaX, y: current.y - deltaY };
          }
          const factor = Math.exp(
            -Math.min(Math.max(deltaY, -MAX_ZOOM_DELTA), MAX_ZOOM_DELTA) * ZOOM_SPEED,
          );
          const next = Math.min(Math.max(current.scale * factor, MIN_SCALE), MAX_SCALE);
          // Keep the canvas point under the cursor in place.
          const ratio = next / current.scale;

          return {
            scale: next,
            x: pointX - (pointX - current.x) * ratio,
            y: pointY - (pointY - current.y) * ratio,
          };
        });
      };
      viewport.addEventListener("wheel", onWheel, { passive: false });

      return () => {
        viewport.removeEventListener("wheel", onWheel);
      };
    },
    [rowWidth],
  );

  return {
    frames: screens.map(({ contentUrl, id, name, width }, index) => ({
      contentUrl,
      id,
      label: name ?? `画面 ${index + 1}`,
      width,
    })),
    gap: SCREEN_GAP,
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      dragPoint.current = { x: event.clientX, y: event.clientY };
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      const from = dragPoint.current;

      if (from === undefined) {
        return;
      }
      dragPoint.current = { x: event.clientX, y: event.clientY };
      setTransform((current) => {
        if (current === undefined) {
          return current;
        }
        return {
          scale: current.scale,
          x: current.x + event.clientX - from.x,
          y: current.y + event.clientY - from.y,
        };
      });
    },
    onPointerUp: () => {
      dragPoint.current = undefined;
    },
    transform:
      transform && `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
    viewportRef,
  };
}
