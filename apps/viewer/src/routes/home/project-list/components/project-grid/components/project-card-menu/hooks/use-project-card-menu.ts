import { toast } from "@karibari/shadcn/components/toast";
import { useState } from "react";

export function useProjectCardMenu(projectId: string) {
  const [renaming, setRenaming] = useState(false);
  const projectUrl = `${globalThis.location.origin}/p/${projectId}`;

  return {
    closeRename: () => setRenaming(false),
    copyUrl: async () => {
      await navigator.clipboard.writeText(projectUrl);
      toast.add({ title: "URL をコピーしました", type: "success" });
    },
    openRename: () => setRenaming(true),
    renaming,
  };
}
