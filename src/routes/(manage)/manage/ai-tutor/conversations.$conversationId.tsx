import type { MessagePart, UIMessage } from "@tanstack/ai"
import { Link, createFileRoute, notFound } from "@tanstack/react-router"
import { ArrowLeftIcon } from "lucide-react"

import { BlueLink } from "@/components/blue-link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { AiTutorTranscriptMessage } from "@/types/ai-tutor"

import { AiTutorReply } from "../../../course/-components/ai-tutor-reply"
import { AiTutorUserMessage } from "../../../course/-components/ai-tutor-user-message"
import { formatMicrosAsUsd } from "../../../course/-lib/ai-tutor"
import { formatDateTimeUtc } from "../users/-lib/utils"
import { AiTutorTranscriptUsage } from "./-components/ai-tutor-transcript-usage"
import { loadAiTutorTranscript } from "./-functions/load-ai-tutor-transcript"

import katexCss from "katex/dist/katex.min.css?url"

export const Route = createFileRoute("/(manage)/manage/ai-tutor/conversations/$conversationId")({
  loader: async ({ params }) => {
    const transcript = await loadAiTutorTranscript({
      data: { conversationId: Number(params.conversationId) },
    })
    if (!transcript) throw notFound()
    return transcript
  },
  // Replies render math as the course pages do, and only those load KaTeX's stylesheet otherwise.
  head: () => ({ links: [{ rel: "stylesheet", href: katexCss }] }),
  pendingComponent: TranscriptPagePending,
  component: TranscriptPage,
})

function TranscriptPage() {
  const { conversation, messages, sectionTitles } = Route.useLoaderData()
  const titles = new Map(Object.entries(sectionTitles))

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
      <TranscriptBackLink />
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{conversation.title ?? "Untitled conversation"}</h1>
          {conversation.deleted && <Badge variant="outline">Deleted by the learner</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          <BlueLink
            to="/manage/users/$userId"
            params={{ userId: String(conversation.learner.id) }}
            colored
          >
            {conversation.learner.name}
          </BlueLink>{" "}
          in{" "}
          <BlueLink
            to="/course/$courseSlug"
            params={{ courseSlug: conversation.course.slug }}
            colored
          >
            {conversation.course.title}
          </BlueLink>{" "}
          · started {formatDateTimeUtc(conversation.createdAt)} · {conversation.messageCount}{" "}
          messages · {formatMicrosAsUsd(conversation.costMicros)}
        </p>
      </div>
      <div className="flex flex-col gap-6 border-t pt-6">
        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex flex-col gap-1">
              <AiTutorUserMessage message={toUIMessage(message)} />
              <p className="text-right text-xs text-muted-foreground">
                {message.section
                  ? `On ${titles.get(message.section.slug) ?? message.section.title} · `
                  : ""}
                {formatDateTimeUtc(message.createdAt)}
              </p>
            </div>
          ) : (
            <div key={message.id} className="flex flex-col gap-2">
              <AiTutorReply
                messages={[toUIMessage(message)]}
                isStreaming={false}
                sectionTitles={titles}
              />
              <AiTutorTranscriptUsage message={message} />
            </div>
          ),
        )}
      </div>
    </main>
  )
}

function TranscriptBackLink() {
  return (
    <Button
      render={
        <Link to="/manage/ai-tutor" search={{ tab: "conversations" }}>
          <ArrowLeftIcon />
          Conversations
        </Link>
      }
      nativeButton={false}
      variant="ghost"
      size="sm"
      className="-ml-2"
    />
  )
}

function toUIMessage(message: AiTutorTranscriptMessage): UIMessage {
  return {
    id: `message-${message.id}`,
    role: message.role,
    parts: Array.isArray(message.parts) ? (message.parts as MessagePart[]) : [],
    createdAt: message.createdAt,
    metadata: { status: message.status ?? "complete" },
  }
}

function TranscriptPagePending() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
      <TranscriptBackLink />
      <div className="space-y-2">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex flex-col gap-6 border-t pt-6">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex flex-col gap-3">
            <Skeleton className="ml-auto h-9 w-2/5 rounded-xl" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        ))}
      </div>
    </main>
  )
}
