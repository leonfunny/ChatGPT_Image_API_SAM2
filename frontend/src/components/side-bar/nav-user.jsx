import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronsUpDown } from "lucide-react";

export function NavUser({ user, onLogout }) {
  console.log(user);
  return (
    <div className="">
      <hr className="mb-2" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center p-2 gap-2 w-full hover:bg-gray-200 cursor-pointer rounded-md">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage alt={user?.first_name} />
              <AvatarFallback className="rounded-lg">
                {user?.first_name.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <div>
                <span className="truncate font-semibold">
                  {user?.first_name}
                </span>{" "}
                <span className="truncate font-semibold">
                  {user?.last_name}
                </span>
              </div>
              <span className="truncate text-xs">{user?.email}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 z-50">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuItem onClick={onLogout}>Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
