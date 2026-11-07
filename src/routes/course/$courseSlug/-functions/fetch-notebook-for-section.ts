import { createServerFn } from "@tanstack/react-start"

import { convertNotebook, isNotebookValid, joinSource } from "@/lib/utils"
import { readCourseForViewer } from "@/lib/utils.server"
import type { NotebookCell, NotebookJson, NotebookResourceData } from "@/types/notebook"

import { readCourseSectionsBySlugs } from "../../-lib/db.server"
import { canOpenSection, isValidUrl } from "../../-lib/utils"
import { renderMarkdown } from "../../-lib/utils.server"

/**
 * The notebook behind a lesson or assignment. Every gate matters: the course has to be one this
 * caller may see, the section has to be open, and a paid course's section has to be one they've
 * enrolled into or that is marked as a preview. Without them a PRIVATE course's content was
 * served to anyone who guessed the two slugs.
 */
export const fetchNotebookForSection = createServerFn({ method: "GET", strict: { output: false } })
  .validator((data: { courseSlug: string; sectionSlug: string }) => data)
  .handler(async ({ data }): Promise<NotebookResourceData | null> => {
    const viewer = await readCourseForViewer(data.courseSlug)
    if (!viewer) return null

    const [section] = await readCourseSectionsBySlugs(viewer.course.id, [data.sectionSlug])
    if (!section) return null
    if (!canOpenSection(section, viewer)) return null
    if (!section.resources || !isValidUrl(section.resources)) return null

    try {
      const response = await fetch(section.resources)
      const json = (await response.json()) as NotebookJson
      if (!isNotebookValid(json)) return null

      const notebook = convertNotebook(json)
      const { keys, sources } = collectMarkdownSources(notebook.cells ?? [])
      const rendered = await Promise.all(
        sources.map((source) => renderMarkdown(source, { math: true, embeds: true })),
      )
      const markdownHtml = Object.fromEntries(keys.map((key, i) => [key, rendered[i].markup]))

      return { notebook, markdownHtml }
    } catch (error) {
      console.error(error)
      return null
    }
  })

/** Collects every markdown cell/output source needing HTML, keyed for later lookup by `Notebook`. */
function collectMarkdownSources(cells: NotebookCell[]) {
  const keys: string[] = []
  const sources: string[] = []

  cells.forEach((cell, cellIndex) => {
    if (cell.cell_type === "markdown") {
      keys.push(`cell-${cellIndex}`)
      sources.push(joinSource(cell.source))
    }
    cell.outputs?.forEach((output, outputIndex) => {
      const markdown = output.data?.["text/markdown"]
      if (markdown) {
        keys.push(`cell-${cellIndex}-output-${outputIndex}`)
        sources.push(joinSource(markdown as string | string[]))
      }
    })
  })

  return { keys, sources }
}
