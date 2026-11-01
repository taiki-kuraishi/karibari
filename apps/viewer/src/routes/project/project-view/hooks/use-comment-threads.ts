import { useVersionCommentsQuery, useVersionScreensQuery } from "@karibari/api-query";
import { useSessionQuery } from "@karibari/auth-query";
import { notFound } from "@tanstack/react-router";

import { useCommentModeStore } from "./use-comment-mode-store";

// The picked element's tag, read off the last `tag:nth-of-type(n)` step of the selector.
export function tagOf(target: string) {
  return target.split(" > ").at(-1)?.split(":")[0] ?? target;
}

/**
 * Build a version's numbered comment threads, shared by the side panel and the pins.
 * 1. Wait for comments, screens and the session.
 * 2. Reject a missing version.
 * 3. Attach replies to their thread and label each thread with its screen.
 * 4. Order threads by screen, then by the target's position, then by creation, and number them.
 */
export function useCommentThreads({
  projectId,
  versionId,
}: {
  projectId: string;
  versionId: string;
}) {
  const { data: commentsData } = useVersionCommentsQuery(projectId, versionId);
  const { data: screensData } = useVersionScreensQuery(projectId, versionId);
  const { data: session } = useSessionQuery();
  const points = useCommentModeStore((store) => store.points);

  // Step 1: Wait for comments, screens and the session.
  if (commentsData === undefined || screensData === undefined || session === undefined) {
    return undefined;
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
  const toEntry = ({
    body,
    created_at,
    id,
    source,
    updated_at,
  }: (typeof commentsData.comments)[number]) => {
    let author = { isMcp: false, name: session?.user.name ?? "あなた" };

    if (source === "mcp") {
      author = { isMcp: true, name: "AI" };
    }

    // The api edits only viewer-written comments from a cookie session (UI requirement 6).
    return {
      author,
      body,
      canEdit: source === "viewer",
      createdAt: created_at,
      edited: updated_at !== null,
      id,
    };
  };
  const threads = commentsData.comments
    .filter(({ parent_id }) => parent_id === null)
    .map((root) => {
      const screen = screens.get(root.screen_id ?? "");
      const point = points[root.screen_id ?? ""]?.[root.target];

      return Object.assign(toEntry(root), {
        point,
        replies: commentsData.comments
          .filter(({ parent_id }) => parent_id === root.id)
          .map(toEntry),
        resolved: root.resolved_at !== null,
        screenId: root.screen_id,
        screenIndex: screen?.index ?? screens.size,
        target: root.target,
        targetLabel: `${screen?.label ?? "画面不明"} / ${tagOf(root.target)}`,
      });
    });

  // Step 4: Order threads by screen, then by the target's position, then by creation, and number them.
  // A target not found in its screen has no point and goes after the found ones.
  const sorted = threads.toSorted(
    (a, b) =>
      a.screenIndex - b.screenIndex ||
      (a.point?.y ?? Infinity) - (b.point?.y ?? Infinity) ||
      (a.point?.x ?? 0) - (b.point?.x ?? 0) ||
      a.createdAt - b.createdAt,
  );

  return {
    screens,
    threads: sorted.map((thread, index) => Object.assign(thread, { number: index + 1 })),
  };
}

export type CommentThreadData = NonNullable<
  ReturnType<typeof useCommentThreads>
>["threads"][number];
