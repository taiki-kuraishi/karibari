export function ScreenFrame({
  contentUrl,
  height,
  label,
  width,
}: {
  contentUrl: string;
  height: number;
  label: string;
  width: number;
}) {
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="truncate text-3xl text-muted-foreground" style={{ width }}>
        {label}
      </figcaption>
      {/* `inert` also keeps keyboard focus out of the screen; pointer-events alone would not.
          `scrolling="no"` is deprecated, yet the only way to drop a cross-origin document's scrollbar.
          Left visible, it would eat into the declared width. */}
      <iframe
        className="pointer-events-none bg-white shadow-md"
        inert
        sandbox="allow-scripts"
        scrolling="no"
        src={contentUrl}
        style={{ height, width }}
        title={label}
      />
    </figure>
  );
}
