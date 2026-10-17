import { useQuery } from "@tanstack/react-query";
import { parseResponse } from "hono/client";

import { useApi } from "../use-api";

export function useSharesQuery(projectIds: string[]) {
  const client = useApi();

  return useQuery({
    queryFn: async () => {
      const res = await client.api.shares.$get({ query: { project_id: projectIds } });

      if (res.status === 404) {
        return null;
      }

      return await parseResponse(res);
    },
    queryKey: ["shares", projectIds],
  });
}
