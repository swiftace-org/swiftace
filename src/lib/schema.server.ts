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
 * Drizzle schema mirroring the legacy SQLAlchemy models against the same Postgres database.
 *
 * ## Defaults: `.default()` vs `.$defaultFn()`
 *
 * Drizzle omits a column from the INSERT when it carries `.default()`, leaving Postgres to
 * fill it in — so `.default()` on a column Postgres has no default for silently writes NULL.
 * The legacy app applied most defaults in Python rather than as DB `DEFAULT` clauses:
 *
 * - `.default(x)`      — Postgres genuinely has that default.
 * - `.$defaultFn(fn)`  — no DB default; computed client-side, as SQLAlchemy's `default=` did.
 * - `.$onUpdateFn(fn)` — mirrors SQLAlchemy's `onupdate=`, used for `updated_at`.
 *
 * Every value below was checked against `information_schema.columns` in production, so
 * changing one means re-checking there first.
 */

/** `TimestampMixin.created_at`: `default=datetime.utcnow`, i.e. Python-side, not a DB default. */
const createdAt = () =>
  timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull()

/**
 * `TimestampMixin.updated_at`: SQLAlchemy's `onupdate=`. Drizzle also runs `$onUpdateFn` on
 * INSERT, so new rows get `updated_at == created_at` where Flask left NULL — cosmetic only.
 */
const updatedAt = () => timestamp("updated_at").$onUpdateFn(() => new Date())

export const accounts = pgTable(
  "accounts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    name: varchar("name", { length: 64 }).notNull(),
    username: varchar("username", { length: 64 }).default("").notNull(),
    normalizedUsername: varchar("normalized_username", { length: 64 }),
    email: varchar("email", { length: 128 }).notNull(),
    deleted: boolean("deleted").$defaultFn(() => false),
    isAdmin: boolean("is_admin").default(false).notNull(),
    flaggedAsSpammer: boolean("flagged_as_spammer").default(false).notNull(),
  },
  (table) => ({
    usernameUnique: uniqueIndex("ix_accounts_username").on(table.username),
    normalizedUsernameUnique: uniqueIndex("ix_accounts_normalized_username").on(
      table.normalizedUsername,
    ),
    emailUnique: uniqueIndex("accounts_email_key").on(table.email),
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
    deleted: boolean("deleted").$defaultFn(() => false),
  },
  (table) => ({
    accountIdIdx: index("ix_account_integrations_account_id").on(table.accountId),
  }),
)

