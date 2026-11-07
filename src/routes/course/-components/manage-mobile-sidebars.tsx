import { useLocation } from "@tanstack/react-router"
import { XIcon } from "lucide-react"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { SidebarProvider } from "@/components/ui/sidebar"

import { ManageSidebar } from "./manage-sidebar"

export function ManageMobileSidebars({
  courseSlug,
  leftOpen,
  onLeftOpenChange,
  rightOpen,
  onRightOpenChange,
}: {
  courseSlug: string
  leftOpen: boolean
  onLeftOpenChange: (open: boolean) => void
  rightOpen: boolean
  onRightOpenChange: (open: boolean) => void
}) {
  const { pathname } = useLocation()

  // ManageLayout stays mounted across nested route navigation, so the sheets
  // must be closed explicitly on route change or they keep covering the page.
  useEffect(() => {
    onLeftOpenChange(false)
    onRightOpenChange(false)
  }, [pathname, onLeftOpenChange, onRightOpenChange])

  return (
    <>
      <Sheet open={leftOpen} onOpenChange={onLeftOpenChange}>
        <SheetContent side="left" showCloseButton={false} className="gap-0 p-0">
          <SheetDescription className="sr-only">Displays the manage course nav.</SheetDescription>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <SheetTitle className="text-sm">Manage Course</SheetTitle>
            <SheetClose
              render={
                <Button variant="ghost" size="icon-sm">
                  <XIcon />
                  <span className="sr-only">Close</span>
                </Button>
              }
            />
          </div>
          <SidebarProvider className="contents">
            <ManageSidebar courseSlug={courseSlug} />
          </SidebarProvider>
        </SheetContent>
      </Sheet>

      <Sheet open={rightOpen} onOpenChange={onRightOpenChange}>
        <SheetContent side="right" showCloseButton={false} className="gap-0 p-0">
          <SheetTitle className="sr-only">Additional information</SheetTitle>
          <SheetDescription className="sr-only">Displays additional information.</SheetDescription>
          <div className="flex items-center justify-end border-b px-4 py-3">
            <SheetClose
              render={
                <Button variant="ghost" size="icon-sm">
                  <XIcon />
                  <span className="sr-only">Close</span>
                </Button>
              }
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
