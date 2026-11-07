import { Outlet, createFileRoute, notFound, redirect } from "@tanstack/react-router"
import { useState } from "react"

import { Sidebar, SidebarContent, SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { ROBOTS_NOINDEX_META } from "@/lib/config"

import { ManageMobileSidebars } from "./-components/manage-mobile-sidebars"
import { ManageNavbar } from "./-components/manage-navbar"
import { ManageSidebar } from "./-components/manage-sidebar"
import { loadManageCourseData } from "./-functions/load-manage-course-data"

export const Route = createFileRoute("/course/$courseSlug_/manage")({
  head: () => ({ meta: [ROBOTS_NOINDEX_META] }),
  beforeLoad: ({ context, location }) => {
    if (!context.account) {
      throw redirect({ to: "/login", search: { next: location.href } })
    }
    if (!context.account.isAdmin) {
      throw notFound()
    }
    return { account: context.account }
  },
  loader: async ({ params }) => {
    const { course, sections } = await loadManageCourseData({ data: params })
    if (!course) throw notFound()
    return { course, sections }
  },
  pendingComponent: ManageLayoutPending,
  component: ManageLayout,
})

function ManageLayout() {
  const { course } = Route.useLoaderData()
  const { account } = Route.useRouteContext()
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false)
  const [mobileLeftSidebarOpen, setMobileLeftSidebarOpen] = useState(false)
  const [mobileRightSidebarOpen, setMobileRightSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ManageNavbar
        account={account}
        course={course}
        desktopSidebar={{
          leftOpen: leftSidebarOpen,
          onToggleLeft: () => setLeftSidebarOpen((open) => !open),
          rightOpen: rightSidebarOpen,
          onToggleRight: () => setRightSidebarOpen((open) => !open),
        }}
        mobileSidebar={{
          leftOpen: mobileLeftSidebarOpen,
          onToggleLeft: () => setMobileLeftSidebarOpen((open) => !open),
          rightOpen: mobileRightSidebarOpen,
          onToggleRight: () => setMobileRightSidebarOpen((open) => !open),
        }}
      />
      <ManageMobileSidebars
        courseSlug={course.slug}
        leftOpen={mobileLeftSidebarOpen}
        onLeftOpenChange={setMobileLeftSidebarOpen}
        rightOpen={mobileRightSidebarOpen}
        onRightOpenChange={setMobileRightSidebarOpen}
      />
      <SidebarProvider
        open={leftSidebarOpen}
        onOpenChange={setLeftSidebarOpen}
        className="relative min-h-0 flex-1"
      >
        <Sidebar
          side="left"
          className="absolute h-full [&>[data-slot=sidebar-inner]]:bg-background"
        >
          <ManageSidebar courseSlug={course.slug} />
        </Sidebar>

        <SidebarProvider
          open={rightSidebarOpen}
          onOpenChange={setRightSidebarOpen}
          className="contents"
        >
          <SidebarInset className="flex-row overflow-hidden">
            {/* Each page sets its own width — the participants table needs the full inset
                and scrolls horizontally inside it. */}
            <div className="flex-1 overflow-y-auto p-4">
              <Outlet />
            </div>
            <Sidebar
              side="right"
              className="absolute h-full [&>[data-slot=sidebar-inner]]:bg-background"
            >
              <SidebarContent className="p-4" />
            </Sidebar>
          </SidebarInset>
        </SidebarProvider>
      </SidebarProvider>
    </div>
  )
}

function ManageLayoutPending() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-2 py-1 shrink-0">
        <div className="flex items-center gap-1">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
        </div>
        <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 items-center gap-2">
          <Skeleton className="size-5 rounded-sm" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="size-8 rounded-full" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-72 shrink-0 flex-col border-r md:flex">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-start gap-3 border-b px-4 py-4">
              <Skeleton className="mt-0.5 size-4 shrink-0" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
