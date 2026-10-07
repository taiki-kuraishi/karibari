import { useSuspenseQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

export function useProjectList() {
  const { data } = useSuspenseQuery({
    queryFn: async () => {
      const res = await apiClient.api.projects.$get();
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        throw new Error(`GET /api/projects responded with ${res.status}`);
      }

      return await res.json();
    },
    queryKey: ["projects"],
  });
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
