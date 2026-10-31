import {
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useEditCommentMutation,
  useReplyCommentMutation,
  useResolveCommentMutation,
} from "@karibari/api-query";
import { useQueryStates } from "nuqs";

import { projectParams } from "@/routes/project/params";

import { useCommentModeStore } from "../../../hooks/use-comment-mode-store";
import { tagOf, useCommentThreads } from "../../../hooks/use-comment-threads";

/**
 * Prepare the side panel's threads and the writes it offers.
 * 1. Wait for the threads.
 * 2. Filter threads by the tab.
 * 3. Label the picked element, only when it belongs to this version.
 */
export function useCommentPanel({
  projectId,
  versionId,
}: {
  projectId: string;
  versionId: string;
}) {
  const data = useCommentThreads({ projectId, versionId });
  const selection = useCommentModeStore((store) => store.selection);
  const createComment = useCreateCommentMutation();
  const replyComment = useReplyCommentMutation();
  const editComment = useEditCommentMutation();
  const resolveComment = useResolveCommentMutation();
  const deleteComment = useDeleteCommentMutation();
  const [{ c: tab }, setParams] = useQueryStates(projectParams);
  const param = { project_id: projectId, version_id: versionId };

  // Step 1: Wait for the threads.
  if (data === undefined) {
    return { status: "loading" } as const;
  }

  // Step 2: Filter threads by the tab.
  const visible = data.threads.filter(({ resolved }) => tab === "all" || !resolved);
  // Step 3: Label the picked element, only when it belongs to this version.
  // A selection outlives a version switch; posting it here would 404 on its foreign screen.
  let selectionLabel: string | null = null;
  const selectedScreen = data.screens.get(selection?.screenId ?? "");

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
        param,
      });
    },
    onDelete: async (commentId: string) => {
      await deleteComment.mutateAsync({ param: { ...param, comment_id: commentId } });
    },
    onEdit: async (commentId: string, body: string) => {
      await editComment.mutateAsync({ json: { body }, param: { ...param, comment_id: commentId } });
    },
    onReply: async (commentId: string, body: string) => {
      await replyComment.mutateAsync({
        json: { body },
        param: { ...param, comment_id: commentId },
      });
    },
    onResolve: async (commentId: string, resolved: boolean) => {
      await resolveComment.mutateAsync({
        json: { resolved },
        param: { ...param, comment_id: commentId },
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
