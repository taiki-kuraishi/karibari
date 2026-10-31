import { useVersionScreensQuery } from "@karibari/api-query";
import { notFound } from "@tanstack/react-router";

export function useVersionScreens({
  projectId,
  type,
  versionId,
}: {
  projectId: string;
  type: "canvas" | "full";
  versionId: string;
}) {
  const { data } = useVersionScreensQuery(projectId, versionId);

  if (data === undefined) {
    return { status: "loading" } as const;
  }

  // Thrown at render, not in a `queryFn`, where react-query would retry it.
  if (data === null) {
    throw notFound();
  }
  const { screens } = data;

  if (type === "canvas") {
    return { screens, status: "canvas" } as const;
  }
  // A full version holds exactly one screen; its declared width and height are not used.
  const screen = screens.at(0);

  if (screen === undefined) {
    throw notFound();
  }
  return { screenId: screen.id, status: "full" } as const;
}
