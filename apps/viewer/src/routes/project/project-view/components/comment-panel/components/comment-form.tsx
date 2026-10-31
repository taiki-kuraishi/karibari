import type { KeyboardEvent } from "react";

import { Button } from "@karibari/shadcn/components/button";
import { Textarea } from "@karibari/shadcn/components/textarea";
import { useState } from "react";

// One form for new threads and replies: both send a body and clear on success.
export function CommentForm({
  disabled = false,
  label,
  onSubmit,
  submitLabel,
}: {
  disabled?: boolean;
  label: string;
  onSubmit: (body: string) => Promise<void>;
  submitLabel: string;
}) {
  const [body, setBody] = useState("");
  const [failed, setFailed] = useState(false);
  const blocked = disabled || body.trim() === "";
  const submit = async () => {
    if (blocked) {
      return;
    }

    try {
      await onSubmit(body);
    } catch {
      // A failed send keeps the body, so pressing again retries it.
      setFailed(true);
      return;
    }
    setFailed(false);
    setBody("");
  };
  const onKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      await submit();
    }
  };

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        await submit();
      }}
    >
      <Textarea
        aria-label={label}
        onChange={(event) => {
          setBody(event.target.value);
        }}
        onKeyDown={onKeyDown}
        placeholder="⌘/Ctrl + Enter で送信"
        value={body}
      />
      {failed && (
        <p className="text-destructive text-xs">送信できませんでした。もう一度お試しください。</p>
      )}
      <Button className="self-end" disabled={blocked} size="sm" type="submit">
        {submitLabel}
      </Button>
    </form>
  );
}
