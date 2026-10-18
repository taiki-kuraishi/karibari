import type { ApiClient } from "@karibari/api/client";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";

import { useQuery } from "@tanstack/react-query";
import { parseResponse } from "hono/client";

import { useApi } from "../use-api";

type Route = ApiClient["api"]["screens"]["$get"];
type Data = InferResponseType<Route, 200> | null;
type Options = Omit<UseQueryOptions<Data>, "queryFn" | "queryKey">;

export function useScreensQuery(versionIds: string[], options?: Options) {
  const client = useApi();

  return useQuery<Data>({
    ...options,
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
