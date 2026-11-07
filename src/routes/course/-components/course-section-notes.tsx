import { Markdown } from "@/components/markdown"
import { CourseResourceNotebook } from "@/components/notebook/course-resource-notebook"
import type { CourseSectionWithDescription } from "@/types/course"
import type { NotebookResourceData } from "@/types/notebook"

type CourseSectionNotesProps = {
  section: Pick<
    CourseSectionWithDescription,
    "title" | "descriptionHtml" | "resourcesUrl" | "resourcesHtml"
  >
  notebookResource: NotebookResourceData | null
}

export function CourseSectionNotes({ section, notebookResource }: CourseSectionNotesProps) {
  const description = section.descriptionHtml && <Markdown markup={section.descriptionHtml} />

  if (section.resourcesUrl) {
    return (
      <div className="mb-4">
        {description}
        <CourseResourceNotebook resource={notebookResource} />
      </div>
    )
  }

  // Projects keep their whole brief in `description` with no resources at all.
  if (section.resourcesHtml || section.descriptionHtml) {
    return (
      <div className="mb-4">
        <h1 className="text-3xl font-semibold">{section.title}</h1>
        {description}
        {section.resourcesHtml && <Markdown markup={section.resourcesHtml} />}
      </div>
    )
  }

  return null
}
