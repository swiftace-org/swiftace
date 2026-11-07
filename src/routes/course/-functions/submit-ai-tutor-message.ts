import {
  type ChatMiddleware,
  type StreamChunk,
  StreamProcessor,
  chat,
  maxIterations,
  toServerSentEventsResponse,
} from "@tanstack/ai"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"

import { authMiddleware } from "@/lib/utils"
import { captureServerException, getSiteConfig, readCourseForViewer } from "@/lib/utils.server"
import type {
  AiTutorMessageInput,
  AiTutorMessageStatus,
  AiTutorStreamEvent,
  AiTutorUsage,
} from "@/types/ai-tutor"

import {
  NO_TOKEN_USAGE,
  addTokenUsage,
  renderAiTutorPrompt,
  toAiTutorConversationTitle,
  toCostMicros,
  toReplayMessages,
  toStoredReplyParts,
  toWindowsToOpen,
} from "../-lib/ai-tutor"
import {
  buildAiTutorSystemPrompts,
  createAiTutorChatOptions,
  createAiTutorTools,
  createUsageMeter,
  generateAiTutorTitle,
  readAiTutorAccess,
  readDisplayedSections,
  readSectionTextForAiTutor,
} from "../-lib/ai-tutor.server"
import {
  AI_TUTOR_HISTORY_MAX_MESSAGES,
  AI_TUTOR_MAX_MODEL_CALLS,
  AI_TUTOR_MESSAGE_MAX_LENGTH,
} from "../-lib/constants"
import {
  addAiTutorUsageWindowSpend,
  createAiTutorConversation,
  createAiTutorMessage,
  createAiTutorUsageWindows,
  readAiTutorConversation,
  readAiTutorMessages,
  readCompletedSectionIds,
  readLearnerCourseSubmissions,
  readOpenAiTutorUsageWindows,
  updateAiTutorConversationAfterMessage,
  updateAiTutorConversationTitle,
} from "../-lib/db.server"

/**
 * One message to the AI tutor, answered as a server-sent event stream. The stream carries the
 * conversation's id and the learner's updated usage as `CUSTOM` events, and the reply is saved
 * however it ends — finished, stopped or failed — with what it cost.
 */
