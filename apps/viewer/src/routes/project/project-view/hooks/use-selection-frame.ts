import { useVersionCommentsQuery, useVersionScreenContentQuery } from "@karibari/api-query";
import { useCallback } from "react";

import { apiClient } from "@/lib/api-client";

import { type TargetPoint, useCommentModeStore } from "./use-comment-mode-store";

// Parent → frame: the whole selection state, re-sent on every change and on load.
interface FrameState {
  forwardWheel: boolean;
  selected: string | null;
  selecting: boolean;
  // Comment targets in this screen whose positions the parent needs for pins.
  targets: string[];
  type: "karibari:state";
}

// Frame → parent. The screen's own scripts can post anything, so these are only the expected shapes.
type FrameMessage =
  | { type: "karibari:ready" }
  | { target: string; type: "karibari:pick" }
  | { points: Record<string, TargetPoint>; type: "karibari:points" }
  | {
      clientX: number;
      clientY: number;
      ctrlKey: boolean;
      deltaMode: number;
      deltaX: number;
      deltaY: number;
      metaKey: boolean;
      type: "karibari:wheel";
    };

// Runs inside the sandboxed screen, so it is serialized with `toString()` and may not close over
// Anything in this module. The screen's origin is opaque, so messages go out with targetOrigin "*".
function selectionScript() {
  const HOVER = "data-karibari-hover";
  const SELECTED = "data-karibari-selected";
  let state = {
    forwardWheel: false,
    selected: null as string | null,
    selecting: false,
    targets: [] as string[],
  };

  const style = document.createElement("style");
  style.textContent = `[${HOVER}]{outline:2px dashed #4f46e5!important;outline-offset:2px}[${SELECTED}]{outline:2px solid #4f46e5!important;outline-offset:2px}`;
  document.documentElement.appendChild(style);
  const label = document.createElement("div");
  label.style.cssText =
    "position:fixed;z-index:2147483647;pointer-events:none;padding:2px 6px;border-radius:4px;background:#4f46e5;color:#fff;font:12px/1.4 sans-serif;display:none";
  document.documentElement.appendChild(label);

  const clear = (attribute: string) => {
    for (const element of document.querySelectorAll(`[${attribute}]`)) {
      element.removeAttribute(attribute);
    }
  };

  // A tag:nth-of-type path from <body>: stable across reloads of the same stored HTML.
  const selectorOf = (element: Element) => {
    const parts: string[] = [];
    let node: Element | null = element;

    while (node !== null && node !== document.body && node !== document.documentElement) {
      const tag = node.tagName.toLowerCase();
      const siblings: Element[] = node.parentElement
        ? [...node.parentElement.children].filter((child) => child.tagName === node?.tagName)
        : [node];
      parts.unshift(`${tag}:nth-of-type(${siblings.indexOf(node) + 1})`);
      node = node.parentElement;
    }

    return ["body", ...parts].join(" > ");
  };

  const render = () => {
    clear(SELECTED);

    if (state.selecting && state.selected !== null) {
      document.querySelector(state.selected)?.setAttribute(SELECTED, "");
    }

    if (!state.selecting) {
      clear(HOVER);
      label.style.display = "none";
    }
  };

  // Viewport coordinates: a full screen scrolls itself, so its pins follow the scroll; a canvas
  // Screen never scrolls, so these equal page coordinates there.
  const reportPoints = () => {
    const points: Record<string, { x: number; y: number }> = {};

    // Targets written through MCP are free text; one invalid selector must not drop every pin.
    const find = (target: string) => {
      try {
        return document.querySelector(target);
      } catch {
        return null;
      }
    };

    for (const target of state.targets) {
      const rect = find(target)?.getBoundingClientRect();

      if (rect !== undefined) {
        points[target] = { x: rect.left, y: rect.top };
      }
    }
    window.parent.postMessage({ points, type: "karibari:points" }, "*");
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent || event.data?.type !== "karibari:state") {
      return;
    }
    state = event.data;
    render();
    reportPoints();
  });
  window.addEventListener("scroll", reportPoints, { passive: true });
  window.addEventListener("resize", reportPoints);
  // Images and fonts move elements after the first report.
  window.addEventListener("load", reportPoints);

  document.addEventListener(
    "mouseover",
    (event) => {
      const element = event.target;

      if (!state.selecting || !(element instanceof Element) || element === document.body) {
        return;
      }
      clear(HOVER);
      element.setAttribute(HOVER, "");
      const rect = element.getBoundingClientRect();
      label.textContent = element.tagName.toLowerCase();
      label.style.display = "block";
      label.style.left = `${rect.left}px`;
      label.style.top = `${Math.max(rect.top - 22, 0)}px`;
    },
    true,
  );

  // Capture phase, so the screen's own links and buttons do not act while picking.
  document.addEventListener(
    "click",
    (event) => {
      const element = event.target;

      if (!state.selecting || !(element instanceof Element)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      window.parent.postMessage({ target: selectorOf(element), type: "karibari:pick" }, "*");
    },
    true,
  );

  // A wheel over an interactive canvas screen would otherwise scroll nothing and never reach the
  // Canvas, which pans and zooms on wheel.
  document.addEventListener(
    "wheel",
    (event) => {
      if (!state.forwardWheel) {
        return;
      }
      event.preventDefault();
      window.parent.postMessage(
        {
          clientX: event.clientX,
          clientY: event.clientY,
          ctrlKey: event.ctrlKey,
          deltaMode: event.deltaMode,
          deltaX: event.deltaX,
          deltaY: event.deltaY,
          metaKey: event.metaKey,
          type: "karibari:wheel",
        },
        "*",
      );
    },
    { passive: false },
  );

  // Asks for state now, not at `load` (which waits for images), so early clicks still pick.
  window.parent.postMessage({ type: "karibari:ready" }, "*");
}

