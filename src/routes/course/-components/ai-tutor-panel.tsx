import type { UIMessage } from "@tanstack/ai"
import { useParams } from "@tanstack/react-router"
import { ArrowLeftIcon, HistoryIcon, RotateCcwIcon, SquarePenIcon, XIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { IconButton } from "@/components/icon-button"
import { Button } from "@/components/ui/button"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { Skeleton } from "@/components/ui/skeleton"
import { useSiteConfig } from "@/lib/hooks"

import { AiTutorAvatar } from "./ai-tutor-avatar"
import { AiTutorEmptyState } from "./ai-tutor-empty-state"
import { AiTutorHistory } from "./ai-tutor-history"
import { AiTutorPromptInput } from "./ai-tutor-prompt-input"
import { useAiTutor } from "./ai-tutor-provider"
import { AiTutorReply } from "./ai-tutor-reply"
import { AiTutorSignInDialog } from "./ai-tutor-sign-in-dialog"
import { AiTutorUsageNotice } from "./ai-tutor-usage-notice"
import { AiTutorUserMessage } from "./ai-tutor-user-message"
import type { CourseSectionForSidebar } from "./course-sidebar"

type Turn =
  | { kind: "user"; message: UIMessage }
  | { kind: "reply"; id: string; messages: UIMessage[] }

/** The tutor's chat, shown in the course's right sidebar on desktop and in a sheet on phones. */
export function AiTutorPanel({
  courseTitle,
  sections,
  isOpen,
  onClose,
}: {
  courseTitle: string
  sections: CourseSectionForSidebar[]
  /** The desktop sidebar stays mounted while collapsed, so nothing loads until it's opened. */
  isOpen: boolean
  onClose: () => void
}) {
  const { aiTutor } = useSiteConfig()
  const tutor = useAiTutor()
  const { sectionSlug } = useParams({ strict: false })
  const [view, setView] = useState<"chat" | "history">("chat")
  const { loadPanel } = tutor

  useEffect(() => {
    if (isOpen) loadPanel()
  }, [isOpen, loadPanel])

  const sectionTitles = useMemo(
    () =>
      new Map(
        sections.map((section) => [
          section.slug,
          section.titlePrefix ? `${section.titlePrefix}: ${section.title}` : section.title,
        ]),
      ),
    [sections],
  )
  const currentSection = sections.find((section) => section.slug === sectionSlug)
  const isBusy = tutor.status === "submitted" || tutor.status === "streaming"
  const turns = toTurns(tutor.messages, isBusy)
  const usage = tutor.usage
  const isBlocked = !!usage && (!!usage.blockedBy || (!usage.planEnabled && !usage.unlimited))

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Matches the course navbar's height and icon sizes, as the two sit side by side. */}
      <header className="flex shrink-0 items-center gap-1 border-b px-2 py-1 [&_[data-slot=button]_svg]:size-5">
        {view === "history" ? (
          <>
            <IconButton tooltip="Back to chat" onClick={() => setView("chat")}>
              <ArrowLeftIcon />
            </IconButton>
            <h2 className="flex-1 truncate font-medium">Conversations</h2>
          </>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2 pl-1">
            <AiTutorAvatar className="size-8" />
            <h2 className="truncate font-medium">{aiTutor.name}</h2>
          </div>
        )}
        {tutor.isSignedIn && view === "chat" && (
          <IconButton tooltip="Conversations" onClick={() => setView("history")}>
            <HistoryIcon />
          </IconButton>
        )}
        {tutor.isSignedIn && (
          <IconButton
            tooltip="New conversation"
            disabled={!tutor.messages.length && view === "chat"}
            onClick={() => {
              tutor.startNewConversation()
              setView("chat")
            }}
          >
            <SquarePenIcon />
          </IconButton>
        )}
        <IconButton tooltip="Close" onClick={onClose}>
          <XIcon />
        </IconButton>
      </header>

      {view === "history" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AiTutorHistory
            conversations={tutor.conversations}
            activeId={tutor.conversationId}
            disabled={tutor.isOpening}
            onOpen={(id) => {
              setView("chat")
              void tutor.openConversation(id)
            }}
            onDelete={(id) => void tutor.deleteConversation(id)}
          />
        </div>
      ) : (
        <>
          <MessageScrollerProvider autoScroll>
            <MessageScroller className="min-h-0 flex-1">
              <MessageScrollerViewport>
                <MessageScrollerContent className="gap-6 px-3 py-4">
                  {tutor.isOpening ? (
                    <ConversationSkeleton />
                  ) : turns.length ? (
                    turns.map((turn, index) =>
                      turn.kind === "user" ? (
                        <MessageScrollerItem key={turn.message.id} scrollAnchor>
                          <AiTutorUserMessage message={turn.message} />
                        </MessageScrollerItem>
                      ) : (
                        <MessageScrollerItem key={turn.id}>
                          <AiTutorReply
                            messages={turn.messages}
                            isStreaming={isBusy && index === turns.length - 1}
                            sectionTitles={sectionTitles}
                          />
                        </MessageScrollerItem>
                      ),
                    )
                  ) : (
                    <AiTutorEmptyState
                      courseTitle={courseTitle}
                      sectionType={currentSection?.sectionType ?? null}
                      onSuggestion={isBlocked ? undefined : tutor.send}
                    />
                  )}
                  {tutor.error && !isBusy && (
                    <MessageScrollerItem>
                      <ReplyError
                        message={tutor.error.message}
                        onRetry={isBlocked ? undefined : tutor.retry}
                      />
                    </MessageScrollerItem>
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>

          <div className="flex shrink-0 flex-col gap-1.5 px-3 pb-1.5">
            {usage && <AiTutorUsageNotice usage={usage} courseSlug={tutor.courseSlug} />}
            {!isBlocked && (
              <AiTutorPromptInput
                isBusy={isBusy}
                disabled={tutor.isOpening}
                onSend={tutor.send}
                onStop={tutor.stop}
              />
            )}
            <p className="px-1 text-center text-[11px] text-muted-foreground">
              {aiTutor.name} can make mistakes. Check important info.
            </p>
          </div>
        </>
      )}

      <AiTutorSignInDialog open={tutor.signInRequested} onOpenChange={tutor.setSignInRequested} />
    </div>
  )
}

function ReplyError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <p className="text-destructive">{message}</p>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <RotateCcwIcon />
          Try again
        </Button>
      )}
    </div>
  )
}

function ConversationSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="ml-auto h-9 w-3/5 rounded-xl" />
      <div className="flex gap-2.5">
        <Skeleton className="size-6 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  )
}

/**
 * The learner's messages, each followed by everything the tutor said back. While a reply is on
 * its way but hasn't started, an empty one stands in so "Thinking…" shows at once.
 */
function toTurns(messages: ReadonlyArray<UIMessage>, isBusy: boolean): Turn[] {
  const turns: Turn[] = []
  for (const message of messages) {
    const last = turns.at(-1)
    if (message.role === "user") turns.push({ kind: "user", message })
    else if (message.role === "assistant") {
      if (last?.kind === "reply") last.messages.push(message)
      else turns.push({ kind: "reply", id: message.id, messages: [message] })
    }
  }
  if (isBusy && turns.at(-1)?.kind === "user")
    turns.push({ kind: "reply", id: "pending", messages: [] })
  return turns
}
