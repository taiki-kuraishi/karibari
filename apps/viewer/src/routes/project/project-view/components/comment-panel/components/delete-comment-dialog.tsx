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
import { useState } from "react";

export function DeleteCommentDialog({
  isThread,
  onClose,
  onConfirm,
}: {
  isThread: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [failed, setFailed] = useState(false);
  let description = "このコメントが削除され、元に戻せません。";

  if (isThread) {
    description = "このスレッドと、その返信がすべて削除され、元に戻せません。";
  }

  return (
    <AlertDialog onOpenChange={onClose} open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>コメントを削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {failed && <p className="text-destructive text-sm">削除できませんでした</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              try {
                await onConfirm();
              } catch {
                setFailed(true);
                return;
              }
              onClose();
            }}
            variant="destructive"
          >
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
