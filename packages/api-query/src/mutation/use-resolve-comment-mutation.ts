import type { ApiClient } from "@karibari/api/client";
import type { InferRequestType } from "hono/client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parseResponse } from "hono/client";

import { useApi } from "../use-api";

type Route =
  ApiClient["api"]["projects"][":project_id"]["versions"][":version_id"]["comments"][":comment_id"]["resolution"]["$patch"];

export function useResolveCommentMutation() {
  const client = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: InferRequestType<Route>) =>
      await parseResponse(
        await client.api.projects[":project_id"].versions[":version_id"].comments[
          ":comment_id"
        ].resolution.$patch(request),
      ),
    onSuccess: async (_data, { param }) => {
      await queryClient.invalidateQueries({
        queryKey: ["projects", param.project_id, "versions", param.version_id, "comments"],
      });
    },
  });
}
