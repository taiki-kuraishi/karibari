import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../use-auth";

export function useSignOutMutation() {
  const client = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await client.signOut();

      if (error) {
        throw new Error(error.statusText, { cause: error });
      }
    },
    onSuccess: async () => await queryClient.invalidateQueries({ queryKey: ["session"] }),
  });
}
