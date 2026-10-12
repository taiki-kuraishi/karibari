import { getRouteApi } from "@tanstack/react-router";
import { Suspense } from "react";

import { ProjectView } from "./project/project-view";

const route = getRouteApi("/p/$projectId");

export function ProjectPage() {
  const { projectId } = route.useParams();

  return (
    <Suspense fallback={null}>
      <ProjectView projectId={projectId} />
    </Suspense>
  );
}
