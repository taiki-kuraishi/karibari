import { useQuery } from "@tanstack/react-query";
import { parseResponse } from "hono/client";

import { useApi } from "../use-api";

export function useProjectsQuery() {
  const client = useApi();

  return useQuery({
    queryFn: async () => {
      const res = await client.api.projects.$get();

      if (res.status === 404) {
        return null;
      }

      return await parseResponse(res);
    },
    queryKey: ["projects"],
  });
}
