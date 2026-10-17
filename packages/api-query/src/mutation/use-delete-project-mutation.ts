import type { ApiClient } from "@karibari/api/client";
import type { InferRequestType } from "hono/client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parseResponse } from "hono/client";

import { useApi } from "../use-api";

type Route = ApiClient["api"]["projects"][":project_id"]["$delete"];

export function useDeleteProjectMutation() {
  const client = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: InferRequestType<Route>) =>
      await parseResponse(await client.api.projects[":project_id"].$delete(request)),
    // The cascade also removes the project's versions, screens, comments and shares, whose batch
    // Keys sit outside the `["projects"]` prefix.
    onSuccess: async () =>
      await Promise.all(
        ["projects", "versions", "screens", "comments", "shares"].map(
          async (resource) => await queryClient.invalidateQueries({ queryKey: [resource] }),
        ),
      ),
  });
}
