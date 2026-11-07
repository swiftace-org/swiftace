import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import {
  bigserial,
  bigint,
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core"
import { Pool } from "pg"

import { DATABASE_URL } from "@/lib/config.server"

type DrizzleDb = ReturnType<typeof drizzle>

const globalForDb = globalThis as unknown as {
  __appDb: DrizzleDb
  __appDbPool: Pool
}

export function getDb(): DrizzleDb {
  if (!globalForDb.__appDb) {
    globalForDb.__appDbPool = new Pool({
      connectionString: DATABASE_URL,
    })
    // An idle client dropped by Postgres (restart, terminated backend) emits "error" here, which is
    // uncaught without a listener. The pool has already discarded it and reconnects on demand.
    globalForDb.__appDbPool.on("error", (error) => {
      console.warn("Discarded an idle Postgres connection:", error.message)
    })
    globalForDb.__appDb = drizzle(globalForDb.__appDbPool)
  }
  return globalForDb.__appDb
}

export const db = getDb()

/**
 * A transaction handle, interchangeable with `db` for the query builders here. Every `db.server.ts`
 * function wraps one query, so callers needing atomicity pass this as the optional `tx` argument.
 */
export type Transaction = Parameters<Parameters<DrizzleDb["transaction"]>[0]>[0]

export type Queryable = DrizzleDb | Transaction

export function runInTransaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(callback)
}

/**
 * Every default lives in Postgres, so a row is complete whoever inserts it, and every flag is
 * `NOT NULL`. Timestamps are `timestamp` holding UTC: Drizzle writes and reads them as UTC, and
 * the defaults take `now()` in UTC, so the server's `TimeZone` setting never shifts them.
 */
const utcNow = sql`(now() at time zone 'utc')`

const createdAt = () => timestamp("created_at").default(utcNow).notNull()

/** Postgres fills it on INSERT; `$onUpdateFn` moves it on every UPDATE made through Drizzle. */
const updatedAt = () =>
  timestamp("updated_at")
    .default(utcNow)
    .$onUpdateFn(() => new Date())
    .notNull()

export const accounts = pgTable(
  "accounts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    name: varchar("name", { length: 64 }).notNull(),
    username: varchar("username", { length: 64 }).notNull(),
    normalizedUsername: varchar("normalized_username", { length: 64 }),
    email: varchar("email", { length: 128 }).notNull(),
    deleted: boolean("deleted").default(false).notNull(),
    isAdmin: boolean("is_admin").default(false).notNull(),
    flaggedAsSpammer: boolean("flagged_as_spammer").default(false).notNull(),
  },
  (table) => ({
    createdAtIdx: index("ix_accounts_created_at").on(table.createdAt),
    usernameUnique: uniqueIndex("ix_accounts_username").on(table.username),
    normalizedUsernameUnique: uniqueIndex("ix_accounts_normalized_username").on(
      table.normalizedUsername,
    ),
    emailUnique: uniqueIndex("accounts_email_key").on(table.email),
    // For signing in with an address whose case differs from the one on record.
    emailLowerIdx: index("ix_accounts_email_lower").on(sql`lower(${table.email})`),
    deletedIdx: index("ix_accounts_deleted").on(table.deleted),
    flaggedAsSpammerIdx: index("ix_accounts_flagged_as_spammer").on(table.flaggedAsSpammer),
  }),
)

export const accountIntegrations = pgTable(
  "account_integrations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    accountId: bigint("account_id", { mode: "number" })
      .notNull()
      .references(() => accounts.id),
    googleDriveAuthToken: text("google_drive_auth_token"),
    googleDriveCredentials: text("google_drive_credentials"),
    deleted: boolean("deleted").default(false).notNull(),
  },
  (table) => ({
    accountIdIdx: index("ix_account_integrations_account_id").on(table.accountId),
  }),
)

