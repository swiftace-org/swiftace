import {
  type ChatMiddleware,
  type JSONSchema,
  type ModelMessage,
  type TokenUsage,
  chat,
  toolDefinition,
} from "@tanstack/ai"
import { createOpenaiChat } from "@tanstack/ai-openai"

import { readPublicCourses, readQuestionsByIds, readQuizBySlug } from "@/lib/db.server"
import { convertNotebook, isNotebookValid, joinSource, toOrderedQuestionIds } from "@/lib/utils"
import { type CourseForViewer, readHasActiveSubscription } from "@/lib/utils.server"
import type { Account } from "@/types/account"
import type { AiTutorReasoningEffort, AiTutorSettings } from "@/types/ai-tutor"
import type { NotebookCell, NotebookJson } from "@/types/notebook"
import type { RawQuizOption } from "@/types/quiz"

import { isQuizReadable, toQuizUrlSlug } from "../$courseSlug/lesson/-lib/utils"
import { readCertificatesByAccountId } from "../../profile/-lib/db.server"
import {
  type AiTutorTokenUsage,
  NO_TOKEN_USAGE,
  addTokenUsage,
  estimateTokens,
  toAiTutorConversationTitle,
  toAiTutorPlan,
  toAiTutorUsage,
} from "./ai-tutor"
import {
  AI_TUTOR_CELL_OUTPUT_MAX_CHARS,
  AI_TUTOR_MAX_OUTPUT_TOKENS,
  AI_TUTOR_SEARCH_RESULTS_LIMIT,
  AI_TUTOR_SECTION_CONTENT_MAX_CHARS,
} from "./constants"
import {
  readOpenAiTutorUsageWindows,
  readCourseSectionForAiTutor,
  readCourseSectionsBySlugs,
  readLearnerCompletedSectionSlugs,
  readLearnerCourseSubmissions,
  readLearnerEnrolledCourses,
  searchCourseSectionsForAiTutor,
} from "./db.server"
import { canOpenSection, isSectionDisplayed, isSectionLocked, isSectionOpen } from "./utils"

type Viewer = CourseForViewer & { account: NonNullable<CourseForViewer["account"]> }

type Section = Awaited<ReturnType<typeof readCourseSectionsBySlugs>>[number]

type Submission = Awaited<ReturnType<typeof readLearnerCourseSubmissions>>[number]

/**
 * The OpenAI adapter for any model id. TanStack AI only knows the models it ships metadata for,
 * so reasoning goes straight into the Responses API request rather than through its `reasoning`
 * option, which it silently drops for a model it doesn't recognise.
 */
export function createAiTutorChatOptions(
  model: string,
  apiKey: string,
  reasoningEffort: AiTutorReasoningEffort,
  maxOutputTokens = AI_TUTOR_MAX_OUTPUT_TOKENS,
) {
  return {
    adapter: createOpenaiChat(model as "gpt-6.1-sol", apiKey),
    modelOptions: {
      reasoning:
        reasoningEffort === "none"
          ? { effort: reasoningEffort }
          : { effort: reasoningEffort, summary: "auto" as const },
      // Lets a tool loop hand the model its own reasoning back without OpenAI storing it.
      include: ["reasoning.encrypted_content" as const],
      store: false,
      max_output_tokens: maxOutputTokens,
    },
  }
}

export function toSectionPath(
  courseSlug: string,
  section: { slug: string; sectionType: string | null },
) {
  const kind = section.sectionType === "ASSIGNMENT" ? "assignment" : "lesson"
  return `/course/${courseSlug}/${kind}/${section.slug}`
}

function toSectionLabel(section: { title: string; titlePrefix?: string | null }) {
  return section.titlePrefix ? `${section.titlePrefix}: ${section.title}` : section.title
}

/**
 * The learner's plan, its settings and model, and where they stand against its limits. Admins
 * count as Pro and are never limited, so they can try the tutor as paying learners get it.
 */
