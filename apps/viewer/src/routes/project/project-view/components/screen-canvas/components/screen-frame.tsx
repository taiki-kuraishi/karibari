import { useScreenFrame } from "../hooks/use-screen-frame";

export function ScreenFrame({
  contentUrl,
  label,
  width,
}: {
  contentUrl: string;
  label: string;
  width: number;
}) {
  const { frameRef, height } = useScreenFrame();

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="truncate text-3xl text-muted-foreground" style={{ width }}>
        {label}
      </figcaption>
      {/* `inert` also keeps keyboard focus out of the screen; pointer-events alone would not. */}
      <iframe
        className="pointer-events-none bg-white shadow-md"
        inert
        ref={frameRef}
        sandbox="allow-scripts"
        src={contentUrl}
        style={{ height, width }}
        title={label}
      />
    </figure>
  );
}