export const emailAccountAttempts = pgTable(
  "email_account_attempts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    email: text("email").notNull(),
    emailTriggered: boolean("email_triggered").default(false).notNull(),
    codeHash: text("code_hash"),
    tokenHash: text("token_hash"),
    consumed: boolean("consumed").default(false).notNull(),
    /**
     * Opaque handle for the `?state=` param on `/login/verify`, so the flow can resume in a new
     * tab. Deliberately not the id, which can be enumerated, and not `token_hash`, which signs a
     * caller in — `state` travels in browser history and referrers. Null on attempts older than it.
     */
    stateToken: text("state_token"),
    // Codes guessed, each counted before it's compared, so a 6-digit code can't be ground down.
    failedAttempts: integer("failed_attempts").notNull().default(0),
  },
  (table) => ({
    createdAtIdx: index("ix_email_account_attempts_created_at").on(table.createdAt),
    ipAddressIdx: index("ix_email_account_attempts_ip_address").on(table.ipAddress),
    emailIdx: index("ix_email_account_attempts_email").on(table.email),
    emailTriggeredIdx: index("ix_email_account_attempts_email_triggered").on(table.emailTriggered),
    codeHashIdx: index("ix_email_account_attempts_code_hash").on(table.codeHash),
    tokenHashIdx: index("ix_email_account_attempts_token_hash").on(table.tokenHash),
    stateTokenIdx: uniqueIndex("ix_email_account_attempts_state_token").on(table.stateToken),
  }),
)

export const gists = pgTable(
  "gists",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deleted: boolean("deleted").default(false).notNull(),
    accountId: bigint("account_id", { mode: "number" })
      .notNull()
      .references(() => accounts.id),
    slug: varchar("slug", { length: 64 }).notNull(),
    public: boolean("public").default(false).notNull(),
    visibility: varchar("visibility", { length: 16 }),
    archive: boolean("archive").default(false).notNull(),
    archivedAt: timestamp("archived_at"),
    title: varchar("title", { length: 100 }),
    legacyTitle: varchar("legacy_title", { length: 100 }),
    description: text("description"),
    runOnKernel: boolean("run_on_kernel").default(false).notNull(),
    googleDriveFileId: varchar("google_drive_file_id", { length: 100 }).default(""),
    githubRepository: text("github_repository").default(""),
    githubRepositoryWebhook: text("github_repository_webhook").default(""),
    githubRepositoryBranch: text("github_repository_branch").default(""),
    githubRepositoryFilePath: text("github_repository_file_path").default(""),
  },
  (table) => ({
    createdAtIdx: index("ix_gists_created_at").on(table.createdAt),
    updatedAtIdx: index("ix_gists_updated_at").on(table.updatedAt),
    accountIdx: index("ix_gists_account_id").on(table.accountId),
    slugUnique: uniqueIndex("gists_slug_key").on(table.slug),
    deletedIdx: index("ix_gists_deleted").on(table.deleted),
    archiveIdx: index("ix_gists_archive").on(table.archive),
    archivedAtIdx: index("ix_gists_archived_at").on(table.archivedAt),
    titleIdx: index("ix_gists_title").on(table.title),
    legacyTitleIdx: index("ix_gists_legacy_title").on(table.legacyTitle),
    googleDriveFileIdIdx: index("ix_gists_google_drive_file_id").on(table.googleDriveFileId),
    accountTitleUnique: uniqueIndex("ix_gists_account_id_title").on(table.accountId, table.title),
  }),
)

export const githubAccounts = pgTable(
  "github_accounts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    githubId: text("github_id").notNull(),
    username: text("username").notNull(),
    normalizedUsername: text("normalized_username"),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    emailPrimary: boolean("email_primary").default(false).notNull(),
    emailPublic: boolean("email_public").default(false).notNull(),
    emailsList: jsonb("emails_list").$type<unknown>(),
    displayName: text("display_name"),
    profileUrl: text("profile_url"),
    githubUpdatedAt: text("github_updated_at"),
    accessToken: text("access_token"),
    accountId: bigint("account_id", { mode: "number" })
      .notNull()
      .references(() => accounts.id),
  },
  (table) => ({
    createdAtIdx: index("ix_github_accounts_created_at").on(table.createdAt),
    githubIdUnique: uniqueIndex("github_accounts_github_id_key").on(table.githubId),
    usernameUnique: uniqueIndex("github_accounts_username_key").on(table.username),
    normalizedUsernameUnique: uniqueIndex("github_accounts_normalized_username_key").on(
      table.normalizedUsername,
    ),
    accountIdx: index("ix_github_accounts_account_id").on(table.accountId),
  }),
)

