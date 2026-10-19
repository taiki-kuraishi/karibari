import { useRenameProjectMutation } from "@karibari/api-query";
import { toast } from "@karibari/shadcn/components/toast";
import { useForm } from "@tanstack/react-form";

export function useRenameDialog({
  name,
  onClose,
  projectId,
}: {
  name: string | null;
  onClose: () => void;
  projectId: string;
}) {
  const rename = useRenameProjectMutation();
  // The form owns only the input; saving and failure stay on the mutation, not a second copy.
  const form = useForm({
    defaultValues: { name: name ?? "" },
    // `mutateAsync`, not a per-call `onSuccess`: under `?q=` the refetched list can drop this card,
    // And the unmount discards per-call callbacks. A failure stays on `rename.isError`.
    onSubmit: async ({ value }) => {
      const result = await rename
        .mutateAsync({ json: value, param: { project_id: projectId } })
        .catch(() => null);

      if (result === null) {
        return;
      }
      toast.add({ title: "名前を変更しました", type: "success" });
      onClose();
    },
  });

  return { failed: rename.isError, form, saving: rename.isPending };
}
