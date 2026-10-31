import { notFound } from "@tanstack/react-router";

import { useSelectionFrame } from "../hooks/use-selection-frame";

export function HtmlFrame({
  projectId,
  screenId,
  title,
  versionId,
}: {
  projectId: string;
  screenId: string;
  title: string;
  versionId: string;
}) {
  const frame = useSelectionFrame({ forwardWheel: false, projectId, screenId, versionId });

  if (frame.status === "loading") {
    return <p className="p-6 text-muted-foreground text-sm">読み込み中…</p>;
  }

  // Thrown at render, not in a `queryFn`, where react-query would retry it.
  if (frame.status === "missing") {
    throw notFound();
  }

  return (
    <iframe
      className="w-full flex-1"
      ref={frame.ref}
      sandbox="allow-scripts"
      srcDoc={frame.srcdoc}
      title={title}
    />
  );
}