export async function readAiTutorAccess(account: Account, settings: AiTutorSettings, now: Date) {
  const [hasActiveSubscription, windows] = await Promise.all([
    readHasActiveSubscription(account.id),
    readOpenAiTutorUsageWindows(account.id, now),
  ])
  const plan = toAiTutorPlan(hasActiveSubscription, account.isAdmin)
  const planSettings = settings.plans[plan]
  const model = settings.models.find((candidate) => candidate.id === planSettings.model) ?? null
  const usage = toAiTutorUsage({
    plan,
    settings: planSettings,
    unlimited: account.isAdmin,
    windows,
    now,
  })
  return { plan, planSettings, model, windows, usage }
}

/** Sections the learner sees in the sidebar, as the course page lists them. */
export async function readDisplayedSections(viewer: CourseForViewer): Promise<Section[]> {
  const slugs = Array.isArray(viewer.course.sections) ? (viewer.course.sections as string[]) : []
  const sections = await readCourseSectionsBySlugs(viewer.course.id, slugs)
  return sections.filter((section) => viewer.isAdmin || isSectionDisplayed(section))
}

/** Why the tutor can't read a section, phrased for the model to pass on. */
function toLockedReason(
  section: Section | { visibility: string | null; alwaysOpen: boolean },
  viewer: CourseForViewer,
) {
  if (!viewer.isAdmin && !isSectionOpen(section)) {
    return "This section hasn't been opened to learners yet."
  }
  if (isSectionLocked(section, viewer)) {
    return "This section is part of the paid course. The learner needs to enroll (with a Pro subscription) to open it, so you can't read it either."
  }
  return null
}

/** The latest submission per assignment, which is the one its status in the outline reflects. */
function latestSubmissionBySection(submissions: Submission[]) {
  const latest = new Map<number, Submission>()
  for (const submission of submissions) {
    if (!latest.has(submission.sectionId)) latest.set(submission.sectionId, submission)
  }
  return latest
}

const STATUS_DESCRIPTIONS: Record<string, string> = {
  PASS: "passed",
  FAIL: "needs changes and resubmission",
  PENDING: "submitted, awaiting evaluation",
  DRAFT: "saved as a draft, not submitted",
  PROCESSING: "submitted, being processed",
}

/**
 * The prompt, in the order that keeps OpenAI's prompt cache warm: what's fixed for the course
 * first, the learner's progress next, and the page they're on last, since it changes most.
 */
export function buildAiTutorSystemPrompts({
  instructions,
  viewer,
  sections,
  completedSlugs,
  submissions,
  plan,
  now,
  currentSection,
  currentSectionText,
}: {
  instructions: string
  viewer: Viewer
  sections: Section[]
  completedSlugs: Set<string>
  submissions: Submission[]
  plan: string
  now: Date
  currentSection: Section | null
  currentSectionText: string | null
}): string[] {
  const { course, account } = viewer
  const latest = latestSubmissionBySection(submissions)
  const required = sections.filter((section) => !section.isOptional)
  const completedCount = required.filter((section) => completedSlugs.has(section.slug)).length

  const outline = sections.map((section) => {
    const path = toSectionPath(course.slug, section)
    const kind = section.sectionType === "ASSIGNMENT" ? "assignment" : "lesson"
    const notes: string[] = [kind]
    if (section.isOptional) notes.push("optional")
    if (completedSlugs.has(section.slug)) notes.push("completed")
    const submission = latest.get(section.id)
    if (submission) notes.push(STATUS_DESCRIPTIONS[submission.status] ?? submission.status)
    const locked = toLockedReason(section, viewer)
    if (locked) notes.push("locked for this learner")
    return `- ${toSectionLabel(section)} (${notes.join(", ")}) — slug \`${section.slug}\`, ${path}`
  })

  const courseContext = [
    `# Course: ${course.title}`,
    `Course page: /course/${course.slug}`,
    course.shortDescription ?? "",
    course.description ? `\n${course.description}` : "",
    `\n## Outline\n${outline.join("\n") || "(no sections yet)"}`,
    "\nUse the tools to read a section's full content, search the course, see quiz questions, or look up the learner's submissions and other courses. Section content you haven't read with a tool (or that isn't included below) is unknown to you.",
  ]
    .filter(Boolean)
    .join("\n")

  const learnerContext = [
    "# Learner",
    `Name: ${account.name}`,
    `Plan: ${plan === "pro" ? "Pro" : "Free"}${viewer.isAdmin ? " (site admin)" : ""}`,
    viewer.isEnrolled
      ? `Enrolled in this course; completed ${completedCount} of ${required.length} required sections.`
      : `Not enrolled in this course.${course.isPaid ? " It's a paid course, so most sections are locked for them." : ""}`,
    `Today is ${now.toISOString().slice(0, 10)} (UTC).`,
  ].join("\n")

  const pageContext = currentSection
    ? [
        `# Current page`,
        `The learner is viewing ${toSectionLabel(currentSection)} (${toSectionPath(course.slug, currentSection)}). Questions like "this lesson" refer to it.${currentSectionText ? " Its content is below, so don't read it again with a tool." : ""}`,
        currentSectionText ? `\n${currentSectionText}` : "",
      ].join("\n")
    : `# Current page\nThe learner is on the course's overview page (/course/${course.slug}).`

  return [instructions, courseContext, learnerContext, pageContext]
}

