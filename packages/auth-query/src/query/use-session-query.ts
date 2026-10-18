import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../use-auth";

export function useSessionQuery() {
  const client = useAuth();

  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: session, error } = await client.getSession();

      // Better-fetch resolves non-2xx as `{ data: null, error }`; rethrow so it is not mistaken for signed out.
      if (error) {
        throw new Error(error.statusText, { cause: error });
      }

      return session;
    },
  });
}
