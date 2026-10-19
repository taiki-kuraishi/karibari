import { HomeHeader } from "./home/home-header";
import { ProjectList } from "./home/project-list";

export function HomePage() {
  return (
    <>
      <HomeHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-6">
        <ProjectList />
      </main>
    </>
  );
}