/** Each notebook's text for ten minutes, as every message on a lesson would otherwise refetch it. */
const notebookTextCache = new Map<string, { text: Promise<string | null>; expiresAt: number }>()
const NOTEBOOK_TEXT_CACHE_TTL_MS = 10 * 60 * 1000
const NOTEBOOK_TEXT_CACHE_MAX_ENTRIES = 50

function readNotebookText(url: string): Promise<string | null> {
  const cached = notebookTextCache.get(url)
  if (cached && cached.expiresAt > Date.now()) return cached.text

  if (notebookTextCache.size >= NOTEBOOK_TEXT_CACHE_MAX_ENTRIES) notebookTextCache.clear()
  const text = fetch(url)
    .then((response) => (response.ok ? (response.json() as Promise<NotebookJson>) : null))
    .then((json) => (json && isNotebookValid(json) ? notebookToText(convertNotebook(json)) : null))
    .catch((error: unknown) => {
      console.error("AI tutor: failed to read a notebook", url, error)
      notebookTextCache.delete(url)
      return null
    })
  notebookTextCache.set(url, { text, expiresAt: Date.now() + NOTEBOOK_TEXT_CACHE_TTL_MS })
  return text
}

/** Markdown cells as they are, code cells fenced, and each output trimmed to its readable text. */
export function notebookToText(notebook: NotebookJson): string {
  const languageInfo = notebook.metadata?.language_info as { name?: string } | undefined
  const language = languageInfo?.name ?? "python"
  return (notebook.cells ?? [])
    .map((cell: NotebookCell) => {
      const source = joinSource(cell.source).trim()
      if (cell.cell_type === "markdown") return source
      if (cell.cell_type !== "code") return ""
      const outputs = (cell.outputs ?? []).map(outputToText).filter(Boolean)
      const code = source ? `\`\`\`${language}\n${source}\n\`\`\`` : ""
      return [code, ...outputs.map((output) => `Output:\n\`\`\`\n${output}\n\`\`\``)]
        .filter(Boolean)
        .join("\n")
    })
    .filter(Boolean)
    .join("\n\n")
}

function outputToText(output: NonNullable<NotebookCell["outputs"]>[number]): string {
  const data = output.data ?? {}
  const text =
    output.text !== undefined
      ? joinSource(output.text as string | string[])
      : data["text/plain"] !== undefined
        ? joinSource(data["text/plain"] as string | string[])
        : data["image/png"] || data["image/jpeg"] || data["image/svg+xml"]
          ? "[image]"
          : output.ename
            ? `${output.ename}: ${output.evalue ?? ""}`
            : ""
  return truncate(text.trim(), AI_TUTOR_CELL_OUTPUT_MAX_CHARS)
}

