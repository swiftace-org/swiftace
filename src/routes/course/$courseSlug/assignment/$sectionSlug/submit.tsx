import { createFileRoute, getRouteApi } from "@tanstack/react-router"

import { ROBOTS_NOINDEX_META } from "@/lib/config"

import { SubmissionForm } from "../-components/submission-form"
import { SubmissionHistory } from "../-components/submission-history"

const courseRoute = getRouteApi("/course/$courseSlug")
const assignmentRoute = getRouteApi("/course/$courseSlug/assignment/$sectionSlug")

/**
 * No loader of its own: the form and the history both come from the assignment layout's
 * loader, so submitting invalidates one route rather than two and the tab strip and the tab
 * can't disagree about whether this assignment takes submissions.
 */
export const Route = createFileRoute("/course/$courseSlug/assignment/$sectionSlug/submit")({
  head: () => ({ meta: [ROBOTS_NOINDEX_META] }),
  component: AssignmentSubmitTab,
})

function AssignmentSubmitTab() {
  const { courseSlug } = courseRoute.useParams()
  const { account } = courseRoute.useRouteContext()
  const { sectionSlug } = Route.useParams()
  const { assignment, requirements, submissions, isEnrolled } = assignmentRoute.useLoaderData()

  if (!assignment || !requirements.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
        <div className="text-lg">This assignment isn't accepting submissions</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* The notebook carries its own title on the Notes tab; this tab would have none. */}
      <h1 className="text-2xl font-semibold">{assignment.title}</h1>
      <SubmissionForm
        courseSlug={courseSlug}
        sectionSlug={sectionSlug}
        requirements={requirements}
        allowDraft={assignment.allowDraft}
        evaluationGuideHtml={assignment.evaluationGuideHtml}
        isEnrolled={isEnrolled}
        isSignedIn={!!account}
      />
      {submissions.length > 0 && <SubmissionHistory submissions={submissions} />}
    </div>
  )
}
