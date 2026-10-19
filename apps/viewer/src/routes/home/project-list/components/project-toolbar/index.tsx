import { InputGroup, InputGroupInput } from "@karibari/shadcn/components/input-group";
import { NativeSelect, NativeSelectOption } from "@karibari/shadcn/components/native-select";

import { sortKeys } from "@/routes/home/params";

const sortLabels = { created: "作成日", name: "名前", updated: "更新日" };

export function ProjectToolbar({
  count,
  q,
  search,
  sort,
  sortBy,
}: {
  count: number;
  q: string;
  search: (next: string) => void;
  sort: (typeof sortKeys)[number];
  sortBy: (next: (typeof sortKeys)[number]) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <InputGroup className="w-72">
        <InputGroupInput
          aria-label="名前で検索"
          onChange={(event) => search(event.target.value)}
          placeholder="名前で検索"
          type="search"
          value={q}
        />
      </InputGroup>
      <NativeSelect
        aria-label="並び替え"
        onChange={(event) => {
          const next = sortKeys.find((key) => key === event.target.value);

          if (next) {
            sortBy(next);
          }
        }}
        value={sort}
      >
        {sortKeys.map((key) => (
          <NativeSelectOption key={key} value={key}>
            {sortLabels[key]}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <span className="ml-auto text-muted-foreground text-sm">{count} 件</span>
    </div>
  );
}