export const emailAccountAttempts = pgTable(
  "email_account_attempts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    // The only `created_at` in the schema with a real `DEFAULT now()` in Postgres.
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    email: text("email").notNull(),
    emailTriggered: boolean("email_triggered").$defaultFn(() => false),
    codeHash: text("code_hash"),
    tokenHash: text("token_hash"),
    // `consumed` postdates the Flask app, so it has no SQLAlchemy default either;
    // rows written before this default was added can still be NULL.
    consumed: boolean("consumed").$defaultFn(() => false),
    /**
     * Opaque handle for the `?state=` param on `/login/verify`, so the flow can resume in a new
     * tab. Deliberately not the id, which can be enumerated, and not `token_hash`, which signs a
     * caller in — `state` travels in browser history and referrers. Nullable: older rows predate it.
     */
    stateToken: text("state_token"),
    // Wrong verification codes, so a 6-digit code can't be ground down. Unlike `consumed`
    // this has a real `DEFAULT 0` in Postgres, applied to the existing rows too.
    failedAttempts: integer("failed_attempts").notNull().default(0),
  },
  (table) => ({
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
    deleted: boolean("deleted").$defaultFn(() => false),
    accountId: bigint("account_id", { mode: "number" })
      .notNull()
      .references(() => accounts.id),
    slug: varchar("slug", { length: 64 }).default("").notNull(),
    public: boolean("public").$defaultFn(() => false),
    visibility: varchar("visibility", { length: 16 }),
    archive: boolean("archive").default(false),
    archivedAt: timestamp("archived_at"),
    title: varchar("title", { length: 100 }),
    legacyTitle: varchar("legacy_title", { length: 100 }),
    description: text("description"),
    runOnKernel: boolean("run_on_kernel").default(false),
    googleDriveFileId: varchar("google_drive_file_id", { length: 100 }).$defaultFn(() => ""),
    githubRepository: text("github_repository").$defaultFn(() => ""),
    githubRepositoryWebhook: text("github_repository_webhook").$defaultFn(() => ""),
    githubRepositoryBranch: text("github_repository_branch").$defaultFn(() => ""),
    githubRepositoryFilePath: text("github_repository_file_path").$defaultFn(() => ""),
  },
  (table) => ({
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
    emailVerified: boolean("email_verified")
      .$defaultFn(() => false)
      .notNull(),
    emailPrimary: boolean("email_primary")
      .$defaultFn(() => false)
      .notNull(),
    emailPublic: boolean("email_public")
      .$defaultFn(() => false)
      .notNull(),
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
    emailVerified: boolean("email_verified")
      .$defaultFn(() => false)
      .notNull(),
    accountId: bigint("account_id", { mode: "number" })
      .notNull()
      .references(() => accounts.id),
  },
  (table) => ({
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
    enabled: boolean("enabled")
      .$defaultFn(() => false)
      .notNull(),
    displayTitle: text("display_title"),
    description: text("description"),
    shortDescription: text("short_description"),
    cover: text("cover"),
    // Caps how many of a quiz's questions an attempt serves (e.g. 25 of 50).
    // Null means "no cap" — it is not a cached count of the questions.
    questionCount: bigint("question_count", { mode: "number" }),
    jsonData: jsonb("json_data").$type<unknown>(),
    deleted: boolean("deleted").$defaultFn(() => false),
    maxAttempts: bigint("max_attempts", { mode: "number" }),
    timeLimit: bigint("time_limit", { mode: "number" }),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    showResult: boolean("show_result").$defaultFn(() => true),
    isProctored: boolean("is_proctored").$defaultFn(() => false),
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
    deleted: boolean("deleted").$defaultFn(() => false),
    optional: boolean("optional").default(false),
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
    enabled: boolean("enabled")
      .$defaultFn(() => true)
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.quizId, table.questionId],
      name: "quiz_questions_pkey",
    }),
    quizIdx: index("ix_quiz_questions_quiz_id").on(table.quizId),
    questionIdx: index("ix_quiz_questions_question_id").on(table.questionId),
    quizQuestionUnique: uniqueIndex("ix_quiz_questions_quiz_id_question_id").on(
      table.quizId,
      table.questionId,
    ),
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
    slackEnabled: boolean("slack_enabled").default(false),
    showRightSidebar: boolean("show_right_sidebar").default(false),
    showLeftSidebar: boolean("show_left_sidebar").default(false),
    showJobsBoard: boolean("show_jobs_board").$defaultFn(() => false),
    codeItYourself: boolean("code_it_yourself").default(false),
    applicationFormVisibility: text("application_form_visiblity").$defaultFn(() => "PUBLIC"),
    certificateTemplate: text("certificate_template"),
    visibility: varchar("visibility", { length: 16 }),
    videoUrl: text("video_url"),
    referralForm: text("referral_form"),
    offersCertificate: boolean("offers_certificate"),
    isPaid: boolean("is_paid").$defaultFn(() => false),
    landingPageUrl: text("landing_page_url"),
    welcomeEmail: boolean("welcome_email").default(true),
    welcomeEmailCustom: boolean("welcome_email_custom").default(false),
    welcomeEmailContent: text("welcome_email_content"),
    welcomeEmailContentPreview: text("welcome_email_content_preview"),
    discussionUrl: text("discussion_url"),
    additionalInformation: text("additional_information"),
    applicationForm: jsonb("application_form").$type<unknown>(),
    slackWorkspaceId: varchar("slack_workspace_id", { length: 20 }),
    level: varchar("level", { length: 20 }),
    sendClassReminder: boolean("send_class_reminder").$defaultFn(() => false),
    admissionQuiz: text("admission_quiz"),
    bookerUrl: text("booker_url"),
    enableWeeklyUpdates: boolean("enable_weekly_updates").$defaultFn(() => false),
    enableEvaluationAlerts: boolean("enable_evaluation_alerts").$defaultFn(() => false),
    enableSectionDeadlineReminder: boolean("enable_section_deadline_reminder").$defaultFn(
      () => false,
    ),
    deleted: boolean("deleted").$defaultFn(() => false),
    price: integer("price"),
    stripeProductId: text("stripe_product_id"),
    /**
     * Where the course is listed, set by dragging on Manage Courses. Added by hand and nullable
     * with no default, so Flask (which doesn't know it) inserts NULL, which lists after the rest.
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
    deleted: boolean("deleted").$defaultFn(() => false),
    certificationStatus: text("certification_status"),
    paymentStatus: text("payment_status"),
    comments: text("comments"),
    preferences: jsonb("preferences").$type<unknown>(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.courseId, table.enrolleeId],
      name: "course_enrollments_pkey",
    }),
    courseIdx: index("ix_course_enrollments_course_id").on(table.courseId),
    enrolleeIdx: index("ix_course_enrollments_enrollee_id").on(table.enrolleeId),
    deletedIdx: index("ix_course_enrollments_deleted").on(table.deleted),
    certificationStatusIdx: index("ix_course_enrollments_certification_status").on(
      table.certificationStatus,
    ),
    paymentStatusIdx: index("ix_course_enrollments_payment_status").on(table.paymentStatus),
    courseEnrolleeUnique: uniqueIndex("ix_course_enrollments_course_id_enrollee_id").on(
      table.courseId,
      table.enrolleeId,
    ),
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
    deleted: boolean("deleted").$defaultFn(() => false),
    isOptional: boolean("is_optional").default(false),
    requireQuestions: boolean("require_questions").default(false),
    disableExecution: boolean("disable_execution").$defaultFn(() => false),
    allowDraft: boolean("allow_draft").$defaultFn(() => false),
    visibility: text("visibility"),
    videoUrl: text("video_url"),
    notebooks: jsonb("notebooks").$type<unknown>(),
    discussionUrl: text("discussion_url"),
    quizUrl: text("quiz_url"),
    transcript: text("transcript"),
    resources: text("resources"),
    alwaysOpen: boolean("always_open"),
    dueDate: timestamp("due_date"),
    // Automated evaluation is not supported: nothing here runs `evaluation_script`, so these
    // three are declared for a complete mirror and read by nothing. See `ASSIGNMENT_STATUS_OPTIONS`.
    evaluationType: text("evaluation_type"),
    evaluationScript: text("evaluation_script"),
    evaluationEmailAutomated: boolean("evaluation_email_automated").default(true),
    evaluationGuideInternal: text("evaluation_guide_internal"),
    submissionRequirements: jsonb("submission_requirements").$type<unknown>(),
    evaluationEmailManual: boolean("evaluation_email_manual").default(true),
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
    progress: integer("progress")
      .$defaultFn(() => 0)
      .notNull(),
    reaction: text("reaction"),
    deleted: boolean("deleted").$defaultFn(() => false),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.sectionId, table.enrolleeId],
      name: "course_section_progress_pkey",
    }),
    sectionIdx: index("ix_course_section_progress_section_id").on(table.sectionId),
    enrolleeIdx: index("ix_course_section_progress_enrollee_id").on(table.enrolleeId),
    reactionIdx: index("ix_course_section_progress_reaction").on(table.reaction),
    deletedIdx: index("ix_course_section_progress_deleted").on(table.deleted),
    sectionEnrolleeUnique: uniqueIndex("ix_course_section_progress_section_id_enrollee_id").on(
      table.sectionId,
      table.enrolleeId,
    ),
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
    deleted: boolean("deleted").$defaultFn(() => false),
    assignmentFileContentHash: text("assignment_file_content_hash"),
    isDraft: boolean("is_draft").default(false),
    isPlagiarised: boolean("is_plagiarised"),
    plagiarismCheckedAt: timestamp("plagiarism_checked_at"),
    originalSubmissionId: bigint("original_submission_id", {
      mode: "number",
    }),
    assignmentFileCellsHashList: jsonb("assignment_file_cells_hash_list").$type<unknown>(),
    level2PlagiarisedInfo: jsonb("level_2_plagiarised_info").$type<unknown>(),
  },
  (table) => ({
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
    deleted: boolean("deleted").$defaultFn(() => false),
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

/**
 * One row per Stripe subscription rather than per account, so a resubscribe keeps the history.
 * The only table the Flask app never touched, so real Postgres defaults apply — but
 * `updated_at` still needs `$onUpdateFn`, since the DB default only fires on INSERT.
 */
export const accountSubscriptions = pgTable(
  "account_subscriptions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
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
    accountIdx: index("ix_account_subscriptions_account_id").on(table.accountId),
    statusIdx: index("ix_account_subscriptions_status").on(table.status),
    stripeSubscriptionUnique: uniqueIndex("account_subscriptions_stripe_subscription_id_key").on(
      table.stripeSubscriptionId,
    ),
  }),
)

