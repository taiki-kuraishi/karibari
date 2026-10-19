import { useProjectThumbnail } from "./hooks/use-project-thumbnail";

export function ProjectThumbnail({
  cover,
  title,
}: {
  cover: { contentUrl: string; height: number; width: number } | undefined;
  title: string;
}) {
  const view = useProjectThumbnail(cover);

  return (
    <div className="relative aspect-video overflow-hidden rounded-md bg-muted" ref={view.frameRef}>
      {/* `inert` hands every click to the link around the thumbnail. */}
      {view.status === "ready" && (
        <iframe
          className="pointer-events-none absolute top-0 left-0 origin-top-left bg-white"
          inert
          loading="lazy"
          sandbox="allow-scripts"
          scrolling="no"
          src={view.contentUrl}
          style={{ height: view.height, transform: `scale(${view.scale})`, width: view.width }}
          title={title}
        />
      )}
    </div>
  );
}
