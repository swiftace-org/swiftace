import { Link, useMatchRoute } from "@tanstack/react-router"
import {
  ArrowLeftIcon,
  LayoutListIcon,
  type LucideIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react"

import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type ManageNavItem = {
  to:
    | "/course/$courseSlug/manage"
    | "/course/$courseSlug/manage/details"
    | "/course/$courseSlug/manage/participants"
  label: string
  icon: LucideIcon
  exact?: boolean
}

const NAV_ITEMS: ManageNavItem[] = [
  { to: "/course/$courseSlug/manage", label: "Course Sections", icon: LayoutListIcon, exact: true },
  { to: "/course/$courseSlug/manage/details", label: "Course Details", icon: SettingsIcon },
  { to: "/course/$courseSlug/manage/participants", label: "Participants", icon: UsersIcon },
]

export function ManageSidebar({ courseSlug }: { courseSlug: string }) {
  const matchRoute = useMatchRoute()

  return (
    <>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link to="/manage/courses" />}>
              <ArrowLeftIcon />
              <span>All Courses</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive = !!matchRoute({
                  to: item.to,
                  params: { courseSlug },
                  fuzzy: !item.exact,
                })
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link to={item.to} params={{ courseSlug }} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </>
  )
}
