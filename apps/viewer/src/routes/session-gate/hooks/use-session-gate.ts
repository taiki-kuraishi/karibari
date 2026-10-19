import { useSessionQuery } from "@karibari/auth-query";

export function useSessionGate() {
  // Children render while this resolves, so only a settled `null` sends the visitor away.
  const { data } = useSessionQuery();

  if (data !== null) {
    return { signInHref: undefined };
  }
  const callbackURL = encodeURIComponent(globalThis.location.href);

  return {
    signInHref: `${import.meta.env.VITE_AUTH_ORIGIN}/sign-in?callbackURL=${callbackURL}`,
  };
}
