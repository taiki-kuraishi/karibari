import { getRouteApi } from "@tanstack/react-router";

import { ProjectView } from "./project/project-view";

const route = getRouteApi("/session-gate/p/$projectId");

export function ProjectPage() {
  const { projectId } = route.useParams();

  return <ProjectView projectId={projectId} />;
}
