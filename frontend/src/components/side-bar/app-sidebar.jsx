import * as React from "react";
import { Bot, Command, LifeBuoy, Send } from "lucide-react";

import { NavMain } from "@/components/side-bar/nav-main";
import { NavSecondary } from "@/components/side-bar/nav-secondary";
import { NavUser } from "@/components/side-bar/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserSlice } from "@/redux/slices";
import { useDispatch, useSelector } from "react-redux";

const data = {
  navMain: [
    {
      title: "Generate Images",
      url: "generate-image",
      icon: Bot,
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ],
};

export function AppSidebar({ ...props }) {
  const { userInfo } = useSelector((state) => state["feature/user"]);
  const dispatch = useDispatch();
  const handleLogout = () => {
    dispatch(UserSlice.actions.logout({}));
  };
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    Simple Image Optimizer
                  </span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userInfo} onLogout={handleLogout} />
      </SidebarFooter>
    </Sidebar>
  );
}
