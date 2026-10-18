import { useSessionQuery, useSignOutMutation } from "@karibari/auth-query";

export function useHomeHeader() {
  const { data } = useSessionQuery();
  // Its `null` session makes the session gate send the visitor to sign-in.
  const signOut = useSignOutMutation();

  return { signOut: () => signOut.mutate(), user: data?.user };
}
