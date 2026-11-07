import {
  Award,
  BookOpen,
  CircleCheck,
  CirclePlay,
  ClipboardCheck,
  CreditCard,
  KeyRound,
  ListChecks,
  LogIn,
  NotebookPen,
  Send,
  Sparkles,
  UserPlus,
  type LucideIcon,
} from "lucide-react"
import type { ReactNode } from "react"

import { BlueLink } from "@/components/blue-link"
import { ENROLLMENT_GRANTED_BY_SUBSCRIPTION } from "@/lib/config"
import type { SiteActivity, UserActivity, UserActivityKind } from "@/types/user"

import { SECTION_COMPLETE_PROGRESS } from "../../../course/-lib/constants"
import { formatMinorAmount } from "../users/$userId/-lib/utils"
import { UtcDateTime } from "../users/-components/utc-date-time"

type ActivityEvent = UserActivity & { account?: SiteActivity["account"] }

const ACTIVITY_ICONS: Record<UserActivityKind, LucideIcon> = {
  SIGNED_UP: UserPlus,
  SIGNED_IN: LogIn,
  LINKED_PROVIDER: KeyRound,
  ENROLLED: BookOpen,
  SECTION_PROGRESS: CirclePlay,
  SUBMITTED: Send,
  EVALUATED: ClipboardCheck,
  QUIZ: ListChecks,
  NOTEBOOK: NotebookPen,
  PAYMENT: CreditCard,
  SUBSCRIBED: Sparkles,
  CERTIFIED: Award,
}

/**
 * A feed of activity, one sentence per event. Site-wide events carry their `account`, which
 * leads each sentence; a single user's feed passes that user's `username` instead.
 */
