import type { UIMessage } from "@tanstack/ai"

/** Monthly and yearly subscribers share `pro`: they pay for the same benefits. */
export type AiTutorPlan = "free" | "pro"

/** OpenAI's `reasoning.effort` values, from cheapest to most thorough. */
export type AiTutorReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh"

export type AiTutorPlanSettings = {
  enabled: boolean
  /** An `id` from `AiTutorSettings.models`, which is what prices the plan's usage. */
  model: string
  reasoningEffort: AiTutorReasoningEffort
  /** USD a learner may spend in one 5-hour window, and in one 7-day window. */
  sessionLimitUsd: number
  weeklyLimitUsd: number
}

/** USD per million tokens, as on OpenAI's pricing page. */
export type AiTutorModel = {
  id: string
  inputPerMillion: number
  cachedInputPerMillion: number
  outputPerMillion: number
}

/** The `aiTutor` section of the site config, edited on `/manage/ai-tutor`. */
export type AiTutorSettings = {
  enabled: boolean
  name: string
  /** Supports `{{TUTOR_NAME}}`, `{{SITE_NAME}}`, `{{COURSE_TITLE}}` and `{{LEARNER_NAME}}`. */
  systemPrompt: string
  plans: Record<AiTutorPlan, AiTutorPlanSettings>
  models: AiTutorModel[]
}

/** What every page gets: whether the tutor is on, and what to call it. */
export type PublicAiTutorSettings = {
  /** Only true once the OpenAI integration is on too, so a page never offers a dead tutor. */
  enabled: boolean
  name: string
  /** Blank without an uploaded avatar, in which case an icon stands in. */
  avatarUrl: string
}

export type AiTutorUsageWindowKind = "session" | "weekly"

/** One quota window as a learner sees it: a share of the limit, never the dollar amounts. */
export type AiTutorUsageWindow = {
  kind: AiTutorUsageWindowKind
  /** 0 to 100, and can pass 100 because the reply that crosses the limit still finishes. */
  percentUsed: number
  /** Null while no window is open, i.e. before the first message after the last one ended. */
  resetsAt: Date | null
}

export type AiTutorUsage = {
  plan: AiTutorPlan
  /** False when the learner's plan has the tutor switched off. */
  planEnabled: boolean
  /** Admins have no limits, so their windows are never shown. */
  unlimited: boolean
  windows: AiTutorUsageWindow[]
  /** The window that's blocking new messages, if one is. */
  blockedBy: AiTutorUsageWindow | null
}

export type AiTutorConversationSummary = {
  id: number
  title: string | null
  lastMessageAt: Date
}

/** How a reply ended. Stored on each assistant message, and shown under a stopped one. */
export type AiTutorMessageStatus = "complete" | "stopped" | "error"

export type AiTutorConversation = AiTutorConversationSummary & {
  messages: UIMessage[]
}

/**
 * Sent by the server inside the reply's stream as AG-UI `CUSTOM` events, since a server function
 * returning a stream has no other way to hand back the ids and usage the panel needs.
 */
export type AiTutorStreamEvent =
  | { name: "conversation"; value: { id: number } }
  | { name: "title"; value: { id: number; title: string } }
  | { name: "usage"; value: AiTutorUsage }

/** What the panel posts for each message. The server rebuilds the history itself. */
export type AiTutorMessageInput = {
  courseSlug: string
  /** The lesson or assignment open beside the panel; null on the course's overview. */
  sectionSlug: string | null
  /** Null starts a new conversation, whose id comes back in the stream. */
  conversationId: number | null
  text: string
  /** Re-runs the last message after a failed reply, instead of adding a new one. */
  retry: boolean
}

/** `/manage/ai-tutor`'s URL. The filters only apply on the Conversations tab. */
export type ManageAiTutorSearch = {
  tab: "settings" | "plans" | "models" | "conversations"
  /** A learner's name or email, or words from a conversation's title. */
  q: string
  /** 0 for every course. */
  course: number
  page: number
}

/** What the tutor has cost lately, across every learner. */
export type AiTutorSpendSummary = {
  costMicros24h: number
  costMicros7d: number
  replies7d: number
  conversations7d: number
  learners7d: number
}

export type ManagedAiTutorConversation = {
  id: number
  title: string | null
  createdAt: Date
  lastMessageAt: Date
  costMicros: number
  messageCount: number
  /** Deleted from the learner's history; the admin still sees it. */
  deleted: boolean
  learner: { id: number; name: string; email: string }
  course: { id: number; slug: string; title: string }
}

export type ManageAiTutorConversationsPage = {
  summary: AiTutorSpendSummary
  conversations: ManagedAiTutorConversation[]
  totalConversations: number
  /** The courses anyone has asked about, for the course filter. */
  courses: { id: number; title: string }[]
}

/** One message of a transcript, with what a reply cost. */
export type AiTutorTranscriptMessage = {
  id: number
  createdAt: Date
  role: "user" | "assistant"
  parts: unknown
  status: string | null
  model: string | null
  plan: string | null
  reasoningEffort: string | null
  inputTokens: number | null
  cachedInputTokens: number | null
  outputTokens: number | null
  reasoningTokens: number | null
  costMicros: number
  usageEstimated: boolean
  error: string | null
  durationMs: number | null
  /** The lesson or assignment the learner was on, if it still exists. */
  section: { slug: string; title: string; sectionType: string | null } | null
}

export type AiTutorTranscript = {
  conversation: ManagedAiTutorConversation
  messages: AiTutorTranscriptMessage[]
  /** Section titles by slug, so tool steps can name what was read. */
  sectionTitles: Record<string, string>
}