function truncate(text: string, maxChars: number) {
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n[…truncated]` : text
}

/** A section as the model reads it, or the reason it can't, from the same gates as the pages. */
export async function readSectionTextForAiTutor(
  viewer: CourseForViewer,
  slug: string,
): Promise<{ section: Section | null; text: string }> {
  const section = await readCourseSectionForAiTutor(viewer.course.id, slug)
  if (!section || (!viewer.isAdmin && !isSectionDisplayed(section))) {
    return { section: null, text: `There's no section with the slug "${slug}" in this course.` }
  }
  const [listed] = await readCourseSectionsBySlugs(viewer.course.id, [slug])
  const locked = toLockedReason(section, viewer)
  if (locked || !canOpenSection(section, viewer)) {
    return {
      section: listed ?? null,
      text: `${toSectionLabel(section)}: ${locked ?? "Not available."}`,
    }
  }

  const notebookText = section.resources?.startsWith("http")
    ? await readNotebookText(section.resources)
    : null
  const requirements = Array.isArray(section.submissionRequirements)
    ? (section.submissionRequirements as { title?: string; required?: boolean }[])
        .map((field) => `- ${field.title ?? "Field"}${field.required ? " (required)" : ""}`)
        .join("\n")
    : ""

  const text = [
    `## ${toSectionLabel(section)}`,
    `Type: ${section.sectionType === "ASSIGNMENT" ? "assignment" : "lesson"}; page: ${toSectionPath(viewer.course.slug, section)}`,
    section.dueDate ? `Due: ${section.dueDate.toISOString().slice(0, 10)}` : "",
    section.shortDescription ? `Summary: ${section.shortDescription}` : "",
    section.description ? `\n### Description\n${section.description}` : "",
    requirements ? `\n### Submission form\n${requirements}` : "",
    section.quizUrl
      ? "\nThis lesson has a quiz; read its questions with `get_quiz_questions`."
      : "",
    section.resources && !notebookText && !section.resources.startsWith("http")
      ? `\n### Resources\n${section.resources}`
      : "",
    section.transcript ? `\n### Video transcript\n${section.transcript}` : "",
    notebookText ? `\n### Notebook\n${notebookText}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  return { section: listed ?? null, text: truncate(text, AI_TUTOR_SECTION_CONTENT_MAX_CHARS) }
}

function readSlug(args: unknown): string {
  const slug = (args as { slug?: unknown } | null)?.slug
  return typeof slug === "string" ? slug.trim() : ""
}

function slugSchema(description: string): JSONSchema {
  return {
    type: "object",
    properties: { slug: { type: "string", description } },
    required: ["slug"],
    additionalProperties: false,
  }
}

const NO_INPUT_SCHEMA: JSONSchema = { type: "object", properties: {}, additionalProperties: false }

/**
 * The tutor's tools, closed over one request's learner and course. Each re-checks the same gates
 * as the page it mirrors, since the model picks the slugs and a learner can ask it for anything.
 */
export function createAiTutorTools(viewer: Viewer, sections: Section[]) {
  const listedSlugs = sections.map((section) => section.slug)

  const readCourseSection = toolDefinition({
    name: "read_course_section",
    description:
      "Read the full content of one lesson or assignment in this course: its description, video transcript, Jupyter notebook (markdown, code and outputs) and, for assignments, the submission form. Use the slug from the outline.",
    inputSchema: slugSchema("The section's slug, e.g. `numpy-basics`."),
  }).server(async (args) => (await readSectionTextForAiTutor(viewer, readSlug(args))).text)

  const searchCourse = toolDefinition({
    name: "search_course",
    description:
      "Search this course's section titles, descriptions and video transcripts for a word or phrase. Returns the matching sections with a snippet. Notebooks aren't searched; read a section to see its notebook.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "A word or short phrase." } },
      required: ["query"],
      additionalProperties: false,
    } satisfies JSONSchema,
  }).server(async (args) => {
    const raw = (args as { query?: unknown }).query
    const query = typeof raw === "string" ? raw.trim() : ""
    if (query.length < 2) return "Search for at least two characters."
    const rows = await searchCourseSectionsForAiTutor(
      viewer.course.id,
      listedSlugs,
      query,
      AI_TUTOR_SEARCH_RESULTS_LIMIT,
    )
    if (!rows.length) return `Nothing in this course mentions "${query}".`
    return rows
      .map((row) => {
        const locked = toLockedReason(row, viewer)
        const source = [row.title, row.shortDescription, row.description, row.transcript]
          .filter(Boolean)
          .join(" \n")
        return `- ${row.title} (slug \`${row.slug}\`, ${toSectionPath(viewer.course.slug, row)})${locked ? " [locked]" : `: …${toSnippet(source, query)}…`}`
      })
      .join("\n")
  })

  const getQuizQuestions = toolDefinition({
    name: "get_quiz_questions",
    description:
      "See the questions and answer choices of a lesson's quiz, without the answers. Use it to help the learner understand the concepts behind a question. Never reveal or confirm which choice is correct.",
    inputSchema: slugSchema("The lesson's slug."),
  }).server(async (args) => {
    const { section } = await readSectionTextForAiTutor(viewer, readSlug(args))
    if (!section || !canOpenSection(section, viewer)) return "That lesson isn't available."
    const urlSlug = section.quizUrl ? toQuizUrlSlug(section.quizUrl) : ""
    const quiz = urlSlug ? await readQuizBySlug(urlSlug) : null
    if (!quiz || !isQuizReadable(quiz.visibility, viewer.isAdmin)) return "That lesson has no quiz."
    // The query returns rows in any order, so they're put back in the quiz's own.
    const orderedIds = toOrderedQuestionIds(quiz.jsonData)
    const byId = new Map((await readQuestionsByIds(orderedIds)).map((row) => [row.id, row]))
    const questions = orderedIds.flatMap((id) => byId.get(id) ?? [])
    return questions
      .map((question, index) => {
        const options = Array.isArray(question.options)
          ? (question.options as RawQuizOption[]).map((option) => `  - ${option.value}`).join("\n")
          : ""
        return `${index + 1}. ${question.title ?? ""}${options ? `\n${options}` : ""}`
      })
      .join("\n")
  })

  const getMySubmissions = toolDefinition({
    name: "get_my_submissions",
    description:
      "List the learner's own assignment submissions in this course, newest first, with each one's status and the evaluator's feedback.",
    inputSchema: NO_INPUT_SCHEMA,
  }).server(async () => {
    // Only assignments the learner can still open, as on the assignment pages themselves.
    const openIds = new Set(
      sections.filter((section) => canOpenSection(section, viewer)).map((section) => section.id),
    )
    const submissions = (
      await readLearnerCourseSubmissions(viewer.course.id, viewer.account.id)
    ).filter((submission) => openIds.has(submission.sectionId))
    if (!submissions.length) return "The learner hasn't submitted anything in this course."
    return submissions
      .map((submission) =>
        [
          `- ${submission.sectionTitle} (slug \`${submission.sectionSlug}\`), ${submission.submittedAt.toISOString().slice(0, 10)}: ${STATUS_DESCRIPTIONS[submission.status] ?? submission.status}`,
          `  Answers: ${JSON.stringify(submission.answers ?? {})}`,
          submission.comments ? `  Evaluator feedback: ${submission.comments}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      )
      .join("\n")
  })

  const getMyCourses = toolDefinition({
    name: "get_my_courses",
    description:
      "List every course the learner is enrolled in, with how many sections they've completed, and the certificates they've earned.",
    inputSchema: NO_INPUT_SCHEMA,
  }).server(async () => {
    const enrolled = await readLearnerEnrolledCourses(viewer.account.id)
    const [completed, certificates] = await Promise.all([
      readLearnerCompletedSectionSlugs(
        viewer.account.id,
        enrolled.map((course) => course.id),
      ),
      readCertificatesByAccountId(viewer.account.id),
    ])
    const certified = new Set(certificates.map((certificate) => certificate.course.id))
    if (!enrolled.length) return "The learner isn't enrolled in any course."
    return enrolled
      .map((course) => {
        const slugs = new Set(Array.isArray(course.sections) ? (course.sections as string[]) : [])
        const done = completed.filter((row) => row.courseId === course.id && slugs.has(row.slug))
        return `- ${course.title} (/course/${course.slug}): enrolled ${course.enrolledAt.toISOString().slice(0, 10)}, ${done.length} of ${slugs.size} sections completed${certified.has(course.id) ? ", certificate earned" : ""}`
      })
      .join("\n")
  })

  const listCourses = toolDefinition({
    name: "list_courses",
    description: "List every course in the catalog, to recommend what the learner could take next.",
    inputSchema: NO_INPUT_SCHEMA,
  }).server(async () => {
    const catalog = await readPublicCourses()
    return catalog
      .map(
        (course) =>
          `- ${course.title} (/course/${course.slug})${course.isPaid ? " [Pro]" : " [free]"}: ${course.shortDescription ?? ""}`,
      )
      .join("\n")
  })

  return [
    readCourseSection,
    searchCourse,
    getQuizQuestions,
    getMySubmissions,
    getMyCourses,
    listCourses,
  ]
}

function toSnippet(text: string, query: string) {
  const index = text.toLowerCase().indexOf(query.toLowerCase())
  const start = Math.max(0, index - 80)
  return text
    .slice(start, start + 200)
    .replace(/\s+/g, " ")
    .trim()
}

export function toTokenUsage(usage: TokenUsage): AiTutorTokenUsage {
  return {
    inputTokens: usage.promptTokens ?? 0,
    cachedInputTokens: usage.promptTokensDetails?.cachedTokens ?? 0,
    outputTokens: usage.completionTokens ?? 0,
    reasoningTokens: usage.completionTokensDetails?.reasoningTokens ?? 0,
  }
}

/**
 * Totals what a run's model calls report. A call cut off by Stop reports nothing — OpenAI sends
 * usage at the end — so that one is estimated from what was sent and streamed, or a learner could
 * stop every reply just before it ends and never be charged.
 */
export function createUsageMeter() {
  let reported = NO_TOKEN_USAGE
  let pending: { inputTokens: number; streamedChars: number } | null = null

  const middleware: ChatMiddleware = {
    name: "ai-tutor-usage",
    onConfig: (ctx, config) => {
      if (ctx.phase !== "beforeModel") return
      const sent = JSON.stringify([
        config.systemPrompts,
        config.messages,
        config.tools.map((tool) => tool.name),
      ])
      pending = { inputTokens: estimateTokens(sent), streamedChars: 0 }
    },
    onChunk: (_ctx, chunk) => {
      if (!pending) return
      if (chunk.type === "TEXT_MESSAGE_CONTENT" || chunk.type === "REASONING_MESSAGE_CONTENT") {
        pending.streamedChars += chunk.delta.length
      } else if (chunk.type === "TOOL_CALL_ARGS") {
        pending.streamedChars += chunk.delta.length
      }
    },
    onUsage: (_ctx, usage) => {
      reported = addTokenUsage(reported, toTokenUsage(usage))
      pending = null
    },
  }

  return {
    middleware,
    /** What the run cost so far, and whether part of it is an estimate. */
    total(): { usage: AiTutorTokenUsage; estimated: boolean } {
      if (!pending) return { usage: reported, estimated: false }
      const estimate = {
        ...NO_TOKEN_USAGE,
        inputTokens: pending.inputTokens,
        outputTokens: Math.ceil(pending.streamedChars / 4),
      }
      return { usage: addTokenUsage(reported, estimate), estimated: true }
    },
  }
}

/**
 * A few words naming the conversation, from its first message. Cheap enough to run on every new
 * conversation, and its cost goes on the learner's tab with the reply's.
 */
export async function generateAiTutorTitle({
  model,
  apiKey,
  message,
  signal,
}: {
  model: string
  apiKey: string
  message: string
  signal: AbortSignal
}): Promise<{ title: string | null; usage: AiTutorTokenUsage }> {
  const meter = createUsageMeter()
  const abortController = new AbortController()
  signal.addEventListener("abort", () => abortController.abort(), { once: true })
  const messages: ModelMessage[] = [{ role: "user", content: message.slice(0, 2000) }]
  try {
    const { text } = await chat({
      ...createAiTutorChatOptions(model, apiKey, "none", 40),
      messages,
      systemPrompts: [
        "Write a title of at most six words for a tutoring conversation that starts with the learner's message below. Reply with the title alone: no quotes, no trailing period.",
      ],
      threadId: "ai-tutor-title",
      stream: false,
      abortController,
      middleware: [meter.middleware],
    })
    return { title: toAiTutorConversationTitle(text), usage: meter.total().usage }
  } catch (error) {
    if (!signal.aborted) console.error("AI tutor: failed to title a conversation", error)
    return { title: null, usage: meter.total().usage }
  }
}
