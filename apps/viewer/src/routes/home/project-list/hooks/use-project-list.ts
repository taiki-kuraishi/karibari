import { useProjectsQuery } from "@karibari/api-query";
import { useQueryStates } from "nuqs";

import { homeParams } from "@/routes/home/params";

// The batch routes take at most 50 ids, so one page's ids always fit in a single request.
const pageSize = 24;

export function useProjectList() {
  const { data } = useProjectsQuery();
  const [{ page }, setParams] = useQueryStates(homeParams);

  if (data === undefined) {
    return { status: "loading" as const };
  }

  // A 404 means there is no session. Sending the visitor to sign-in is the auth gate's job, so draw nothing.
  if (data === null) {
    return { status: "hidden" as const };
  }

  if (data.projects.length === 0) {
    return { status: "empty" as const };
  }
  const pageCount = Math.ceil(data.projects.length / pageSize);
  // A hand-edited `?page=` past either end shows the nearest real page.
  const currentPage = Math.min(Math.max(page, 1), pageCount);

  return {
    currentPage,
    pageCount,
    projects: data.projects.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    selectPage: (next: number) => void setParams({ page: next }),
    status: "list" as const,
  };
}
