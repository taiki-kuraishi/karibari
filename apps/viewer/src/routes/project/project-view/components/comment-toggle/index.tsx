import { Button } from "@karibari/shadcn/components/button";

import { useCommentToggle } from "./hooks/use-comment-toggle";

export function CommentToggle({ projectId, versionId }: { projectId: string; versionId: string }) {
  const toggle = useCommentToggle({ projectId, versionId });

  return (
    <Button
      aria-pressed={toggle.pressed}
      onClick={toggle.onToggle}
      size="sm"
      variant={toggle.variant}
    >
      コメント {toggle.count}
    </Button>
  );
}
