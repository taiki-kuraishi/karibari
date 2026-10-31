import {
  useCreateCommentMutation,
  useReplyCommentMutation,
  useVersionCommentsQuery,
  useVersionScreensQuery,
} from "@karibari/api-query";
import { useSessionQuery } from "@karibari/auth-query";
import { notFound } from "@tanstack/react-router";
import { useQueryStates } from "nuqs";

import { projectParams } from "@/routes/project/params";

import { useCommentModeStore } from "../../../hooks/use-comment-mode-store";

// The picked element's tag, read off the last `tag:nth-of-type(n)` step of the selector.
function tagOf(target: string) {
  return target.split(" > ").at(-1)?.split(":")[0] ?? target;
}

/**
 * Group a version's comments into threads for the side panel.
 * 1. Wait for comments, screens and the session.
 * 2. Reject a missing version.
 * 3. Attach replies to their thread and label each thread with its screen.
 * 4. Order threads by screen, then by creation, and filter by the tab.
 * 5. Label the picked element, only when it belongs to this version.
 */
export function useCommentPanel({
  projectId,
  versionId,
}: {
  projectId: string;
  versionId: string;
}) {
  const { data: commentsData } = useVersionCommentsQuery(projectId, versionId);
  const { data: screensData } = useVersionScreensQuery(projectId, versionId);
  const { data: session } = useSessionQuery();
  const selection = useCommentModeStore((store) => store.selection);
  const createComment = useCreateCommentMutation();
  const replyComment = useReplyCommentMutation();
  const [{ c: tab }, setParams] = useQueryStates(projectParams);

  // Step 1: Wait for comments, screens and the session.
  if (commentsData === undefined || screensData === undefined || session === undefined) {
    return { status: "loading" } as const;
  }

  // Step 2: Reject a missing version.
  // Thrown at render, not in a `queryFn`, where react-query would retry it.
  if (commentsData === null || screensData === null) {
    throw notFound();
  }

  // Step 3: Attach replies to their thread and label each thread with its screen.
  const screens = new Map(
    screensData.screens.map(({ id, name }, index) => [
      id,
      { index, label: name ?? `画面 ${index + 1}` },
    ]),
  );
  const authorOf = (source: "mcp" | "viewer") => {
    if (source === "mcp") {
      return { isMcp: true, name: "AI" };
    }
    return { isMcp: false, name: session?.user.name ?? "あなた" };
  };
  const toEntry = ({ body, created_at, id, source }: (typeof commentsData.comments)[number]) => ({
    author: authorOf(source),
    body,
    createdAt: created_at,
    id,
  });
  const threads = commentsData.comments
    .filter(({ parent_id }) => parent_id === null)
    .map((root) => {
      const screen = screens.get(root.screen_id ?? "");

      return Object.assign(toEntry(root), {
        replies: commentsData.comments
          .filter(({ parent_id }) => parent_id === root.id)
          .map(toEntry),
        resolved: root.resolved_at !== null,
        screenIndex: screen?.index ?? screens.size,
        targetLabel: `${screen?.label ?? "画面不明"} / ${tagOf(root.target)}`,
      });
    });

  // Step 4: Order threads by screen, then by creation, and filter by the tab.
  const visible = threads
    .toSorted((a, b) => a.screenIndex - b.screenIndex || a.createdAt - b.createdAt)
    .filter(({ resolved }) => tab === "all" || !resolved);
  // Step 5: Label the picked element, only when it belongs to this version.
  // A selection outlives a version switch; posting it here would 404 on its foreign screen.
  let selectionLabel: string | null = null;
  const selectedScreen = screens.get(selection?.screenId ?? "");

  if (selection !== null && selectedScreen !== undefined) {
    selectionLabel = `${selectedScreen.label} / ${tagOf(selection.target)}`;
  }

  return {
    onCreate: async (body: string) => {
      if (selection === null || selectedScreen === undefined) {
        return;
      }
      await createComment.mutateAsync({
        json: { body, screen_id: selection.screenId, target: selection.target },
        param: { project_id: projectId, version_id: versionId },
      });
    },
    onReply: async (commentId: string, body: string) => {
      await replyComment.mutateAsync({
        json: { body },
        param: { comment_id: commentId, project_id: projectId, version_id: versionId },
      });
    },
    onTabChange: async (value: unknown) => {
      if (value === "all") {
        await setParams({ c: "all" });
        return;
      }
      await setParams({ c: "open" });
    },
    selectionLabel,
    status: "ready",
    tab,
    threads: visible,
  } as const;
}
