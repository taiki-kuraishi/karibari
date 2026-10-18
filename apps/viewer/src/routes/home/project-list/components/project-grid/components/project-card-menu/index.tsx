import { Button } from "@karibari/shadcn/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@karibari/shadcn/components/dropdown-menu";
import { toast } from "@karibari/shadcn/components/toast";

export function ProjectCardMenu({ name, projectId }: { name: string; projectId: string }) {
  const projectUrl = `${globalThis.location.origin}/p/${projectId}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button aria-label={`${name} のメニュー`} size="icon-sm" variant="ghost" />}
      >
        …
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem
          onClick={async () => {
            await navigator.clipboard.writeText(projectUrl);
            toast.add({ title: "URL をコピーしました", type: "success" });
          }}
        >
          URL をコピー
        </DropdownMenuItem>
        <DropdownMenuItem disabled>名前を変更</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled variant="destructive">
          削除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