export const googleAccounts = pgTable(
  "google_accounts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    googleId: text("google_id").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    accountId: bigint("account_id", { mode: "number" })
      .notNull()
      .references(() => accounts.id),
  },
  (table) => ({
    createdAtIdx: index("ix_google_accounts_created_at").on(table.createdAt),
    googleIdUnique: uniqueIndex("google_accounts_google_id_key").on(table.googleId),
    emailUnique: uniqueIndex("google_accounts_email_key").on(table.email),
    accountIdx: index("ix_google_accounts_account_id").on(table.accountId),
  }),
)

export const quizzes = pgTable(
  "quizzes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    urlSlug: text("url_slug").notNull(),
    sortCategory: text("sort_category"),
    enabled: boolean("enabled").default(false).notNull(),
    displayTitle: text("display_title"),
    description: text("description"),
    shortDescription: text("short_description"),
    cover: text("cover"),
    // Caps how many of a quiz's questions an attempt serves (e.g. 25 of 50).
    // Null means "no cap" — it is not a cached count of the questions.
    questionCount: bigint("question_count", { mode: "number" }),
    jsonData: jsonb("json_data").$type<unknown>(),
    deleted: boolean("deleted").default(false).notNull(),
    maxAttempts: bigint("max_attempts", { mode: "number" }),
    timeLimit: bigint("time_limit", { mode: "number" }),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    showResult: boolean("show_result").default(true).notNull(),
    isProctored: boolean("is_proctored").default(false).notNull(),
    visibility: varchar("visibility", { length: 16 }),
  },
  (table) => ({
    urlSlugUnique: uniqueIndex("quizzes_url_slug_key").on(table.urlSlug),
    sortCategoryIdx: index("ix_quizzes_sort_category").on(table.sortCategory),
    startDateIdx: index("ix_quizzes_start_date").on(table.startDate),
    endDateIdx: index("ix_quizzes_end_date").on(table.endDate),
    visibilityIdx: index("ix_quizzes_visibility").on(table.visibility),
  }),
)

export const questions = pgTable(
  "questions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    title: text("title"),
    explanation: text("explanation"),
    answerType: text("answer_type"),
    options: jsonb("options").$type<unknown>(),
    correctAnswer: text("correct_answer"),
    deleted: boolean("deleted").default(false).notNull(),
    optional: boolean("optional").default(false).notNull(),
    creatorId: bigint("creator_id", { mode: "number" }).references(() => accounts.id),
  },
  (table) => ({
    titleIdx: index("ix_questions_title").on(table.title),
    creatorIdx: index("ix_questions_creator_id").on(table.creatorId),
  }),
)

export const quizQuestions = pgTable(
  "quiz_questions",
  {
    quizId: bigint("quiz_id", { mode: "number" })
      .notNull()
      .references(() => quizzes.id),
    questionId: bigint("question_id", { mode: "number" })
      .notNull()
      .references(() => questions.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    enabled: boolean("enabled").default(true).notNull(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.quizId, table.questionId],
      name: "quiz_questions_pkey",
    }),
    questionIdx: index("ix_quiz_questions_question_id").on(table.questionId),
  }),
)

export const quizQuestionAttempts = pgTable(
  "quiz_question_attempts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    accountId: bigint("account_id", { mode: "number" })
      .notNull()
      .references(() => accounts.id),
    quizId: bigint("quiz_id", { mode: "number" })
      .notNull()
      .references(() => quizzes.id),
    questionId: bigint("question_id", { mode: "number" })
      .notNull()
      .references(() => questions.id),
    isCorrect: boolean("is_correct").notNull(),
  },
  (table) => ({
    createdAtIdx: index("ix_quiz_question_attempts_created_at").on(table.createdAt),
    accountIdx: index("ix_quiz_question_attempts_account_id").on(table.accountId),
    quizIdx: index("ix_quiz_question_attempts_quiz_id").on(table.quizId),
    questionIdx: index("ix_quiz_question_attempts_question_id").on(table.questionId),
  }),
)

