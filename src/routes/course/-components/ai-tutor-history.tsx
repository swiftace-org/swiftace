import { MessageSquareIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn, formatRelativeTime } from "@/lib/utils"
import type { AiTutorConversationSummary } from "@/types/ai-tutor"

/** This course's past conversations, newest first, to pick one up again. */
export function AiTutorHistory({
  conversations,
  activeId,
  disabled,
  onOpen,
  onDelete,
}: {
  conversations: AiTutorConversationSummary[]
  activeId: number | null
  disabled: boolean
  onOpen: (conversationId: number) => void
  onDelete: (conversationId: number) => void
}) {
  if (!conversations.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
        <MessageSquareIcon className="size-5" />
        <p>Your conversations about this course will appear here.</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-0.5 p-2">
      {conversations.map((conversation) => (
        <li key={conversation.id} className="group/conversation relative">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onOpen(conversation.id)}
            className={cn(
              "flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 pr-10 text-left transition-colors hover:bg-muted disabled:opacity-50",
              conversation.id === activeId && "bg-muted",
            )}
          >
            <span className="line-clamp-1 text-sm font-medium">
              {conversation.title ?? "New conversation"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(conversation.lastMessageAt)}
            </span>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Delete “${conversation.title ?? "New conversation"}”`}
            disabled={disabled}
            onClick={() => onDelete(conversation.id)}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground opacity-0 group-hover/conversation:opacity-100 focus-visible:opacity-100"
          >
            <Trash2Icon />
          </Button>
        </li>
      ))}
    </ul>
  )
}
