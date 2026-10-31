import { useVersionCommentsQuery } from "@karibari/api-query";

import { useCommentModeStore } from "../../../hooks/use-comment-mode-store";

export function useCommentToggle({
  projectId,
  versionId,
}: {
  projectId: string;
  versionId: string;
}) {
  const { data } = useVersionCommentsQuery(projectId, versionId);
  const pressed = useCommentModeStore((store) => store.commentMode);
  const onToggle = useCommentModeStore((store) => store.toggleCommentMode);
  // Counts threads, not replies, so a reply does not read as a new comment.
  const count = data?.comments.filter(({ parent_id }) => parent_id === null).length ?? 0;

  let variant: "default" | "outline" = "outline";

  if (pressed) {
    variant = "default";
  }

  return { count, onToggle, pressed, variant };
}