// `<base>` keeps the stored HTML's relative URLs resolving against the api, as under `src`.
// It goes after `<head>` (or the doctype) because anything before a doctype forces quirks mode.
function buildSrcdoc(html: string, baseUrl: string) {
  const base = `<base href="${baseUrl}">`;
  const script = `<script>(${selectionScript.toString()})()</script>`;
  const head = /<head\b[^>]*>/iu.exec(html) ?? /<!doctype[^>]*>/iu.exec(html);

  if (head === null) {
    return `${base}${html}${script}`;
  }
  const end = head.index + head[0].length;

  return `${html.slice(0, end)}${base}${html.slice(end)}${script}`;
}

export function useSelectionFrame({
  forwardWheel,
  projectId,
  screenId,
  versionId,
}: {
  forwardWheel: boolean;
  projectId: string;
  screenId: string;
  versionId: string;
}) {
  const { data } = useVersionScreenContentQuery(projectId, versionId, screenId);
  const { data: commentsData } = useVersionCommentsQuery(projectId, versionId);
  const selecting = useCommentModeStore((store) => store.commentMode);
  // A string, so the ref callback below re-runs only when the set of targets really changes.
  const targetsKey = (commentsData?.comments ?? [])
    .filter(({ parent_id, screen_id }) => parent_id === null && screen_id === screenId)
    .map(({ target }) => target)
    .join("\n");

  // A ref callback, not an effect: it owns the listeners for exactly the iframe's lifetime.
  const ref = useCallback(
    (iframe: HTMLIFrameElement) => {
      const send = () => {
        const { commentMode, selection } = useCommentModeStore.getState();
        let selected: string | null = null;

        if (selection?.screenId === screenId) {
          selected = selection.target;
        }
        const message: FrameState = {
          forwardWheel: forwardWheel && commentMode,
          selected,
          selecting: commentMode,
          // Outside comment mode no pin shows, so the frame need not measure on every scroll.
          targets: targetsKey.split("\n").filter((target) => commentMode && target !== ""),
          type: "karibari:state",
        };
        iframe.contentWindow?.postMessage(message, "*");
      };
      // Only this iframe's window may talk: an opaque origin cannot be checked, the source can.
      // The screen is untrusted HTML that may post its own messages, so each type is matched.
      const onMessage = (event: MessageEvent<FrameMessage | null>) => {
        if (event.source !== iframe.contentWindow || event.data === null) {
          return;
        }

        if (event.data.type === "karibari:ready") {
          send();
          return;
        }

        if (event.data.type === "karibari:pick") {
          useCommentModeStore.getState().select({ screenId, target: event.data.target });
          return;
        }

        if (event.data.type === "karibari:points") {
          useCommentModeStore.getState().setPoints(screenId, event.data.points);
          return;
        }

        if (event.data.type !== "karibari:wheel") {
          return;
        }
        // Frame coordinates are unscaled; map them through the iframe's on-screen box.
        const bounds = iframe.getBoundingClientRect();
        const scale = bounds.width / iframe.offsetWidth;
        iframe.dispatchEvent(
          new WheelEvent("wheel", {
            bubbles: true,
            cancelable: true,
            clientX: bounds.left + event.data.clientX * scale,
            clientY: bounds.top + event.data.clientY * scale,
            ctrlKey: event.data.ctrlKey,
            deltaMode: event.data.deltaMode,
            deltaX: event.data.deltaX,
            deltaY: event.data.deltaY,
            metaKey: event.data.metaKey,
          }),
        );
      };

      window.addEventListener("message", onMessage);
      // Points are written back into the same store; re-sending on them would loop.
      const unsubscribe = useCommentModeStore.subscribe((state, previous) => {
        if (state.commentMode !== previous.commentMode || state.selection !== previous.selection) {
          send();
        }
      });
      // A changed target set re-runs this callback on an already loaded frame, which will not
      // Send `ready` again.
      send();

      return () => {
        window.removeEventListener("message", onMessage);
        unsubscribe();
      };
    },
    [forwardWheel, screenId, targetsKey],
  );

  if (data === undefined) {
    return { status: "loading" } as const;
  }

  // A canvas keeps its other screens when one stored HTML is missing; the caller decides.
  if (data === null) {
    return { status: "missing" } as const;
  }
  const baseUrl = apiClient.api.projects[":project_id"].versions[":version_id"].screens[
    ":screen_id"
  ].content
    .$url({ param: { project_id: projectId, screen_id: screenId, version_id: versionId } })
    .toString();

  return { ref, selecting, srcdoc: buildSrcdoc(data, baseUrl), status: "ready" } as const;
}
