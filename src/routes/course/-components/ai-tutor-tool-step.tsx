import type { ToolCallPart } from "@tanstack/ai"
import {
  BookOpenIcon,
  ClipboardCheckIcon,
  GraduationCapIcon,
  LibraryIcon,
  ListChecksIcon,
  SearchIcon,
  WrenchIcon,
} from "lucide-react"
import type { ReactNode } from "react"

import {
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace"

type SectionTitles = Map<string, string>

/** What each tool is doing and has done, in the learner's terms. */
function describe(
  part: ToolCallPart,
  titles: SectionTitles,
): { icon: ReactNode; running: string; done: string } {
  const input = (part.input ?? {}) as { slug?: string; query?: string }
  const section = (input.slug && titles.get(input.slug)) || "a section"
  switch (part.name) {
    case "read_course_section":
      return { icon: <BookOpenIcon />, running: `Reading ${section}`, done: `Read ${section}` }
    case "search_course":
      return {
        icon: <SearchIcon />,
        running: `Searching the course for “${input.query ?? ""}”`,
        done: `Searched the course for “${input.query ?? ""}”`,
      }
    case "get_quiz_questions":
      return {
        icon: <ListChecksIcon />,
        running: `Reading the quiz in ${section}`,
        done: `Read the quiz in ${section}`,
      }
    case "get_my_submissions":
      return {
        icon: <ClipboardCheckIcon />,
        running: "Checking your submissions",
        done: "Checked your submissions",
      }
    case "get_my_courses":
      return {
        icon: <GraduationCapIcon />,
        running: "Looking at your courses",
        done: "Looked at your courses",
      }
    case "list_courses":
      return { icon: <LibraryIcon />, running: "Browsing the catalog", done: "Browsed the catalog" }
    default:
      return { icon: <WrenchIcon />, running: "Working", done: "Done" }
  }
}

export function AiTutorToolStep({
  part,
  titles,
  isRunning,
}: {
  part: ToolCallPart
  titles: SectionTitles
  /** False once the reply is over, so a call cut off by Stop doesn't shimmer forever. */
  isRunning: boolean
}) {
  const { icon, running, done } = describe(part, titles)
  const finished = part.state === "complete" || part.output !== undefined
  const failed = part.state === "error"
  const line = (
    <TraceLine status={failed ? "error" : !finished && isRunning ? "running" : undefined}>
      <TraceIcon>{icon}</TraceIcon>
      <TraceTitle>{finished || !isRunning ? done : `${running}…`}</TraceTitle>
    </TraceLine>
  )
  const output = toOutputText(part.output)
  if (!output) return line

  // What the tool handed back, so a learner can see what the answer was based on.
  return (
    <TraceCollapsible>
      <TraceCollapsibleTrigger>{line}</TraceCollapsibleTrigger>
      <TraceCollapsibleContent>
        <div className="max-h-64 overflow-y-auto font-mono text-xs leading-relaxed whitespace-pre-wrap">
          {output}
        </div>
      </TraceCollapsibleContent>
    </TraceCollapsible>
  )
}

function toOutputText(output: unknown): string {
  if (output === undefined || output === null) return ""
  return typeof output === "string" ? output.trim() : JSON.stringify(output, null, 2)
}
