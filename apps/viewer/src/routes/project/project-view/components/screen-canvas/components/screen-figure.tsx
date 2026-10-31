import type { ReactNode } from "react";

export function ScreenFigure({
  children,
  label,
  width,
}: {
  children: ReactNode;
  label: string;
  width: number;
}) {
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="truncate text-3xl text-muted-foreground" style={{ width }}>
        {label}
      </figcaption>
      {children}
    </figure>
  );
}
