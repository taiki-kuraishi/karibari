import { Button } from "@karibari/shadcn/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@karibari/shadcn/components/empty";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@karibari/shadcn/components/pagination";

import { ProjectGrid } from "./components/project-grid";
import { ProjectToolbar } from "./components/project-toolbar";
import { useProjectList } from "./hooks/use-project-list";

export function ProjectList() {
  const view = useProjectList();

  if (view.status === "loading") {
    return <p className="text-muted-foreground text-sm">読み込み中…</p>;
  }

  if (view.status === "hidden") {
    return null;
  }

  if (view.status === "empty") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyDescription>
            まだありません。MCP の create_project で HTML を入稿すると、ここに出ます。
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (view.status === "no-match") {
    return (
      <div className="flex flex-col gap-6">
        <ProjectToolbar {...view.toolbar} />
        <Empty>
          <EmptyHeader>
            <EmptyTitle>一致するプロジェクトはありません</EmptyTitle>
            <EmptyDescription>「{view.toolbar.q}」に一致する名前がありません。</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => view.toolbar.search("")} variant="outline">
              検索をクリア
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }
  const { currentPage, pageCount, selectPage } = view;
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <div className="flex flex-col gap-6">
      <ProjectToolbar {...view.toolbar} />
      <ProjectGrid projects={view.projects} />
      {pageCount > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                aria-disabled={currentPage === 1}
                href={`?page=${Math.max(currentPage - 1, 1)}`}
                onClick={(event) => {
                  event.preventDefault();
                  selectPage(Math.max(currentPage - 1, 1));
                }}
                text="前へ"
              />
            </PaginationItem>
            {pages.map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  href={`?page=${page}`}
                  isActive={page === currentPage}
                  onClick={(event) => {
                    event.preventDefault();
                    selectPage(page);
                  }}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                aria-disabled={currentPage === pageCount}
                href={`?page=${Math.min(currentPage + 1, pageCount)}`}
                onClick={(event) => {
                  event.preventDefault();
                  selectPage(Math.min(currentPage + 1, pageCount));
                }}
                text="次へ"
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
