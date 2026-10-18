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
    // `mutate`, not `mutateAsync`: a failure stays on `rename.isError` instead of rejecting submit.
    onSubmit: ({ value }) =>
      rename.mutate(
        { json: value, param: { project_id: projectId } },
        {
          onSuccess: () => {
            toast.add({ title: "名前を変更しました", type: "success" });
            onClose();
          },
        },
      ),
  });

  return { failed: rename.isError, form, saving: rename.isPending };
}
