import { Outlet, createFileRoute, notFound } from "@tanstack/react-router"
import { type CSSProperties, useEffect, useState } from "react"

import { Sidebar, SidebarContent, SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { useSiteConfig } from "@/lib/hooks"

import { AiTutorPanel } from "./-components/ai-tutor-panel"
import { AiTutorProvider } from "./-components/ai-tutor-provider"
import { AiTutorResizeHandle } from "./-components/ai-tutor-resize-handle"
import { CourseMobileSidebars } from "./-components/course-mobile-sidebars"
import { CourseNavbar } from "./-components/course-navbar"
import { CourseSidebar } from "./-components/course-sidebar"
import { loadCoursePageData } from "./-functions/load-course-page-data"
import {
  AI_TUTOR_PANEL_DEFAULT_WIDTH,
  AI_TUTOR_PANEL_OPEN_COOKIE,
  AI_TUTOR_PANEL_WIDTH_COOKIE,
} from "./-lib/constants"
import {
  readAiTutorPanelPreferences,
  toCoursePageHead,
  writeAiTutorPanelCookie,
} from "./-lib/utils"

import katexCss from "katex/dist/katex.min.css?url"

export const Route = createFileRoute("/course/$courseSlug")({
  component: CourseLayout,
  beforeLoad: () => ({ aiTutorPanel: readAiTutorPanelPreferences() }),
  loader: async ({ params }) => {
    const data = await loadCoursePageData({ data: params })
    if (!data.course) throw notFound()
    return { ...data, course: data.course }
  },
  // Only course content renders math, so KaTeX's stylesheet stays off every other page.
  head: ({ loaderData, match, matches }) => {
    const katexLink = { rel: "stylesheet", href: katexCss }
    if (!loaderData) return { links: [katexLink] }
    const head = toCoursePageHead(match.context.siteConfig, loaderData, matches)
    return { ...head, links: [...head.links, katexLink] }
  },
  pendingComponent: CourseLayoutPending,
})

function CourseLayout() {
  const { course, sections } = Route.useLoaderData()
  const { account } = Route.useRouteContext()
  const { aiTutor } = useSiteConfig()
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const { aiTutorPanel } = Route.useRouteContext()
  const [rightSidebarOpen, setRightSidebarOpen] = useState(aiTutorPanel.open)
  const [panelWidth, setPanelWidth] = useState(aiTutorPanel.width)
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    writeAiTutorPanelCookie(AI_TUTOR_PANEL_OPEN_COOKIE, String(rightSidebarOpen))
  }, [rightSidebarOpen])
  useEffect(() => {
    if (!isResizing) writeAiTutorPanelCookie(AI_TUTOR_PANEL_WIDTH_COOKIE, panelWidth)
  }, [isResizing, panelWidth])
  const [mobileLeftSidebarOpen, setMobileLeftSidebarOpen] = useState(false)
  const [mobileRightSidebarOpen, setMobileRightSidebarOpen] = useState(false)

  return (
    <AiTutorProvider key={`${account?.id ?? "visitor"}:${course.slug}`} courseSlug={course.slug}>
      {/* The tutor's panel runs the window's full height, so its title bar sits beside the navbar. */}
      <SidebarProvider
        open={aiTutor.enabled && rightSidebarOpen}
        onOpenChange={setRightSidebarOpen}
        className="h-screen min-h-0 overflow-hidden data-[resizing=true]:cursor-col-resize data-[resizing=true]:select-none data-[resizing=true]:**:transition-none"
        data-resizing={isResizing}
        style={{ "--sidebar-width": `${panelWidth}px` } as CSSProperties}
      >
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <CourseNavbar
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
          <CourseMobileSidebars
            courseSlug={course.slug}
            courseTitle={course.title}
            sections={sections}
            showAiTutor={aiTutor.enabled}
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
              <SidebarContent>
                <CourseSidebar
                  courseSlug={course.slug}
                  courseTitle={course.title}
                  sections={sections}
                />
              </SidebarContent>
            </Sidebar>
            <SidebarInset className="overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4">
                <Outlet />
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
        {aiTutor.enabled && (
          <Sidebar side="right" className="[&>[data-slot=sidebar-inner]]:bg-background">
            <AiTutorResizeHandle
              width={panelWidth}
              onResize={setPanelWidth}
              onResizingChange={setIsResizing}
            />
            <SidebarContent>
              <AiTutorPanel
                courseTitle={course.title}
                sections={sections}
                isOpen={rightSidebarOpen}
                onClose={() => setRightSidebarOpen(false)}
              />
            </SidebarContent>
          </Sidebar>
        )}
      </SidebarProvider>
    </AiTutorProvider>
  )
}

function CourseLayoutPending() {
  const { aiTutor } = useSiteConfig()
  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative flex shrink-0 items-center justify-between border-b px-2 py-1">
          <div className="flex items-center gap-1">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>
          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 sm:flex">
            <Skeleton className="size-5 rounded-sm" />
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="hidden w-72 shrink-0 flex-col border-r md:flex">
            {Array.from({ length: 6 }, (_, i) => (
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
              <Skeleton className="aspect-video w-full rounded" />
              <Skeleton className="h-9 w-2/3" />
              <Skeleton className="h-10 w-32" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="flex flex-col divide-y rounded-xl border">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="flex gap-4 p-4">
                    <Skeleton className="size-12 shrink-0 rounded-lg" />
                    <div className="flex flex-1 flex-col gap-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-5 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* The tutor's panel is open by default, so its column holds its place while loading. */}
      {aiTutor.enabled && (
        <div
          className="hidden shrink-0 flex-col border-l md:flex"
          style={{ width: AI_TUTOR_PANEL_DEFAULT_WIDTH }}
        >
          <div className="flex items-center gap-2 border-b px-3.5 py-1">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="mt-auto p-3">
            <Skeleton className="h-22 w-full rounded-xl" />
          </div>
        </div>
      )}
    </div>
  )
}
