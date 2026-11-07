import { useRouteContext } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"

/** Prompts that fit the page beside the panel, so the first question is a click away. */
function toSuggestions(sectionType: string | null): string[] {
  if (sectionType === "LESSON") {
    return [
      "Summarize this lesson",
      "Explain the key ideas in this lesson simply",
      "Quiz me on this lesson",
    ]
  }
  if (sectionType === "ASSIGNMENT") {
    return [
      "Help me get started on this assignment",
      "What do I need to submit for this assignment?",
      "Which lessons should I review first?",
    ]
  }
  return [
    "What will I learn in this course?",
    "What should I work on next?",
    "How am I doing so far?",
  ]
}

export function AiTutorEmptyState({
  courseTitle,
  sectionType,
  onSuggestion,
}: {
  courseTitle: string
  /** The type of the lesson or assignment open beside the panel, if one is. */
  sectionType: string | null
  /** Left out while the learner can't send, so the suggestions aren't offered. */
  onSuggestion?: (text: string) => void
}) {
  const { account } = useRouteContext({ from: "__root__" })
  const firstName = account?.name.split(" ")[0]

  return (
    <div className="flex min-h-full flex-col justify-end gap-6 px-1 pb-2">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{firstName ? `Hi ${firstName}!` : "Hi there!"}</h2>
        <p className="text-sm text-muted-foreground">
          I&apos;m your tutor for {courseTitle}. Ask me to explain a concept, help you debug your
          code, or plan what to learn next.
        </p>
      </div>
      {onSuggestion && (
        <div className="flex flex-col items-start gap-2">
          {toSuggestions(sectionType).map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="outline"
              size="sm"
              className="h-auto max-w-full justify-start rounded-full py-1.5 text-left font-normal whitespace-normal"
              onClick={() => onSuggestion(suggestion)}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