export const submitAiTutorMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: AiTutorMessageInput) => data)
  .handler(async ({ data, context }): Promise<Response> => {
    const { account } = context
    const { aiTutor: settings, integrations } = await getSiteConfig()
    if (!settings.enabled || !integrations.openai.enabled) {
      return toErrorResponse(`${settings.name} is turned off. Please reload the page.`)
    }

    const text = typeof data.text === "string" ? data.text.trim() : ""
    if (!data.retry && !text) return toErrorResponse("Type a message first.")
    if (text.length > AI_TUTOR_MESSAGE_MAX_LENGTH) {
      return toErrorResponse(
        `Messages can be up to ${AI_TUTOR_MESSAGE_MAX_LENGTH.toLocaleString()} characters.`,
      )
    }

    const viewer = await readCourseForViewer(data.courseSlug)
    if (!viewer?.account) return toErrorResponse("This course couldn't be found.")

    const now = new Date()
    const access = await readAiTutorAccess(account, settings, now)
    if (!access.usage.planEnabled && !access.usage.unlimited) {
      return toErrorResponse(`${settings.name} isn't included in your plan.`, access.usage)
    }
    if (access.usage.blockedBy) {
      return toErrorResponse("You've reached your usage limit.", access.usage)
    }
    if (!access.model) {
      return toErrorResponse(`${settings.name} isn't set up yet. Please try again later.`)
    }
    if (!acquireReplyLock(account.id)) {
      return toErrorResponse(`${settings.name} is still answering your last message.`)
    }

    try {
      const conversation = data.conversationId
        ? await readAiTutorConversation(data.conversationId, account.id, viewer.course.id)
        : null
      if (data.conversationId && !conversation) {
        releaseReplyLock(account.id)
        return toErrorResponse("This conversation couldn't be found. Start a new one.")
      }
      const conversationId =
        conversation?.id ??
        (await createAiTutorConversation({ accountId: account.id, courseId: viewer.course.id }))

      const sections = await readDisplayedSections(viewer)
      const currentSection = sections.find((section) => section.slug === data.sectionSlug) ?? null

      if (!data.retry) {
        await createAiTutorMessage({
          conversationId,
          role: "user",
          parts: [{ type: "text", content: text }],
          sectionId: currentSection?.id ?? null,
        })
      }
      const history = toReplayMessages(
        await readAiTutorMessages(conversationId, AI_TUTOR_HISTORY_MAX_MESSAGES),
      )
      if (history.at(-1)?.role !== "user") {
        releaseReplyLock(account.id)
        return toErrorResponse("There's no message to answer. Send a new one.")
      }

      // The first message after a window ends is what opens the next one.
      await createAiTutorUsageWindows(account.id, toWindowsToOpen(access.windows, now))
      const [windows, completedIds, submissions, currentSectionText] = await Promise.all([
        readOpenAiTutorUsageWindows(account.id, now),
        viewer.isEnrolled
          ? readCompletedSectionIds(
              sections.map((section) => section.id),
              account.id,
            )
          : Promise.resolve([]),
        readLearnerCourseSubmissions(viewer.course.id, account.id),
        currentSection
          ? readSectionTextForAiTutor(viewer, currentSection.slug).then((result) => result.text)
          : Promise.resolve(null),
      ])
      const completedSlugs = new Set(
        sections
          .filter((section) => completedIds.includes(section.id))
          .map((section) => section.slug),
      )

      const { siteName } = (await getSiteConfig()).general
      const instructions = renderAiTutorPrompt(settings.systemPrompt, {
        TUTOR_NAME: settings.name,
        SITE_NAME: siteName,
        COURSE_TITLE: viewer.course.title,
        LEARNER_NAME: account.name,
      })
      const accountViewer = { ...viewer, account }
      const systemPrompts = buildAiTutorSystemPrompts({
        instructions,
        viewer: accountViewer,
        sections,
        completedSlugs,
        submissions,
        plan: access.plan,
        now,
        currentSection,
        currentSectionText,
      })

      const request = getRequest()
      const abortController = new AbortController()
      request.signal.addEventListener("abort", () => abortController.abort(), { once: true })

      const meter = createUsageMeter()
      const { apiKey } = integrations.openai
      const model = access.model
      const stream = chat({
        ...createAiTutorChatOptions(model.id, apiKey, access.planSettings.reasoningEffort),
        messages: history,
        threadId: `ai-tutor-${conversationId}`,
        systemPrompts,
        tools: createAiTutorTools(accountViewer, sections),
        agentLoopStrategy: maxIterations(AI_TUTOR_MAX_MODEL_CALLS),
        abortController,
        middleware: [meter.middleware, answerOnLastCall],
      })

      const firstText = history.length === 1 ? text : ""
      const title = firstText
        ? generateAiTutorTitle({
            model: model.id,
            apiKey,
            message: firstText,
            signal: abortController.signal,
          })
        : null

      const reply = streamReply({
        stream,
        abortController,
        conversationId,
        title,
        fallbackTitle: firstText,
        onSettled: async ({ parts, status, error }) => {
          const run = meter.total()
          const titleUsage = title ? (await title).usage : NO_TOKEN_USAGE
          const usage = addTokenUsage(run.usage, titleUsage)
          const costMicros = toCostMicros(usage, model)
          await createAiTutorMessage({
            conversationId,
            role: "assistant",
            parts,
            sectionId: currentSection?.id ?? null,
            status,
            model: model.id,
            plan: access.plan,
            reasoningEffort: access.planSettings.reasoningEffort,
            inputTokens: usage.inputTokens,
            cachedInputTokens: usage.cachedInputTokens,
            outputTokens: usage.outputTokens,
            reasoningTokens: usage.reasoningTokens,
            costMicros,
            usageEstimated: run.estimated,
            error,
            durationMs: Date.now() - now.getTime(),
          })
          await Promise.all([
            updateAiTutorConversationAfterMessage(conversationId, costMicros),
            addAiTutorUsageWindowSpend(
              windows.map((window) => window.id),
              costMicros,
            ),
          ])
        },
        readUsage: async () => (await readAiTutorAccess(account, settings, new Date())).usage,
        onFinally: () => releaseReplyLock(account.id),
      })
      return toServerSentEventsResponse(reply, { abortController })
    } catch (error) {
      releaseReplyLock(account.id)
      console.error("submitAiTutorMessage: failed to start a reply", error)
      captureServerException(error, { courseSlug: data.courseSlug })
      return toErrorResponse("Something went wrong. Please try again.")
    }
  })

/**
 * Passes the model's stream through while keeping a copy of the reply, and saves it once the
 * stream ends however it ends. Saving happens in `finally` because a Stop cancels the response,
 * which returns this generator early instead of letting the loop finish.
 */