export const courses = pgTable(
  "courses",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ownerId: bigint("owner_id", { mode: "number" })
      .notNull()
      .references(() => accounts.id),
    slug: varchar("name", { length: 100 }).notNull(),
    title: varchar("title", { length: 100 }).notNull(),
    shortDescription: text("short_description"),
    description: text("description"),
    cover: text("cover"),
    /** Unused here, where `cover` is also the social image; kept for the legacy apps that read it. */
    metaImage: text("meta_image"),
    meta: jsonb("meta").$type<unknown>(),
    sections: jsonb("sections").$type<unknown>(),
    published: boolean("published").default(false).notNull(),
    slackEnabled: boolean("slack_enabled").default(false).notNull(),
    showRightSidebar: boolean("show_right_sidebar").default(false).notNull(),
    showLeftSidebar: boolean("show_left_sidebar").default(false).notNull(),
    showJobsBoard: boolean("show_jobs_board").default(false).notNull(),
    codeItYourself: boolean("code_it_yourself").default(false).notNull(),
    applicationFormVisibility: text("application_form_visiblity").default("PUBLIC"),
    certificateTemplate: text("certificate_template"),
    visibility: varchar("visibility", { length: 16 }),
    videoUrl: text("video_url"),
    referralForm: text("referral_form"),
    offersCertificate: boolean("offers_certificate").default(false).notNull(),
    isPaid: boolean("is_paid").default(false).notNull(),
    landingPageUrl: text("landing_page_url"),
    welcomeEmail: boolean("welcome_email").default(true).notNull(),
    welcomeEmailCustom: boolean("welcome_email_custom").default(false).notNull(),
    welcomeEmailContent: text("welcome_email_content"),
    welcomeEmailContentPreview: text("welcome_email_content_preview"),
    discussionUrl: text("discussion_url"),
    additionalInformation: text("additional_information"),
    applicationForm: jsonb("application_form").$type<unknown>(),
    slackWorkspaceId: varchar("slack_workspace_id", { length: 20 }),
    level: varchar("level", { length: 20 }),
    sendClassReminder: boolean("send_class_reminder").default(false).notNull(),
    admissionQuiz: text("admission_quiz"),
    bookerUrl: text("booker_url"),
    enableWeeklyUpdates: boolean("enable_weekly_updates").default(false).notNull(),
    enableEvaluationAlerts: boolean("enable_evaluation_alerts").default(false).notNull(),
    enableSectionDeadlineReminder: boolean("enable_section_deadline_reminder")
      .default(false)
      .notNull(),
    deleted: boolean("deleted").default(false).notNull(),
    price: integer("price"),
    stripeProductId: text("stripe_product_id"),
    /**
     * Where the course is listed, set by dragging on Manage Courses. Null until it's first
     * dragged, which lists it after the rest.
     */
    position: integer("position"),
  },
  (table) => ({
    slugUnique: uniqueIndex("courses_name_key").on(table.slug),
    ownerIdx: index("ix_courses_owner_id").on(table.ownerId),
    publishedIdx: index("ix_courses_published").on(table.published),
    slackEnabledIdx: index("ix_courses_slack_enabled").on(table.slackEnabled),
    showRightSidebarIdx: index("ix_courses_show_right_sidebar").on(table.showRightSidebar),
    showLeftSidebarIdx: index("ix_courses_show_left_sidebar").on(table.showLeftSidebar),
    showJobsBoardIdx: index("ix_courses_show_jobs_board").on(table.showJobsBoard),
    visibilityIdx: index("ix_courses_visibility").on(table.visibility),
    levelIdx: index("ix_courses_level").on(table.level),
    deletedIdx: index("ix_courses_deleted").on(table.deleted),
  }),
)

