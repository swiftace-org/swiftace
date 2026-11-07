import { FileWarning } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import type { NotebookResourceData } from "@/types/notebook"

import { Notebook } from "./notebook"

export function CourseResourceNotebook({ resource }: { resource: NotebookResourceData | null }) {
  if (!resource) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
        <FileWarning className="size-10 opacity-50" />
        <div className="text-lg">This notebook seems to be corrupted</div>
      </div>
    )
  }

  return <Notebook source={resource.notebook} markdownHtml={resource.markdownHtml} />
}

export function CourseResourceNotebookSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-6 w-1/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}
