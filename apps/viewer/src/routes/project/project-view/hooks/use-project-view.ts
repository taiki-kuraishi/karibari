import { useProjectQuery, useVersionsQuery } from "@karibari/api-query";
import { notFound } from "@tanstack/react-router";
import { useQueryStates } from "nuqs";

import { projectParams } from "@/routes/project/params";

export function useProjectView(projectId: string) {
  const { data: projectData } = useProjectQuery(projectId);
  const { data: versionsData } = useVersionsQuery(projectId);
  const [{ v }, setParams] = useQueryStates(projectParams);

  if (projectData === undefined || versionsData === undefined) {
    return { status: "loading" } as const;
  }

  // Thrown at render, not in a `queryFn`, where react-query would retry it.
  if (projectData === null || versionsData === null) {
    throw notFound();
  }
  // Newest row first, so the selector and the default (the last row) agree.
  const options = versionsData.versions.toReversed().map(({ id }) => ({ id }));
  const versionId = v ?? options.at(0)?.id;
  const version = versionsData.versions.find(({ id }) => id === versionId);

  if (version === undefined) {
    throw notFound();
  }

  return {
    displayName: projectData.project.name ?? "無題",
    options,
    select: async (id: string) => setParams({ v: id }),
    status: "ready",
    type: version.type,
    versionId: version.id,
  } as const;
}
