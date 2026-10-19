import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@karibari/shadcn/components/alert-dialog";

import { useDeleteDialog } from "./hooks/use-delete-dialog";

export function DeleteDialog({
  displayName,
  onClose,
  projectId,
}: {
  displayName: string;
  onClose: () => void;
  projectId: string;
}) {
  const { confirm, failed, saving } = useDeleteDialog({ onClose, projectId });

  return (
    <AlertDialog onOpenChange={onClose} open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>「{displayName}」を削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            版・画面・コメント・共有がすべて削除され、元に戻せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        {failed && <p className="text-destructive text-sm">削除できませんでした</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction disabled={saving} onClick={confirm} variant="destructive">
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
