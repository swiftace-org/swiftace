import { and, asc, count, desc, eq, gte, ilike, or, type SQL, sql } from "drizzle-orm"

import { escapeLikePattern } from "@/lib/db.server"
import {
  accounts,
  aiTutorConversations,
  aiTutorMessages,
  courseSections,
  courses,
  db,
} from "@/lib/schema.server"
import type {
  AiTutorSpendSummary,
  AiTutorTranscriptMessage,
  ManagedAiTutorConversation,
} from "@/types/ai-tutor"

type ConversationFilter = { search: string; courseId: number }

/** Spend and activity over the last day and week, from the replies' own costs. */
export async function readAiTutorSpendSummary(now: Date): Promise<AiTutorSpendSummary> {
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const [row] = await db
    .select({
      costMicros24h: sql<number>`coalesce(sum(${aiTutorMessages.costMicros}) filter (where ${aiTutorMessages.createdAt} >= ${dayAgo}), 0)`,
      costMicros7d: sql<number>`coalesce(sum(${aiTutorMessages.costMicros}), 0)`,
      replies7d: sql<number>`count(*) filter (where ${aiTutorMessages.role} = 'assistant')`,
      conversations7d: sql<number>`count(distinct ${aiTutorMessages.conversationId})`,
      learners7d: sql<number>`count(distinct ${aiTutorConversations.accountId})`,
    })
    .from(aiTutorMessages)
    .innerJoin(aiTutorConversations, eq(aiTutorConversations.id, aiTutorMessages.conversationId))
    .where(gte(aiTutorMessages.createdAt, weekAgo))
  return {
    costMicros24h: Number(row?.costMicros24h ?? 0),
    costMicros7d: Number(row?.costMicros7d ?? 0),
    replies7d: Number(row?.replies7d ?? 0),
    conversations7d: Number(row?.conversations7d ?? 0),
    learners7d: Number(row?.learners7d ?? 0),
  }
}

/** The courses that have conversations, for the course filter. */
export async function readAiTutorConversationCourses(): Promise<{ id: number; title: string }[]> {
  return db
    .selectDistinct({ id: courses.id, title: courses.title })
    .from(aiTutorConversations)
    .innerJoin(courses, eq(courses.id, aiTutorConversations.courseId))
    .orderBy(asc(courses.title))
}

function conversationFilter({ search, courseId }: ConversationFilter): SQL | undefined {
  const pattern = search ? `%${escapeLikePattern(search)}%` : null
  return and(
    courseId ? eq(aiTutorConversations.courseId, courseId) : undefined,
    pattern
      ? or(
          ilike(accounts.name, pattern),
          ilike(accounts.email, pattern),
          ilike(aiTutorConversations.title, pattern),
        )
      : undefined,
  )
}

const messageCount = db
  .select({ conversationId: aiTutorMessages.conversationId, total: count().as("total") })
  .from(aiTutorMessages)
  .groupBy(aiTutorMessages.conversationId)
  .as("message_count")

/** One page of conversations, most recently active first. */
export async function readManagedAiTutorConversations(
  filter: ConversationFilter,
  { limit, offset }: { limit: number; offset: number },
): Promise<ManagedAiTutorConversation[]> {
  const rows = await db
    .select({
      id: aiTutorConversations.id,
      title: aiTutorConversations.title,
      createdAt: aiTutorConversations.createdAt,
      lastMessageAt: aiTutorConversations.lastMessageAt,
      costMicros: aiTutorConversations.costMicros,
      deleted: aiTutorConversations.deleted,
      messageCount: sql<number>`coalesce(${messageCount.total}, 0)`,
      learner: { id: accounts.id, name: accounts.name, email: accounts.email },
      course: { id: courses.id, slug: courses.slug, title: courses.title },
    })
    .from(aiTutorConversations)
    .innerJoin(accounts, eq(accounts.id, aiTutorConversations.accountId))
    .innerJoin(courses, eq(courses.id, aiTutorConversations.courseId))
    .leftJoin(messageCount, eq(messageCount.conversationId, aiTutorConversations.id))
    .where(conversationFilter(filter))
    .orderBy(desc(aiTutorConversations.lastMessageAt), desc(aiTutorConversations.id))
    .limit(limit)
    .offset(offset)
  return rows.map((row) => ({ ...row, messageCount: Number(row.messageCount) }))
}

export async function readManagedAiTutorConversationsCount(
  filter: ConversationFilter,
): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(aiTutorConversations)
    .innerJoin(accounts, eq(accounts.id, aiTutorConversations.accountId))
    .where(conversationFilter(filter))
  return Number(row?.total ?? 0)
}

export async function readManagedAiTutorConversation(
  conversationId: number,
): Promise<ManagedAiTutorConversation | null> {
  const [row] = await db
    .select({
      id: aiTutorConversations.id,
      title: aiTutorConversations.title,
      createdAt: aiTutorConversations.createdAt,
      lastMessageAt: aiTutorConversations.lastMessageAt,
      costMicros: aiTutorConversations.costMicros,
      deleted: aiTutorConversations.deleted,
      messageCount: sql<number>`(select count(*) from ${aiTutorMessages} where ${aiTutorMessages.conversationId} = ${aiTutorConversations.id})`,
      learner: { id: accounts.id, name: accounts.name, email: accounts.email },
      course: { id: courses.id, slug: courses.slug, title: courses.title },
    })
    .from(aiTutorConversations)
    .innerJoin(accounts, eq(accounts.id, aiTutorConversations.accountId))
    .innerJoin(courses, eq(courses.id, aiTutorConversations.courseId))
    .where(eq(aiTutorConversations.id, conversationId))
    .limit(1)
  return row ? { ...row, messageCount: Number(row.messageCount) } : null
}

/** Every message in a conversation, oldest first, with each reply's usage. */
export async function readAiTutorTranscriptMessages(
  conversationId: number,
): Promise<AiTutorTranscriptMessage[]> {
  const rows = await db
    .select({
      id: aiTutorMessages.id,
      createdAt: aiTutorMessages.createdAt,
      role: aiTutorMessages.role,
      parts: aiTutorMessages.parts,
      status: aiTutorMessages.status,
      model: aiTutorMessages.model,
      plan: aiTutorMessages.plan,
      reasoningEffort: aiTutorMessages.reasoningEffort,
      inputTokens: aiTutorMessages.inputTokens,
      cachedInputTokens: aiTutorMessages.cachedInputTokens,
      outputTokens: aiTutorMessages.outputTokens,
      reasoningTokens: aiTutorMessages.reasoningTokens,
      costMicros: aiTutorMessages.costMicros,
      usageEstimated: aiTutorMessages.usageEstimated,
      error: aiTutorMessages.error,
      durationMs: aiTutorMessages.durationMs,
      sectionSlug: courseSections.slug,
      sectionTitle: courseSections.title,
      sectionType: courseSections.sectionType,
    })
    .from(aiTutorMessages)
    .leftJoin(courseSections, eq(courseSections.id, aiTutorMessages.sectionId))
    .where(eq(aiTutorMessages.conversationId, conversationId))
    .orderBy(asc(aiTutorMessages.id))
  return rows.map(({ sectionSlug, sectionTitle, sectionType, role, ...row }) => ({
    ...row,
    role: role === "assistant" ? "assistant" : "user",
    section:
      sectionSlug && sectionTitle ? { slug: sectionSlug, title: sectionTitle, sectionType } : null,
  }))
}
