import { toast } from "@karibari/shadcn/components/toast";
import { useState } from "react";

export function useProjectCardMenu(projectId: string) {
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const projectUrl = `${globalThis.location.origin}/p/${projectId}`;

  return {
    closeDelete: () => setDeleting(false),
    closeRename: () => setRenaming(false),
    copyUrl: async () => {
      await navigator.clipboard.writeText(projectUrl);
      toast.add({ title: "URL をコピーしました", type: "success" });
    },
    deleting,
    openDelete: () => setDeleting(true),
    openRename: () => setRenaming(true),
    renaming,
  };
}
