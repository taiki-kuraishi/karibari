import { useProjectsQuery } from "@karibari/api-query";

export function useProjectList() {
  const { data } = useProjectsQuery();

  // A 404 means there is no session. Sending the visitor to sign-in is the auth gate's job, so draw nothing.
  if (data === null) {
    return { items: [], status: "hidden" as const };
  }
  const items = data.projects.map((project) => ({
    displayName: project.name ?? "無題",
    id: project.id,
  }));

  if (items.length === 0) {
    return { items, status: "empty" as const };
  }

  return { items, status: "list" as const };
}