export const courseEnrollments = pgTable(
  "course_enrollments",
  {
    courseId: bigint("course_id", { mode: "number" })
      .notNull()
      .references(() => courses.id),
    enrolleeId: bigint("enrollee_id", { mode: "number" })
      .notNull()
      .references(() => accounts.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deleted: boolean("deleted").default(false).notNull(),
    certificationStatus: text("certification_status"),
    paymentStatus: text("payment_status"),
    comments: text("comments"),
    preferences: jsonb("preferences").$type<unknown>(),
  },
  (table) => ({
    createdAtIdx: index("ix_course_enrollments_created_at").on(table.createdAt),
    pk: primaryKey({
      columns: [table.courseId, table.enrolleeId],
      name: "course_enrollments_pkey",
    }),
    enrolleeIdx: index("ix_course_enrollments_enrollee_id").on(table.enrolleeId),
    deletedIdx: index("ix_course_enrollments_deleted").on(table.deleted),
    certificationStatusIdx: index("ix_course_enrollments_certification_status").on(
      table.certificationStatus,
    ),
    paymentStatusIdx: index("ix_course_enrollments_payment_status").on(table.paymentStatus),
  }),
)

export const courseSections = pgTable(
  "course_sections",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    courseId: bigint("course_id", { mode: "number" })
      .notNull()
      .references(() => courses.id),
    slug: varchar("slug", { length: 100 }).notNull(),
    legacySlug: varchar("legacy_slug", { length: 100 }),
    shortSlug: varchar("short_slug", { length: 30 }),
    title: varchar("title", { length: 100 }).notNull(),
    shortDescription: text("short_description"),
    titlePrefix: text("title_prefix"),
    description: text("description"),
    sectionType: varchar("section_type", { length: 20 }),
    modules: jsonb("modules").$type<unknown>(),
    deleted: boolean("deleted").default(false).notNull(),
    isOptional: boolean("is_optional").default(false).notNull(),
    requireQuestions: boolean("require_questions").default(false).notNull(),
    disableExecution: boolean("disable_execution").default(false).notNull(),
    allowDraft: boolean("allow_draft").default(false).notNull(),
    visibility: text("visibility"),
    videoUrl: text("video_url"),
    notebooks: jsonb("notebooks").$type<unknown>(),
    discussionUrl: text("discussion_url"),
    quizUrl: text("quiz_url"),
    transcript: text("transcript"),
    resources: text("resources"),
    alwaysOpen: boolean("always_open").default(false).notNull(),
    dueDate: timestamp("due_date"),
    // Automated evaluation is not supported: nothing here runs `evaluation_script`, so these
    // three are declared for a complete mirror and read by nothing. See `ASSIGNMENT_STATUS_OPTIONS`.
    evaluationType: text("evaluation_type"),
    evaluationScript: text("evaluation_script"),
    evaluationEmailAutomated: boolean("evaluation_email_automated").default(true).notNull(),
    evaluationGuideInternal: text("evaluation_guide_internal"),
    submissionRequirements: jsonb("submission_requirements").$type<unknown>(),
    evaluationEmailManual: boolean("evaluation_email_manual").default(true).notNull(),
    additionalInformation: text("additional_information"),
    notebooksHashList: jsonb("notebooks_hash_list").$type<unknown>(),
  },
  (table) => ({
    courseIdx: index("ix_course_sections_course_id").on(table.courseId),
    legacySlugIdx: index("ix_course_sections_legacy_slug").on(table.legacySlug),
    shortSlugUnique: uniqueIndex("course_sections_short_slug_key").on(table.shortSlug),
    deletedIdx: index("ix_course_sections_deleted").on(table.deleted),
    isOptionalIdx: index("ix_course_sections_is_optional").on(table.isOptional),
    requireQuestionsIdx: index("ix_course_sections_require_questions").on(table.requireQuestions),
    disableExecutionIdx: index("ix_course_sections_disable_execution").on(table.disableExecution),
    allowDraftIdx: index("ix_course_sections_allow_draft").on(table.allowDraft),
    visibilityIdx: index("ix_course_sections_visibility").on(table.visibility),
    courseSlugUnique: uniqueIndex("ix_course_sections_course_id_slug").on(
      table.courseId,
      table.slug,
    ),
  }),
)

