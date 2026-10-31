import { Badge } from "@karibari/shadcn/components/badge";

export function SelectionChip({ label }: { label: string | null }) {
  if (label === null) {
    return <p className="text-muted-foreground text-xs">画面の要素をクリックして選びます</p>;
  }

  return (
    <Badge className="max-w-full truncate" variant="outline">
      {label}
    </Badge>
  );
}
