import type { ApiClient } from "@karibari/api/client";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";

import { useQuery } from "@tanstack/react-query";
import { parseResponse } from "hono/client";

import { useApi } from "../use-api";

type Route = ApiClient["api"]["shares"]["$get"];
type Data = InferResponseType<Route, 200> | null;
type Options = Omit<UseQueryOptions<Data>, "queryFn" | "queryKey">;

export function useSharesQuery(projectIds: string[], options?: Options) {
  const client = useApi();

  return useQuery<Data>({
    ...options,
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
