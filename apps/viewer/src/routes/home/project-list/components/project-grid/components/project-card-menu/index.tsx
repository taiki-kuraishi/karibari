import { Button } from "@karibari/shadcn/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@karibari/shadcn/components/dropdown-menu";

import { DeleteDialog } from "./components/delete-dialog";
import { RenameDialog } from "./components/rename-dialog";
import { useProjectCardMenu } from "./hooks/use-project-card-menu";

export function ProjectCardMenu({
  displayName,
  name,
  projectId,
}: {
  displayName: string;
  name: string | null;
  projectId: string;
}) {
  const { closeDelete, closeRename, copyUrl, deleting, openDelete, openRename, renaming } =
    useProjectCardMenu(projectId);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button aria-label={`${displayName} のメニュー`} size="icon-sm" variant="ghost" />
          }
        >
          …
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuItem onClick={copyUrl}>URL をコピー</DropdownMenuItem>
          <DropdownMenuItem onClick={openRename}>名前を変更</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openDelete} variant="destructive">
            削除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Each dialog mounts only while open, so the rename input starts from the current name. */}
      {renaming && <RenameDialog name={name} onClose={closeRename} projectId={projectId} />}
      {deleting && (
        <DeleteDialog displayName={displayName} onClose={closeDelete} projectId={projectId} />
      )}
    </>
  );
}