export const courseSectionProgress = pgTable(
  "course_section_progress",
  {
    sectionId: bigint("section_id", { mode: "number" })
      .notNull()
      .references(() => courseSections.id),
    enrolleeId: bigint("enrollee_id", { mode: "number" })
      .notNull()
      .references(() => accounts.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    /** 0 - 100 */
    progress: integer("progress").default(0).notNull(),
    reaction: text("reaction"),
    deleted: boolean("deleted").default(false).notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    createdAtIdx: index("ix_course_section_progress_created_at").on(table.createdAt),
    updatedAtIdx: index("ix_course_section_progress_updated_at").on(table.updatedAt),
    pk: primaryKey({
      columns: [table.sectionId, table.enrolleeId],
      name: "course_section_progress_pkey",
    }),
    enrolleeIdx: index("ix_course_section_progress_enrollee_id").on(table.enrolleeId),
    reactionIdx: index("ix_course_section_progress_reaction").on(table.reaction),
    deletedIdx: index("ix_course_section_progress_deleted").on(table.deleted),
  }),
)

export const courseAssignmentSubmissions = pgTable(
  "course_assignment_submissions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    courseId: bigint("course_id", { mode: "number" })
      .notNull()
      .references(() => courses.id),
    sectionId: bigint("section_id", { mode: "number" })
      .notNull()
      .references(() => courseSections.id),
    enrolleeId: bigint("enrollee_id", { mode: "number" })
      .notNull()
      .references(() => accounts.id),
    assignmentType: text("assignment_type"),
    assignmentUrl: text("assignment_url"),
    blogUrl: text("blog_url"),
    description: text("description"),
    assignment: jsonb("assignment").$type<unknown>(),
    evaluatorId: bigint("evaluator_id", { mode: "number" }).references(() => accounts.id),
    assignmentStatus: text("assignment_status"),
    comments: text("comments"),
    internalStatus: text("internal_status"),
    internalComments: text("internal_comments"),
    deleted: boolean("deleted").default(false).notNull(),
    assignmentFileContentHash: text("assignment_file_content_hash"),
    isDraft: boolean("is_draft").default(false).notNull(),
    isPlagiarised: boolean("is_plagiarised"),
    plagiarismCheckedAt: timestamp("plagiarism_checked_at"),
    originalSubmissionId: bigint("original_submission_id", {
      mode: "number",
    }),
    assignmentFileCellsHashList: jsonb("assignment_file_cells_hash_list").$type<unknown>(),
    level2PlagiarisedInfo: jsonb("level_2_plagiarised_info").$type<unknown>(),
  },
  (table) => ({
    createdAtIdx: index("ix_course_assignment_submissions_created_at").on(table.createdAt),
    updatedAtIdx: index("ix_course_assignment_submissions_updated_at").on(table.updatedAt),
    courseIdx: index("ix_course_assignment_submissions_course_id").on(table.courseId),
    sectionIdx: index("ix_course_assignment_submissions_section_id").on(table.sectionId),
    enrolleeIdx: index("ix_course_assignment_submissions_enrollee_id").on(table.enrolleeId),
    evaluatorIdx: index("ix_course_assignment_submissions_evaluator_id").on(table.evaluatorId),
    deletedIdx: index("ix_course_assignment_submissions_deleted").on(table.deleted),
    assignmentFileContentHashIdx: index(
      "ix_course_assignment_submissions_assignment_file_content_hash",
    ).on(table.assignmentFileContentHash),
    isDraftIdx: index("ix_course_assignment_submissions_is_draft").on(table.isDraft),
    isPlagiarisedIdx: index("ix_course_assignment_submissions_is_plagiarised").on(
      table.isPlagiarised,
    ),
    plagiarismCheckedAtIdx: index("ix_course_assignment_submissions_plagiarism_checked_at").on(
      table.plagiarismCheckedAt,
    ),
    originalSubmissionIdx: index("ix_course_assignment_submissions_original_submission_id").on(
      table.originalSubmissionId,
    ),
    originalSubmissionFk: foreignKey({
      columns: [table.originalSubmissionId],
      foreignColumns: [table.id],
      name: "course_assignment_submissions_original_submission_id_fkey",
    }),
  }),
)

