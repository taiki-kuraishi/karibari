import { useQueryStates } from "nuqs";

import { projectParams } from "@/routes/project/params";

import { useCommentModeStore } from "../../../hooks/use-comment-mode-store";
import { useCommentThreads } from "../../../hooks/use-comment-threads";

/**
 * Build the pins drawn over one screen.
 * 1. Wait for the threads; show nothing outside comment mode.
 * 2. Keep this screen's threads whose target was found, following the panel's tab.
 */
export function useScreenPins({
  projectId,
  screenId,
  versionId,
}: {
  projectId: string;
  screenId: string;
  versionId: string;
}) {
  const data = useCommentThreads({ projectId, versionId });
  const commentMode = useCommentModeStore((store) => store.commentMode);
  const select = useCommentModeStore((store) => store.select);
  const [{ c: tab }] = useQueryStates(projectParams);

  // Step 1: Wait for the threads; show nothing outside comment mode.
  if (data === undefined || !commentMode) {
    return { pins: [] };
  }

  return {
    pins: data.threads.flatMap(
      ({ id, number, point, resolved, screenId: threadScreenId, target }) => {
        // Step 2: Keep this screen's threads whose target was found, following the panel's tab.
        // A resolved pin on the open tab would scroll to a thread the panel does not show.
        if (threadScreenId !== screenId || point === undefined || (resolved && tab !== "all")) {
          return [];
        }
        let label = `ピン ${number}`;
        let text = String(number);
        let tone = "bg-primary text-primary-foreground";

        if (resolved) {
          label = `ピン ${number}（解決済み）`;
          text = "✓";
          tone = "bg-muted text-muted-foreground";
        }

        return [
          {
            id,
            label,
            onSelect: () => {
              select({ screenId, target });
              document.getElementById(`comment-thread-${id}`)?.scrollIntoView({ block: "nearest" });
            },
            text,
            tone,
            x: point.x,
            y: point.y,
          },
        ];
      },
    ),
  };
}
