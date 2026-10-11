import { useContext } from "react";

import { ApiContext } from "./context";

export function useApi() {
  const client = useContext(ApiContext);
  if (client === null) {
    throw new Error("useApi must be called inside ApiQueryProvider");
  }

  return client;
}
