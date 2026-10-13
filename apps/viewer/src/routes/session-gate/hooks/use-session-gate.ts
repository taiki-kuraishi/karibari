import { useQuery } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";

export function useSessionGate() {
  // Children render while this resolves, so only a settled `null` sends the visitor away.
  const { data } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: session, error } = await authClient.getSession();

      // Better-fetch resolves non-2xx as `{ data: null, error }`; rethrow so it is not mistaken for signed out.
      if (error) {
        throw new Error(error.statusText, { cause: error });
      }

      return session;
    },
  });

  if (data !== null) {
    return { signInHref: undefined };
  }
  const callbackURL = encodeURIComponent(globalThis.location.href);

  return {
    signInHref: `${import.meta.env.VITE_AUTH_ORIGIN}/sign-in?callbackURL=${callbackURL}`,
  };
}
