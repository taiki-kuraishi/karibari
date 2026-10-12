import { useProjectQuery, useVersionsQuery } from "@karibari/api-query";
import { notFound } from "@tanstack/react-router";

import { apiClient } from "@/lib/api-client";

export function useProjectView(projectId: string) {
  const { data: projectData } = useProjectQuery(projectId);
  const { data: versionsData } = useVersionsQuery(projectId);

  // Thrown at render, not in a `queryFn`, where react-query would retry it.
  if (projectData === null || versionsData === null) {
    throw notFound();
  }
  const version = versionsData.versions.at(-1);

  if (version === undefined) {
    throw notFound();
  }

  return {
    contentUrl: apiClient.api.projects[":project_id"].versions[":version_id"].content
      .$url({ param: { project_id: projectId, version_id: version.id } })
      .toString(),
    displayName: projectData.project.name ?? "無題",
    versionId: version.id,
  };
}