/**
 * Landing-page testimonials, kept apart from `accounts` since most reviewers never signed up.
 * Created by hand rather than by Flask, so the Postgres defaults are real.
 */
export const reviews = pgTable("reviews", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdateFn(() => new Date())
    .notNull(),
  name: text("name").notNull(),
  headline: text("headline"),
  body: text("body").notNull(),
  avatarUrl: text("avatar_url"),
  sourceUrl: text("source_url"),
  position: integer("position").notNull(),
  visibility: varchar("visibility", { length: 16 }).default("PUBLIC").notNull(),
})

/**
 * `/manage/config`, one row per `SiteConfigSection` holding that section's settings as JSON.
 * Created by hand rather than by Flask, so the Postgres defaults are real.
 */
export const siteConfig = pgTable("site_config", {
  section: varchar("section", { length: 32 }).primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdateFn(() => new Date())
    .notNull(),
})

/**
 * The AI tutor's tables are new with it, so their Postgres defaults are real. Rows cascade from
 * the account, which keeps `/manage/users`' hard delete from tripping over them.
 */
export const aiTutorConversations = pgTable(
  "ai_tutor_conversations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
    accountId: bigint("account_id", { mode: "number" })
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    courseId: bigint("course_id", { mode: "number" })
      .notNull()
      .references(() => courses.id),
    /** Written by the model after the first message; null until then. */
    title: text("title"),
    lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
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
