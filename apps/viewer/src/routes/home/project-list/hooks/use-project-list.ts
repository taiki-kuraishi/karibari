import { useProjectsQuery } from "@karibari/api-query";
import { useQueryStates } from "nuqs";

import { homeParams, type sortKeys } from "@/routes/home/params";

// The batch routes take at most 50 ids, so one page's ids always fit in a single request.
const pageSize = 24;
const collator = new Intl.Collator("ja");

export function useProjectList() {
  const { data } = useProjectsQuery();
  const [{ page, q, sort }, setParams] = useQueryStates(homeParams);

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
  const query = q.trim().toLowerCase();
  const matched = data.projects.filter((project) =>
    (project.name ?? "無題").toLowerCase().includes(query),
  );
  // The api already sends the newest update first, so "updated" keeps its order.
  const sorted = matched.toSorted((left, right) => {
    if (sort === "created") {
      return right.created_at - left.created_at;
    }

    if (sort === "name") {
      return collator.compare(left.name ?? "無題", right.name ?? "無題");
    }

    return 0;
  });
  // A new search or order starts again from page 1, so `page` is dropped with it.
  const toolbar = {
    count: sorted.length,
    q,
    // `page` carries `push`, and nuqs pushes a batch if any key does, so replace is set here.
    search: (next: string) =>
      void setParams({ page: null, q: next || null }, { history: "replace" }),
    sort,
    sortBy: (next: (typeof sortKeys)[number]) => void setParams({ page: null, sort: next }),
  };

  if (sorted.length === 0) {
    return { status: "no-match" as const, toolbar };
  }
  const pageCount = Math.ceil(sorted.length / pageSize);
  // A hand-edited `?page=` past either end shows the nearest real page.
  const currentPage = Math.min(Math.max(page, 1), pageCount);

  return {
    currentPage,
    pageCount,
    projects: sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    selectPage: (next: number) => void setParams({ page: next }),
    status: "list" as const,
    toolbar,
  };
}
