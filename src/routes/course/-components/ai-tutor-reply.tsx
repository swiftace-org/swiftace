import type { MessagePart, ThinkingPart, ToolCallPart, UIMessage } from "@tanstack/ai"
import { BrainIcon, CheckIcon, CopyIcon, SquareIcon } from "lucide-react"
import { useState } from "react"

import { IconButton } from "@/components/icon-button"
import { Message, MessageContent } from "@/components/ui/message"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace"
import { useIsClient } from "@/lib/hooks"

import { AiTutorMarkdown } from "./ai-tutor-markdown"
import { AiTutorToolStep } from "./ai-tutor-tool-step"

type Block =
  | { kind: "text"; content: string }
  | { kind: "thinking"; parts: ThinkingPart[] }
  | { kind: "tool"; part: ToolCallPart }

/**
 * One reply, which arrives as several messages — one per model call — and is shown as one: the
 * model's reasoning, the lookups it made and its answer, in the order they happened.
 */
export function AiTutorReply({
  messages,
  isStreaming,
  sectionTitles,
}: {
  messages: UIMessage[]
  isStreaming: boolean
  sectionTitles: Map<string, string>
}) {
  const blocks = toBlocks(messages.flatMap((message) => message.parts))
  const text = blocks
    .flatMap((block) => (block.kind === "text" ? [block.content] : []))
    .join("\n\n")
  const last = blocks.at(-1)
  const isWaiting = isStreaming && (!last || last.kind !== "text")
  const isClient = useIsClient()
  const lastCreatedAt = messages.at(-1)?.createdAt
  const repliedAt = lastCreatedAt ? new Date(lastCreatedAt) : null
  const stopped = messages.some(
    (message) =>
      message.metadata?.status === "stopped" ||
      message.metadata?.tanstack?.stopReason === "aborted",
  )

  return (
    <Message>
      <MessageContent className="gap-3">
        {blocks.map((block, index) =>
          block.kind === "text" ? (
            <AiTutorMarkdown
              // Index keys are stable: blocks only ever grow at the end while streaming.
              // oxlint-disable-next-line react/no-array-index-key
              key={index}
              markdown={block.content}
              isStreaming={isStreaming && index === blocks.length - 1}
            />
          ) : block.kind === "tool" ? (
            <Trace key={block.part.id}>
              <AiTutorToolStep part={block.part} titles={sectionTitles} isRunning={isStreaming} />
            </Trace>
          ) : (
            // oxlint-disable-next-line react/no-array-index-key
            <AiTutorThinking
              key={index}
              parts={block.parts}
              isRunning={isStreaming && block === last}
            />
          ),
        )}
        {isWaiting &&
          last?.kind !== "thinking" &&
          (last?.kind !== "tool" || last.part.output !== undefined) && (
            <Trace>
              <TraceLine status="running">
                <TraceTitle>Thinking…</TraceTitle>
              </TraceLine>
            </Trace>
          )}
        {!isStreaming && (text || stopped) && (
          <div className="-ml-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            {text && <CopyButton text={text} />}
            {/* In the viewer's own time zone, which the server can't know, so only once hydrated. */}
            {repliedAt && isClient && (
              <time
                dateTime={repliedAt.toISOString()}
                title={repliedAt.toLocaleString()}
                className="px-1"
              >
                {formatReplyTime(repliedAt)}
              </time>
            )}
            {stopped && (
              <span className="flex items-center gap-1.5 px-1.5">
                <SquareIcon className="size-3" />
                Stopped
              </span>
            )}
          </div>
        )}
      </MessageContent>
    </Message>
  )
}

function AiTutorThinking({ parts, isRunning }: { parts: ThinkingPart[]; isRunning: boolean }) {
  const content = parts.map((part) => part.content).join("\n\n")
  return (
    <Trace>
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine status={isRunning ? "running" : undefined}>
            <TraceIcon>
              <BrainIcon />
            </TraceIcon>
            <TraceTitle>{isRunning ? "Thinking…" : "Thought it through"}</TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <AiTutorMarkdown markdown={content} isStreaming={isRunning} className="text-xs" />
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <IconButton
      tooltip={copied ? "Copied" : "Copy"}
      size="icon-xs"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        })
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </IconButton>
  )
}

/** "3:42 PM" for a reply from today, with the date as well for an older one. */
function formatReplyTime(date: Date) {
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  if (date.toDateString() === new Date().toDateString()) return time
  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`
}

/** Adjacent text and thinking parts merge, as a model call can split either across several. */
function toBlocks(parts: MessagePart[]): Block[] {
  const blocks: Block[] = []
  for (const part of parts) {
    const previous = blocks.at(-1)
    if (part.type === "text" && part.content) {
      if (previous?.kind === "text") previous.content += part.content
      else blocks.push({ kind: "text", content: part.content })
    } else if (part.type === "thinking" && part.content) {
      if (previous?.kind === "thinking") previous.parts.push(part)
      else blocks.push({ kind: "thinking", parts: [part] })
    } else if (part.type === "tool-call") {
      blocks.push({ kind: "tool", part })
    }
  }
  return blocks
}
