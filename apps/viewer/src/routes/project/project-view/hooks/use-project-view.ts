import { useProjectQuery, useProjectVersionsQuery } from "@karibari/api-query";
import { notFound } from "@tanstack/react-router";
import { useQueryStates } from "nuqs";

import { projectParams } from "@/routes/project/params";

const createdAtFormatter = new Intl.DateTimeFormat("ja-JP", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/**
 * Prepare project details and version choices for the viewer.
 * 1. Wait for project and version data.
 * 2. Reject missing projects or version lists.
 * 3. Reject versions outside the project.
 */
export function useProjectView(projectId: string) {
  const { data: projectData } = useProjectQuery(projectId);
  const { data: versionsData } = useProjectVersionsQuery(projectId);
  const [{ v }, setParams] = useQueryStates(projectParams);

  // Step 1: Wait for project and version data.
  if (projectData === undefined || versionsData === undefined) {
    return { status: "loading" } as const;
  }

  // Step 2: Reject missing projects or version lists.
  // Thrown at render, not in a `queryFn`, where react-query would retry it.
  if (projectData === null || versionsData === null) {
    throw notFound();
  }
  const options = versionsData.versions.toReversed().map(({ created_at, id }, index) => ({
    id,
    label: `v${versionsData.versions.length - index} · ${createdAtFormatter.format(created_at * 1000)}`,
  }));
  const versionId = v ?? options.at(0)?.id;
  const version = versionsData.versions.find(({ id }) => id === versionId);

  // Step 3: Reject versions outside the project.
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
