import { Button } from "@karibari/shadcn/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@karibari/shadcn/components/dialog";
import { Field, FieldError, FieldLabel } from "@karibari/shadcn/components/field";
import { Input } from "@karibari/shadcn/components/input";

import { useRenameDialog } from "./hooks/use-rename-dialog";

export function RenameDialog({
  name,
  onClose,
  projectId,
}: {
  name: string | null;
  onClose: () => void;
  projectId: string;
}) {
  const { failed, form, saving } = useRenameDialog({ name, onClose, projectId });

  return (
    <Dialog onOpenChange={onClose} open>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>名前を変更</DialogTitle>
          </DialogHeader>
          <form.Field name="name">
            {(field) => (
              <Field data-invalid={failed}>
                <FieldLabel htmlFor={field.name}>名前</FieldLabel>
                <Input
                  aria-invalid={failed}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="無題"
                  value={field.state.value}
                />
                {failed && <FieldError>保存できませんでした</FieldError>}
              </Field>
            )}
          </form.Field>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>キャンセル</DialogClose>
            <Button disabled={saving} type="submit">
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
