import type { MessagePart, UIMessage } from "@tanstack/ai"

import type {
  AiTutorMessageStatus,
  AiTutorModel,
  AiTutorPlan,
  AiTutorPlanSettings,
  AiTutorUsage,
  AiTutorUsageWindow,
  AiTutorUsageWindowKind,
} from "@/types/ai-tutor"

import {
  AI_TUTOR_TITLE_MAX_LENGTH,
  AI_TUTOR_WINDOW_DURATIONS_MS,
  CHARS_PER_TOKEN_ESTIMATE,
} from "./constants"

export const AI_TUTOR_WINDOW_KINDS: AiTutorUsageWindowKind[] = ["session", "weekly"]

/** Tokens as OpenAI bills them: `outputTokens` already includes `reasoningTokens`. */
export type AiTutorTokenUsage = {
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  reasoningTokens: number
}

export const NO_TOKEN_USAGE: AiTutorTokenUsage = {
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
}

export function addTokenUsage(a: AiTutorTokenUsage, b: AiTutorTokenUsage): AiTutorTokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    cachedInputTokens: a.cachedInputTokens + b.cachedInputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    reasoningTokens: a.reasoningTokens + b.reasoningTokens,
  }
}

/**
 * Prices are USD per million tokens, so a token costs exactly that many micro-dollars. Rounded up,
 * so a stream of tiny calls can't each round down to free.
 */
export function toCostMicros(usage: AiTutorTokenUsage, model: AiTutorModel): number {
  const cached = Math.min(usage.cachedInputTokens, usage.inputTokens)
  return Math.ceil(
    (usage.inputTokens - cached) * model.inputPerMillion +
      cached * model.cachedInputPerMillion +
      usage.outputTokens * model.outputPerMillion,
  )
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE)
}

export function usdToMicros(usd: number): number {
  return Math.round(usd * 1_000_000)
}

export function formatMicrosAsUsd(micros: number): string {
  const usd = micros / 1_000_000
  // Sub-cent amounts are the norm per message, so they keep enough digits to tell apart.
  return usd > 0 && usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`
}

/** Admins count as Pro, so they try the tutor the way paying learners get it. */
export function toAiTutorPlan(hasActiveSubscription: boolean, isAdmin: boolean): AiTutorPlan {
  return hasActiveSubscription || isAdmin ? "pro" : "free"
}

export type AiTutorOpenWindow = {
  id: number
  kind: string
  startedAt: Date
  endsAt: Date
  spentMicros: number
}

/** The window of each kind still running at `now`; there's at most one, as each opens after the last ends. */
export function findOpenWindow(
  windows: AiTutorOpenWindow[],
  kind: AiTutorUsageWindowKind,
  now: Date,
): AiTutorOpenWindow | undefined {
  return windows.find((window) => window.kind === kind && window.endsAt > now)
}

/** The windows a message sent at `now` opens: one of each kind not already running. */
export function toWindowsToOpen(
  windows: AiTutorOpenWindow[],
  now: Date,
): { kind: AiTutorUsageWindowKind; startedAt: Date; endsAt: Date }[] {
  return AI_TUTOR_WINDOW_KINDS.filter((kind) => !findOpenWindow(windows, kind, now)).map(
    (kind) => ({
      kind,
      startedAt: now,
      endsAt: new Date(now.getTime() + AI_TUTOR_WINDOW_DURATIONS_MS[kind]),
    }),
  )
}

function toLimitMicros(settings: AiTutorPlanSettings, kind: AiTutorUsageWindowKind): number {
  return usdToMicros(kind === "session" ? settings.sessionLimitUsd : settings.weeklyLimitUsd)
}

/**
 * What the learner's panel shows. Limits are read from the plan as it is now, so raising one on
 * `/manage/ai-tutor` lifts a block at once rather than when the window ends.
 */
export function toAiTutorUsage({
  plan,
  settings,
  unlimited,
  windows,
  now,
}: {
  plan: AiTutorPlan
  settings: AiTutorPlanSettings
  unlimited: boolean
  windows: AiTutorOpenWindow[]
  now: Date
}): AiTutorUsage {
  const usageWindows: AiTutorUsageWindow[] = AI_TUTOR_WINDOW_KINDS.map((kind) => {
    const window = findOpenWindow(windows, kind, now)
    const limit = toLimitMicros(settings, kind)
    const spent = window?.spentMicros ?? 0
    return {
      kind,
      percentUsed: limit > 0 ? Math.floor((spent / limit) * 100) : 100,
      resetsAt: window?.endsAt ?? null,
    }
  })

  // When both are spent, the later reset is the one the learner actually has to wait for.
  const blockedBy = unlimited
    ? null
    : (usageWindows
        .filter((window) => window.percentUsed >= 100)
        .sort((a, b) => (b.resetsAt?.getTime() ?? 0) - (a.resetsAt?.getTime() ?? 0))[0] ?? null)

  return { plan, planEnabled: settings.enabled, unlimited, windows: usageWindows, blockedBy }
}

/** Fills in `{{NAME}}` placeholders, leaving unknown ones as typed so a typo is visible. */
export function renderAiTutorPrompt(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*([A-Z_]+)\s*\}\}/g, (match, key: string) => values[key] ?? match)
}

/** The model is asked for a bare title, but sometimes quotes it, labels it or ends it with a period. */
export function toAiTutorConversationTitle(raw: string): string | null {
  const title = raw
    .split("\n")[0]
    .replace(/^\s*(title\s*:\s*)/i, "")
    .replace(/^["'“‘`*#\s]+|["'”’`*.\s]+$/g, "")
    .trim()
  if (!title) return null
  return title.length > AI_TUTOR_TITLE_MAX_LENGTH
    ? `${title.slice(0, AI_TUTOR_TITLE_MAX_LENGTH - 1).trimEnd()}…`
    : title
}

