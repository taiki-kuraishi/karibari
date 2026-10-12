import { Navigate, Outlet, type RegisteredRouter } from "@tanstack/react-router";

import { useSessionGate } from "./session-gate/hooks/use-session-gate";

export function SessionGate() {
  const { signInHref } = useSessionGate();

  if (signInHref !== undefined) {
    return <Navigate<RegisteredRouter, string, string> href={signInHref} />;
  }

  return <Outlet />;
}
