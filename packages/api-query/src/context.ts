import type { ApiClient } from "@karibari/api/client";

import { createContext } from "react";

export const ApiContext = createContext<ApiClient | null>(null);