export const courseCertificates = pgTable(
  "course_certificates",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    slug: varchar("slug", { length: 64 }).notNull(),
    courseId: bigint("course_id", { mode: "number" })
      .notNull()
      .references(() => courses.id),
    ownerId: bigint("owner_id", { mode: "number" })
      .notNull()
      .references(() => accounts.id),
    printedName: text("printed_name"),
    deleted: boolean("deleted").default(false).notNull(),
    issuedAt: timestamp("issued_at"),
  },
  (table) => ({
    slugUnique: uniqueIndex("course_certificates_slug_key").on(table.slug),
    courseIdx: index("ix_course_certificates_course_id").on(table.courseId),
    ownerIdx: index("ix_course_certificates_owner_id").on(table.ownerId),
    deletedIdx: index("ix_course_certificates_deleted").on(table.deleted),
    issuedAtIdx: index("ix_course_certificates_issued_at").on(table.issuedAt),
    courseOwnerUnique: uniqueIndex("ix_course_certificates_course_id_owner_id").on(
      table.courseId,
      table.ownerId,
    ),
  }),
)

export const coursePayments = pgTable(
  "course_payments",
  {
    sessionId: text("session_id").notNull(),
    paymentIntentId: text("payment_intent_id").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    paymentStatus: text("payment_status"),
    enrolleeId: bigint("enrollee_id", { mode: "number" }).references(() => accounts.id),
    courseId: bigint("course_id", { mode: "number" }).references(() => courses.id),
    amount: bigint("amount", { mode: "number" }),
    currency: text("currency"),
  },
  (table) => ({
    createdAtIdx: index("ix_course_payments_created_at").on(table.createdAt),
    pk: primaryKey({
      columns: [table.sessionId, table.paymentIntentId],
      name: "course_payments_pkey",
    }),
    paymentStatusIdx: index("ix_course_payments_payment_status").on(table.paymentStatus),
    enrolleeIdx: index("ix_course_payments_enrollee_id").on(table.enrolleeId),
    courseIdx: index("ix_course_payments_course_id").on(table.courseId),
    currencyIdx: index("ix_course_payments_currency").on(table.currency),
  }),
)

/** One row per Stripe subscription rather than per account, so a resubscribe keeps the history. */
export const accountSubscriptions = pgTable(
  "account_subscriptions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    accountId: bigint("account_id", { mode: "number" })
      .notNull()
      .references(() => accounts.id),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    stripeSubscriptionId: text("stripe_subscription_id").notNull(),
    stripePriceId: text("stripe_price_id"),
    status: text("status").notNull(),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  },
  (table) => ({
    createdAtIdx: index("ix_account_subscriptions_created_at").on(table.createdAt),
    accountIdx: index("ix_account_subscriptions_account_id").on(table.accountId),
    stripeCustomerIdx: index("ix_account_subscriptions_stripe_customer_id").on(
      table.stripeCustomerId,
    ),
    statusIdx: index("ix_account_subscriptions_status").on(table.status),
    stripeSubscriptionUnique: uniqueIndex("account_subscriptions_stripe_subscription_id_key").on(
      table.stripeSubscriptionId,
    ),
  }),
)

/** Landing-page testimonials, kept apart from `accounts` since most reviewers never signed up. */
export const reviews = pgTable("reviews", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  name: text("name").notNull(),
  headline: text("headline"),
  body: text("body").notNull(),
  avatarUrl: text("avatar_url"),
  sourceUrl: text("source_url"),
  position: integer("position").notNull(),
  visibility: varchar("visibility", { length: 16 }).default("PUBLIC").notNull(),
})

