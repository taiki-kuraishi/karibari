import { useContext } from "react";

import { AuthContext } from "./context";

export function useAuth() {
  const client = useContext(AuthContext);
  if (client === null) {
    throw new Error("useAuth must be called inside AuthQueryProvider");
  }

  return client;
}
