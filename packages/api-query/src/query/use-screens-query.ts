import { useQuery } from "@tanstack/react-query";
import { parseResponse } from "hono/client";

import { useApi } from "../use-api";

export function useScreensQuery(versionIds: string[]) {
  const client = useApi();

  return useQuery({
    queryFn: async () => {
      const res = await client.api.screens.$get({ query: { version_id: versionIds } });

      if (res.status === 404) {
        return null;
      }

      return await parseResponse(res);
    },
    queryKey: ["screens", versionIds],
  });
}