async function* streamReply({
  stream,
  abortController,
  conversationId,
  title,
  fallbackTitle,
  onSettled,
  readUsage,
  onFinally,
}: {
  stream: AsyncIterable<StreamChunk>
  abortController: AbortController
  conversationId: number
  title: Promise<{ title: string | null }> | null
  fallbackTitle: string
  onSettled: (reply: {
    parts: ReturnType<typeof toStoredReplyParts>
    status: AiTutorMessageStatus
    error: string | null
  }) => Promise<void>
  readUsage: () => Promise<AiTutorUsage>
  onFinally: () => void
}): AsyncGenerator<StreamChunk> {
  const processor = new StreamProcessor()
  let status: AiTutorMessageStatus = "complete"
  let error: string | null = null
  let settled = false

  async function settle() {
    if (settled) return
    settled = true
    if (abortController.signal.aborted && status === "complete") status = "stopped"
    try {
      await onSettled({ parts: toStoredReplyParts(processor.getMessages()), status, error })
      if (title) {
        const generated = (await title).title ?? toAiTutorConversationTitle(fallbackTitle)
        if (generated) await updateAiTutorConversationTitle(conversationId, generated)
      }
    } catch (saveError) {
      console.error("submitAiTutorMessage: failed to save a reply", conversationId, saveError)
      captureServerException(saveError, { conversationId })
    }
  }

  try {
    yield toCustomChunk({ name: "conversation", value: { id: conversationId } })
    for await (const chunk of stream) {
      processor.processChunk(chunk)
      if (chunk.type === "RUN_ERROR") {
        status = "error"
        error = chunk.message
      }
      yield chunk
    }
  } catch (streamError) {
    if (!abortController.signal.aborted) {
      status = "error"
      error = streamError instanceof Error ? streamError.message : String(streamError)
      console.error("submitAiTutorMessage: the reply failed", conversationId, streamError)
    }
  } finally {
    await settle()
    onFinally()
  }

  // Only reached when the stream wasn't cancelled, so there's still someone to tell.
  if (title) {
    const generated = (await title).title ?? toAiTutorConversationTitle(fallbackTitle)
    if (generated)
      yield toCustomChunk({ name: "title", value: { id: conversationId, title: generated } })
  }
  yield toCustomChunk({ name: "usage", value: await readUsage() })
  if (status === "error") {
    yield toRunErrorChunk("Something went wrong with that reply. Please try again.")
  }
}

/** On the last allowed model call, the model must answer rather than reach for another tool. */
const answerOnLastCall: ChatMiddleware = {
  name: "ai-tutor-answer-on-last-call",
  onConfig: (ctx) => {
    if (ctx.phase === "beforeModel" && ctx.iteration === AI_TUTOR_MAX_MODEL_CALLS - 1) {
      return { toolChoice: "none" }
    }
  },
}

function toCustomChunk(event: AiTutorStreamEvent): StreamChunk {
  return {
    type: "CUSTOM",
    name: event.name,
    value: event.value,
    timestamp: Date.now(),
  } as StreamChunk
}

function toRunErrorChunk(message: string): StreamChunk {
  return { type: "RUN_ERROR", message, timestamp: Date.now() } as StreamChunk
}

/**
 * An expected refusal, as a stream the panel reads like any other: the learner's usage first, so
 * it can show the limit, then the error. Thrown errors would be reported to PostHog as crashes.
 */
function toErrorResponse(message: string, usage?: AiTutorUsage): Response {
  async function* chunks(): AsyncGenerator<StreamChunk> {
    if (usage) yield toCustomChunk({ name: "usage", value: usage })
    yield toRunErrorChunk(message)
  }
  return toServerSentEventsResponse(chunks())
}

/**
 * One reply at a time per learner, across tabs, so parallel messages can't run past a limit
 * together. In memory, as the app runs as one process; a lock left by a reply that never
 * settled lapses after a few minutes rather than locking the learner out.
 */
const replyLocks = new Map<number, number>()
const REPLY_LOCK_TTL_MS = 5 * 60 * 1000

function acquireReplyLock(accountId: number): boolean {
  const lockedAt = replyLocks.get(accountId)
  if (lockedAt && Date.now() - lockedAt < REPLY_LOCK_TTL_MS) return false
  replyLocks.set(accountId, Date.now())
  return true
}

function releaseReplyLock(accountId: number) {
  replyLocks.delete(accountId)
}
