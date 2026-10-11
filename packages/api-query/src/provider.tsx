import type { ApiClient } from "@karibari/api/client";
import type { ReactNode } from "react";

import { ApiContext } from "./context";

export function ApiQueryProvider({ children, client }: { children: ReactNode; client: ApiClient }) {
  return <ApiContext value={client}>{children}</ApiContext>;
}
