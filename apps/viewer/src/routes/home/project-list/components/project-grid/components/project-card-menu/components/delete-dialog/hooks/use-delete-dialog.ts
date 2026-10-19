import { useDeleteProjectMutation } from "@karibari/api-query";
import { toast } from "@karibari/shadcn/components/toast";

export function useDeleteDialog({
  onClose,
  projectId,
}: {
  onClose: () => void;
  projectId: string;
}) {
  const remove = useDeleteProjectMutation();

  return {
    confirm: async () => {
      // `mutateAsync`, not a per-call `onSuccess`: the refetched list drops this card, and the
      // Unmount discards per-call callbacks. A failure stays on `remove.isError`.
      const result = await remove
        .mutateAsync({ param: { project_id: projectId } })
        .catch(() => null);

      if (result === null) {
        return;
      }
      toast.add({ title: "削除しました", type: "success" });
      onClose();
    },
    failed: remove.isError,
    saving: remove.isPending,
  };
}