export function ActivityTimeline({
  activity,
  username,
}: {
  activity: ActivityEvent[]
  username?: string
}) {
  const entries = collapseRepeatedSignIns(activity)

  if (!entries.length) {
    return <p className="text-sm text-muted-foreground">No activity recorded.</p>
  }

  return (
    <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-border">
      {entries.map(({ event, repeats }, index) => {
        const Icon = activityIcon(event)
        return (
          <li key={index} className="relative flex gap-3">
            <span className="z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-4 ring-card">
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 space-y-0.5 pt-0.5">
              <p className="text-sm leading-snug">
                {describeActivity(event, event.account?.username ?? username ?? "")}
                {repeats > 1 ? <Muted> · {repeats} times</Muted> : null}
              </p>
              <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                <UtcDateTime withZone value={event.at} />
                {event.courseTitle && event.kind !== "ENROLLED" ? (
                  <>
                    <span aria-hidden>·</span>
                    <span className="truncate">{event.courseTitle}</span>
                  </>
                ) : null}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** Sign-ins come in bursts (a code per device or tab), which would bury everything else. */
function collapseRepeatedSignIns(activity: ActivityEvent[]) {
  const entries: { event: ActivityEvent; repeats: number }[] = []
  for (const event of activity) {
    const previous = entries.at(-1)
    if (
      previous &&
      event.kind === "SIGNED_IN" &&
      previous.event.kind === "SIGNED_IN" &&
      previous.event.account?.id === event.account?.id
    ) {
      previous.repeats += 1
    } else {
      entries.push({ event, repeats: 1 })
    }
  }
  return entries
}

function activityIcon(event: UserActivity): LucideIcon {
  if (event.kind === "SECTION_PROGRESS" && isComplete(event)) return CircleCheck
  return ACTIVITY_ICONS[event.kind]
}

function isComplete(event: UserActivity) {
  return (event.count ?? 0) >= SECTION_COMPLETE_PROGRESS
}

/** One sentence per event, linking whatever it was about. */
function describeActivity(event: ActivityEvent, username: string): ReactNode {
  const actor = event.account === undefined ? null : <Actor account={event.account} />
  // With an actor the sentence reads "Jane enrolled in…" rather than "Enrolled in…".
  const lead = (verb: string) =>
    actor ? (
      <>
        {actor} {verb.charAt(0).toLowerCase() + verb.slice(1)}
      </>
    ) : (
      verb
    )

  const course = event.courseSlug ? (
    <BlueLink to="/course/$courseSlug" params={{ courseSlug: event.courseSlug }} colored>
      {event.courseTitle}
    </BlueLink>
  ) : (
    <span>{event.courseTitle ?? "a course"}</span>
  )
  const section = sectionLink(event)

  switch (event.kind) {
    case "SIGNED_UP":
      return lead("Signed up")
    case "SIGNED_IN":
      return lead("Signed in with an email code")
    case "LINKED_PROVIDER":
      return (
        <>
          {lead("Linked")} {event.subject} account <Muted>{event.detail}</Muted>
        </>
      )
    case "ENROLLED":
      return (
        <>
          {lead("Enrolled in")} {course}
          {event.detail === ENROLLMENT_GRANTED_BY_SUBSCRIPTION ? <Muted> via Pro</Muted> : null}
        </>
      )
    case "SECTION_PROGRESS": {
      const type = event.detail === "ASSIGNMENT" ? "assignment" : "lesson"
      if (isComplete(event)) {
        return (
          <>
            {lead(`Completed ${type}`)} {section}
          </>
        )
      }
      return (
        <>
          {lead(`Opened ${type}`)} {section}
          {event.count ? <Muted> ({event.count}%)</Muted> : null}
        </>
      )
    }
    case "SUBMITTED":
      return (
        <>
          {lead(event.detail === "DRAFT" ? "Saved a draft of" : "Submitted")} {section}
        </>
      )
    case "EVALUATED":
      return (
        <>
          {actor ? <>{actor}&apos;s </> : null}
          {section} was marked{" "}
          <span className="font-medium">{event.detail === "PASS" ? "Pass" : "Fail"}</span>
          {event.extra ? <Muted> by {event.extra}</Muted> : null}
        </>
      )
    case "QUIZ":
      return (
        <>
          {lead("Answered")} {event.count} {event.count === 1 ? "question" : "questions"} in{" "}
          {event.subjectSlug ? (
            <BlueLink
              to="/manage/quizzes/$quizSlug"
              params={{ quizSlug: event.subjectSlug }}
              colored
            >
              {event.subject ?? event.subjectSlug}
            </BlueLink>
          ) : (
            event.subject
          )}
          <Muted> ({event.extra} correct)</Muted>
        </>
      )
    case "NOTEBOOK":
      return (
        <>
          {lead("Saved notebook")}{" "}
          <BlueLink external href={`/${username}/${event.subject}`} target="_blank" colored>
            {event.subject}
          </BlueLink>
        </>
      )
    case "PAYMENT":
      return (
        <>
          {lead("Paid")} {formatMinorAmount(event.count, event.extra)} for {course}
          <Muted> ({event.detail ?? "unknown"})</Muted>
        </>
      )
    case "SUBSCRIBED":
      return (
        <>
          {lead("Subscribed to Pro")} <Muted>({event.detail})</Muted>
        </>
      )
    case "CERTIFIED":
      return (
        <>
          {lead("Earned a")}{" "}
          {event.subjectSlug ? (
            <BlueLink
              to="/certificate/$certificateSlug"
              params={{ certificateSlug: event.subjectSlug }}
              target="_blank"
              colored
            >
              certificate
            </BlueLink>
          ) : (
            "certificate"
          )}{" "}
          for {course}
        </>
      )
  }
}

function Actor({ account }: { account: SiteActivity["account"] }) {
  if (!account) return <span className="font-medium">Someone</span>
  return (
    <BlueLink
      to="/manage/users/$userId"
      params={{ userId: String(account.id) }}
      className="font-medium"
    >
      {account.name || account.username}
    </BlueLink>
  )
}

function sectionLink(event: UserActivity): ReactNode {
  if (!event.courseSlug || !event.subjectSlug) return <span>{event.subject}</span>
  const params = { courseSlug: event.courseSlug, sectionSlug: event.subjectSlug }
  // Submissions and evaluations only ever concern assignments; progress says which it was.
  const isAssignment = event.kind !== "SECTION_PROGRESS" || event.detail === "ASSIGNMENT"

  return isAssignment ? (
    <BlueLink to="/course/$courseSlug/assignment/$sectionSlug" params={params} colored>
      {event.subject}
    </BlueLink>
  ) : (
    <BlueLink to="/course/$courseSlug/lesson/$sectionSlug" params={params} colored>
      {event.subject}
    </BlueLink>
  )
}

function Muted({ children }: { children: ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>
}
