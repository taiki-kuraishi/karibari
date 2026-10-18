import type { AuthClient, BetterAuthClientOptions } from "better-auth/client";
import type { ReactNode } from "react";

import { AuthContext } from "./context";

export function AuthQueryProvider({
  children,
  client,
}: {
  children: ReactNode;
  client: AuthClient<BetterAuthClientOptions>;
}) {
  return <AuthContext value={client}>{children}</AuthContext>;
}
