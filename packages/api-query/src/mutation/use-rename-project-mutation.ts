import type { ApiClient } from "@karibari/api/client";
import type { InferRequestType } from "hono/client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parseResponse } from "hono/client";

import { useApi } from "../use-api";

type Route = ApiClient["api"]["projects"][":project_id"]["$patch"];

export function useRenameProjectMutation() {
  const client = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: InferRequestType<Route>) =>
      await parseResponse(await client.api.projects[":project_id"].$patch(request)),
    onSuccess: async () => await queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}
