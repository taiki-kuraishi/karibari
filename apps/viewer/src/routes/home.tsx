import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";

import { ProjectList } from "../components/project-list";
import { apiClient } from "../lib/api-client";

function HomeContent() {
  const { data } = useSuspenseQuery({
    queryFn: async () => {
      const res = await apiClient.api.projects.$get();
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        throw new Error(`GET /api/projects responded with ${res.status}`);
      }

      return await res.json();
    },
    queryKey: ["projects"],
  });
  // A 404 means there is no session. Sending the visitor to sign-in is the auth gate's job, so draw nothing.
  if (data === null) {
    return null;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
      <ProjectList projects={data.projects} />
    </main>
  );
}

export function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
