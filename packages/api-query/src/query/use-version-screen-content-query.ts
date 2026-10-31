import { useQuery } from "@tanstack/react-query";
import { parseResponse } from "hono/client";

import { useApi } from "../use-api";

export function useVersionScreenContentQuery(
  projectId: string,
  versionId: string,
  screenId: string,
) {
  const client = useApi();

  return useQuery({
    queryFn: async () => {
      const res = await client.api.projects[":project_id"].versions[":version_id"].screens[
        ":screen_id"
      ].content.$get({
        param: { project_id: projectId, screen_id: screenId, version_id: versionId },
      });

      if (res.status === 404) {
        return null;
      }

      return await parseResponse(res);
    },
    queryKey: ["projects", projectId, "versions", versionId, "screens", screenId, "content"],
  });
}
