import { NativeSelect, NativeSelectOption } from "@karibari/shadcn/components/native-select";
import { Link } from "@tanstack/react-router";

/** Render the project heading and version selector. */
export function ProjectHeader({
  displayName,
  onSelect,
  options,
  versionId,
}: {
  displayName: string;
  onSelect: (versionId: string) => void;
  options: { id: string; label: string }[];
  versionId: string;
}) {
  return (
    <header className="flex flex-wrap items-center gap-4 border-b px-4 py-2">
      <Link className="text-muted-foreground text-sm hover:underline" to="/">
        ホーム
      </Link>
      <h1 className="font-semibold">{displayName}</h1>
      <NativeSelect
        aria-label="version"
        className="ml-auto shrink-0 font-medium"
        onChange={(event) => {
          onSelect(event.target.value);
        }}
        value={versionId}
      >
        {options.map(({ id, label }) => (
          <NativeSelectOption key={id} value={id}>
            {label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </header>
  );
}
