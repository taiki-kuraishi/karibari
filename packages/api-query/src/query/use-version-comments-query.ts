import { useQuery } from "@tanstack/react-query";
import { parseResponse } from "hono/client";

import { useApi } from "../use-api";

export function useVersionCommentsQuery(projectId: string, versionId: string) {
  const client = useApi();

  return useQuery({
    queryFn: async () => {
      const res = await client.api.projects[":project_id"].versions[":version_id"].comments.$get({
        param: { project_id: projectId, version_id: versionId },
      });

      if (res.status === 404) {
        return null;
      }

      return await parseResponse(res);
    },
    queryKey: ["projects", projectId, "versions", versionId, "comments"],
  });
}
