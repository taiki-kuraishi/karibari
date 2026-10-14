import { useScreensQuery } from "@karibari/api-query";
import { notFound } from "@tanstack/react-router";

import { apiClient } from "@/lib/api-client";

export function useVersionScreens({
  projectId,
  type,
  versionId,
}: {
  projectId: string;
  type: "canvas" | "full";
  versionId: string;
}) {
  const { data } = useScreensQuery(projectId, versionId);

  if (data === undefined) {
    return { status: "loading" } as const;
  }

  // Thrown at render, not in a `queryFn`, where react-query would retry it.
  if (data === null) {
    throw notFound();
  }
  const screens = data.screens.map(({ height, id, name, width }) => ({
    contentUrl: apiClient.api.projects[":project_id"].versions[":version_id"].screens[
      ":screen_id"
    ].content
      .$url({ param: { project_id: projectId, screen_id: id, version_id: versionId } })
      .toString(),
    height,
    id,
    name,
    width,
  }));

  if (type === "canvas") {
    return { screens, status: "canvas" } as const;
  }
  // A full version holds exactly one screen; its declared width and height are not used.
  const screen = screens.at(0);

  if (screen === undefined) {
    throw notFound();
  }
  return { contentUrl: screen.contentUrl, status: "full" } as const;
}
