import { Suspense } from "react";

import { ProjectList } from "./home/project-list";

export function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
      <Suspense fallback={null}>
        <ProjectList />
      </Suspense>
    </main>
  );
}