/**
 * OpenAI's models write LaTeX as `\(...\)` and `\[...\]` whatever the prompt asks, and the
 * markdown renderer only knows dollars. Code spans and fences are left alone.
 */
export function normalizeMathDelimiters(markdown: string): string {
  return markdown
    .split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`)/g)
    .map((chunk, index) =>
      index % 2 === 1
        ? chunk
        : chunk
            .replace(/\\\[([\s\S]+?)\\\]/g, (_, math: string) => `$$${math}$$`)
            .replace(/\\\(([\s\S]+?)\\\)/g, (_, math: string) => `$${math.trim()}$`),
    )
    .join("")
}

/**
 * A run's assistant messages (one per model call) as the parts of the single reply that's
 * stored. Provider metadata and encrypted reasoning are dropped: nothing reads them back.
 */
export function toStoredReplyParts(messages: UIMessage[]): MessagePart[] {
  return messages
    .filter((message) => message.role === "assistant")
    .flatMap((message) => message.parts)
    .flatMap((part): MessagePart[] => {
      if (part.type === "text") return part.content ? [{ type: "text", content: part.content }] : []
      if (part.type === "thinking")
        return part.content ? [{ type: "thinking", content: part.content }] : []
      if (part.type === "tool-call") {
        const { metadata: _metadata, ...rest } = part
        return [rest]
      }
      if (part.type === "tool-result") {
        const { metadata: _metadata, ...rest } = part
        return [rest]
      }
      return []
    })
}

export type StoredAiTutorMessage = {
  id: number
  createdAt: Date
  role: string
  parts: unknown
  status: string | null
}

/**
 * Messages as the panel shows them. A failed reply is left out when it said nothing, or when the
 * learner retried it, so the thread reads as it did live: the error, then the reply that worked.
 */
export function toDisplayMessages(rows: StoredAiTutorMessage[]): UIMessage[] {
  return rows.flatMap((row, index): UIMessage[] => {
    const parts = toParts(row)
    if (isFailedReply(row) && (!parts.length || rows[index + 1]?.role === "assistant")) return []
    return [toUIMessage(row, parts)]
  })
}

/**
 * Messages as the model gets them back. A failed reply stays out, so a retry answers the learner's
 * message afresh; so do reasoning summaries, and a tool call a Stop cut off before its result
 * came back, which the API would reject as unanswered.
 */
export function toReplayMessages(rows: StoredAiTutorMessage[]): UIMessage[] {
  return rows.flatMap((row) => {
    if (isFailedReply(row)) return []
    const all = toParts(row)
    const answered = new Set(
      all.flatMap((part) => (part.type === "tool-result" ? [part.toolCallId] : [])),
    )
    const parts = all.filter(
      (part) =>
        part.type !== "thinking" &&
        (part.type !== "tool-call" || answered.has(part.id)) &&
        (part.type !== "tool-result" || part.state === "complete" || part.state === "error"),
    )
    return parts.length ? [toUIMessage(row, parts)] : []
  })
}

function isFailedReply(row: StoredAiTutorMessage) {
  return row.role === "assistant" && row.status === "error"
}

function toParts(row: StoredAiTutorMessage): MessagePart[] {
  return Array.isArray(row.parts) ? (row.parts as MessagePart[]) : []
}

function toUIMessage(row: StoredAiTutorMessage, parts: MessagePart[]): UIMessage {
  return {
    id: `message-${row.id}`,
    role: row.role === "assistant" ? "assistant" : "user",
    parts,
    createdAt: row.createdAt,
    metadata: { status: (row.status ?? "complete") as AiTutorMessageStatus },
  }
}

/** "3:40 PM" today, or "Tue 3:40 PM" further out, in the learner's own time zone. */
export function formatResetTime(resetsAt: Date, now = new Date()): string {
  const time = resetsAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  if (resetsAt.toDateString() === now.toDateString()) return time
  const day = resetsAt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
  return `${day}, ${time}`
}

export const AI_TUTOR_WINDOW_LABELS: Record<AiTutorUsageWindowKind, string> = {
  session: "5-hour",
  weekly: "weekly",
}
