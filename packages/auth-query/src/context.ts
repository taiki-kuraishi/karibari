import type { AuthClient, BetterAuthClientOptions } from "better-auth/client";

import { createContext } from "react";

export const AuthContext = createContext<AuthClient<BetterAuthClientOptions> | null>(null);