/** `/manage/config`, one row per `SiteConfigSection` holding that section's settings as JSON. */
export const siteConfig = pgTable("site_config", {
  section: varchar("section", { length: 32 }).primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: updatedAt(),
})

/**
 * The AI tutor's conversations. Rows cascade from the account, which keeps `/manage/users`' hard
 * delete from tripping over them.
 */
export const aiTutorConversations = pgTable(
  "ai_tutor_conversations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    accountId: bigint("account_id", { mode: "number" })
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    courseId: bigint("course_id", { mode: "number" })
      .notNull()
      .references(() => courses.id),
    /** Written by the model after the first message; null until then. */
    title: text("title"),
    lastMessageAt: timestamp("last_message_at").default(utcNow).notNull(),
    /** The sum of its messages' `cost_micros`, so the admin list needn't add them up. */
    costMicros: bigint("cost_micros", { mode: "number" }).default(0).notNull(),
    deleted: boolean("deleted").default(false).notNull(),
  },
  (table) => ({
    accountCourseIdx: index("ix_ai_tutor_conversations_account_id_course_id").on(
      table.accountId,
      table.courseId,
      table.lastMessageAt,
    ),
    courseIdx: index("ix_ai_tutor_conversations_course_id").on(table.courseId),
    lastMessageAtIdx: index("ix_ai_tutor_conversations_last_message_at").on(table.lastMessageAt),
  }),
)

/** One user message or one assistant reply, the reply carrying what it cost. */
export const aiTutorMessages = pgTable(
  "ai_tutor_messages",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: createdAt(),
    conversationId: bigint("conversation_id", { mode: "number" })
      .notNull()
      .references(() => aiTutorConversations.id, { onDelete: "cascade" }),
    /** `user` or `assistant`. */
    role: varchar("role", { length: 16 }).notNull(),
    /** TanStack AI `MessagePart`s: text, tool calls and their results, and reasoning summaries. */
    parts: jsonb("parts").$type<unknown>().notNull(),
    /** The lesson or assignment the learner was on when they asked. No FK: it's only context. */
    sectionId: bigint("section_id", { mode: "number" }),
    /** The rest are set on replies only. `status` is an `AiTutorMessageStatus`. */
    status: varchar("status", { length: 16 }),
    model: text("model"),
    plan: varchar("plan", { length: 16 }),
    reasoningEffort: varchar("reasoning_effort", { length: 16 }),
    inputTokens: integer("input_tokens"),
    cachedInputTokens: integer("cached_input_tokens"),
    outputTokens: integer("output_tokens"),
    reasoningTokens: integer("reasoning_tokens"),
    costMicros: bigint("cost_micros", { mode: "number" }).default(0).notNull(),
    /** A stopped reply's last model call reports no usage, so its tokens are counted by hand. */
    usageEstimated: boolean("usage_estimated").default(false).notNull(),
    error: text("error"),
    durationMs: integer("duration_ms"),
  },
  (table) => ({
    conversationIdx: index("ix_ai_tutor_messages_conversation_id").on(table.conversationId),
    createdAtIdx: index("ix_ai_tutor_messages_created_at").on(table.createdAt),
  }),
)

/**
 * A learner's 5-hour or 7-day quota window. One opens with the first message after the last one
 * ended, and the replies sent inside it add to `spent_micros`.
 */
export const aiTutorUsageWindows = pgTable(
  "ai_tutor_usage_windows",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: createdAt(),
    accountId: bigint("account_id", { mode: "number" })
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    /** An `AiTutorUsageWindowKind`. */
    kind: varchar("kind", { length: 16 }).notNull(),
    startedAt: timestamp("started_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    spentMicros: bigint("spent_micros", { mode: "number" }).default(0).notNull(),
  },
  (table) => ({
    accountEndsAtIdx: index("ix_ai_tutor_usage_windows_account_id_ends_at").on(
      table.accountId,
      table.endsAt,
    ),
    accountKindStartUnique: uniqueIndex("ix_ai_tutor_usage_windows_account_id_kind_started_at").on(
      table.accountId,
      table.kind,
      table.startedAt,
    ),
  }),
)
