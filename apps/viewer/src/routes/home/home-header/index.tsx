import { Avatar, AvatarFallback, AvatarImage } from "@karibari/shadcn/components/avatar";
import { Button } from "@karibari/shadcn/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@karibari/shadcn/components/dropdown-menu";

import { useHomeHeader } from "./hooks/use-home-header";

export function HomeHeader() {
  const { signOut, user } = useHomeHeader();

  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <span className="font-semibold">karibari</span>
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button aria-label="ユーザーメニュー" size="icon" variant="ghost" />}
          >
            <Avatar>
              {user.image && <AvatarImage alt="" src={user.image} />}
              <AvatarFallback>{user.name.slice(0, 1)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="font-medium text-foreground">{user.name}</div>
                <div>{user.email}</div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>ログアウト</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
