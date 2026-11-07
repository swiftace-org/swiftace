CREATE TABLE "account_integrations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"account_id" bigint NOT NULL,
	"google_drive_auth_token" text,
	"google_drive_credentials" text,
	"deleted" boolean
);
--> statement-breakpoint
CREATE TABLE "account_subscriptions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"account_id" bigint NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"stripe_price_id" text,
	"status" text NOT NULL,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"name" varchar(64) NOT NULL,
	"username" varchar(64) DEFAULT '' NOT NULL,
	"normalized_username" varchar(64),
	"email" varchar(128) NOT NULL,
	"deleted" boolean,
	"is_admin" boolean DEFAULT false NOT NULL,
	"flagged_as_spammer" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_assignment_submissions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"course_id" bigint NOT NULL,
	"section_id" bigint NOT NULL,
	"enrollee_id" bigint NOT NULL,
	"assignment_type" text,
	"assignment_url" text,
	"blog_url" text,
	"description" text,
	"assignment" jsonb,
	"evaluator_id" bigint,
	"assignment_status" text,
	"comments" text,
	"internal_status" text,
	"internal_comments" text,
	"deleted" boolean,
	"assignment_file_content_hash" text,
	"is_draft" boolean DEFAULT false,
	"is_plagiarised" boolean,
	"plagiarism_checked_at" timestamp,
	"original_submission_id" bigint,
	"assignment_file_cells_hash_list" jsonb,
	"level_2_plagiarised_info" jsonb
);
--> statement-breakpoint
CREATE TABLE "course_certificates" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"slug" varchar(64) NOT NULL,
	"course_id" bigint NOT NULL,
	"owner_id" bigint NOT NULL,
	"printed_name" text,
	"deleted" boolean,
	"issued_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "course_enrollments" (
	"course_id" bigint NOT NULL,
	"enrollee_id" bigint NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"deleted" boolean,
	"certification_status" text,
	"payment_status" text,
	"comments" text,
	"preferences" jsonb,
	CONSTRAINT "course_enrollments_pkey" PRIMARY KEY("course_id","enrollee_id")
);
--> statement-breakpoint
CREATE TABLE "course_payments" (
	"session_id" text NOT NULL,
	"payment_intent_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"payment_status" text,
	"enrollee_id" bigint,
	"course_id" bigint,
	"amount" bigint,
	"currency" text,
	CONSTRAINT "course_payments_pkey" PRIMARY KEY("session_id","payment_intent_id")
);
--> statement-breakpoint
CREATE TABLE "course_section_progress" (
	"section_id" bigint NOT NULL,
	"enrollee_id" bigint NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"progress" integer NOT NULL,
	"reaction" text,
	"deleted" boolean,
	"completed_at" timestamp,
	CONSTRAINT "course_section_progress_pkey" PRIMARY KEY("section_id","enrollee_id")
);
--> statement-breakpoint
CREATE TABLE "course_sections" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"course_id" bigint NOT NULL,
	"slug" varchar(100) NOT NULL,
	"legacy_slug" varchar(100),
	"short_slug" varchar(30),
	"title" varchar(100) NOT NULL,
	"short_description" text,
	"title_prefix" text,
	"description" text,
	"section_type" varchar(20),
	"modules" jsonb,
	"deleted" boolean,
	"is_optional" boolean DEFAULT false,
	"require_questions" boolean DEFAULT false,
	"disable_execution" boolean,
	"allow_draft" boolean,
	"visibility" text,
	"video_url" text,
	"notebooks" jsonb,
	"discussion_url" text,
	"quiz_url" text,
	"transcript" text,
	"resources" text,
	"always_open" boolean,
	"due_date" timestamp,
	"evaluation_type" text,
	"evaluation_script" text,
	"evaluation_email_automated" boolean DEFAULT true,
	"evaluation_guide_internal" text,
	"submission_requirements" jsonb,
	"evaluation_email_manual" boolean DEFAULT true,
	"additional_information" text,
	"notebooks_hash_list" jsonb
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"owner_id" bigint NOT NULL,
	"name" varchar(100) NOT NULL,
	"title" varchar(100) NOT NULL,
	"short_description" text,
	"description" text,
	"cover" text,
	"meta_image" text,
	"meta" jsonb,
	"sections" jsonb,
	"published" boolean DEFAULT false NOT NULL,
	"slack_enabled" boolean DEFAULT false,
	"show_right_sidebar" boolean DEFAULT false,
	"show_left_sidebar" boolean DEFAULT false,
	"show_jobs_board" boolean,
	"code_it_yourself" boolean DEFAULT false,
	"application_form_visiblity" text,
	"certificate_template" text,
	"visibility" varchar(16),
	"video_url" text,
	"referral_form" text,
	"offers_certificate" boolean,
	"is_paid" boolean,
	"landing_page_url" text,
	"welcome_email" boolean DEFAULT true,
	"welcome_email_custom" boolean DEFAULT false,
	"welcome_email_content" text,
	"welcome_email_content_preview" text,
	"discussion_url" text,
	"additional_information" text,
	"application_form" jsonb,
	"slack_workspace_id" varchar(20),
	"level" varchar(20),
	"send_class_reminder" boolean,
	"admission_quiz" text,
	"booker_url" text,
	"enable_weekly_updates" boolean,
	"enable_evaluation_alerts" boolean,
	"enable_section_deadline_reminder" boolean,
	"deleted" boolean,
	"price" integer,
	"stripe_product_id" text,
	"position" integer
);
--> statement-breakpoint
CREATE TABLE "email_account_attempts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"ip_address" text,
	"email" text NOT NULL,
	"email_triggered" boolean,
	"code_hash" text,
	"token_hash" text,
	"consumed" boolean,
	"state_token" text,
	"failed_attempts" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gists" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"deleted" boolean,
	"account_id" bigint NOT NULL,
	"slug" varchar(64) DEFAULT '' NOT NULL,
	"public" boolean,
	"visibility" varchar(16),
	"archive" boolean DEFAULT false,
	"archived_at" timestamp,
	"title" varchar(100),
	"legacy_title" varchar(100),
	"description" text,
	"run_on_kernel" boolean DEFAULT false,
	"google_drive_file_id" varchar(100),
	"github_repository" text,
	"github_repository_webhook" text,
	"github_repository_branch" text,
	"github_repository_file_path" text
);
--> statement-breakpoint
CREATE TABLE "github_accounts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"github_id" text NOT NULL,
	"username" text NOT NULL,
	"normalized_username" text,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"email_primary" boolean NOT NULL,
	"email_public" boolean NOT NULL,
	"emails_list" jsonb,
	"display_name" text,
	"profile_url" text,
	"github_updated_at" text,
	"access_token" text,
	"account_id" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_accounts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"google_id" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"account_id" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"title" text,
	"explanation" text,
	"answer_type" text,
	"options" jsonb,
	"correct_answer" text,
	"deleted" boolean,
	"optional" boolean DEFAULT false,
	"creator_id" bigint
);
--> statement-breakpoint
CREATE TABLE "quiz_question_attempts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"account_id" bigint NOT NULL,
	"quiz_id" bigint NOT NULL,
	"question_id" bigint NOT NULL,
	"is_correct" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"quiz_id" bigint NOT NULL,
	"question_id" bigint NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"enabled" boolean NOT NULL,
	CONSTRAINT "quiz_questions_pkey" PRIMARY KEY("quiz_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"url_slug" text NOT NULL,
	"sort_category" text,
	"enabled" boolean NOT NULL,
	"display_title" text,
	"description" text,
	"short_description" text,
	"cover" text,
	"question_count" bigint,
	"json_data" jsonb,
	"deleted" boolean,
	"max_attempts" bigint,
	"time_limit" bigint,
	"start_date" timestamp,
	"end_date" timestamp,
	"show_result" boolean,
	"is_proctored" boolean,
	"visibility" varchar(16)
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"headline" text,
	"body" text NOT NULL,
	"avatar_url" text,
	"source_url" text,
	"position" integer NOT NULL,
	"visibility" varchar(16) DEFAULT 'PUBLIC' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_config" (
	"section" varchar(32) PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_integrations" ADD CONSTRAINT "account_integrations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_subscriptions" ADD CONSTRAINT "account_subscriptions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_assignment_submissions" ADD CONSTRAINT "course_assignment_submissions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_assignment_submissions" ADD CONSTRAINT "course_assignment_submissions_section_id_course_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_assignment_submissions" ADD CONSTRAINT "course_assignment_submissions_enrollee_id_accounts_id_fk" FOREIGN KEY ("enrollee_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_assignment_submissions" ADD CONSTRAINT "course_assignment_submissions_evaluator_id_accounts_id_fk" FOREIGN KEY ("evaluator_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_assignment_submissions" ADD CONSTRAINT "course_assignment_submissions_original_submission_id_fkey" FOREIGN KEY ("original_submission_id") REFERENCES "public"."course_assignment_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_certificates" ADD CONSTRAINT "course_certificates_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_certificates" ADD CONSTRAINT "course_certificates_owner_id_accounts_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_enrollee_id_accounts_id_fk" FOREIGN KEY ("enrollee_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_payments" ADD CONSTRAINT "course_payments_enrollee_id_accounts_id_fk" FOREIGN KEY ("enrollee_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_payments" ADD CONSTRAINT "course_payments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_section_progress" ADD CONSTRAINT "course_section_progress_section_id_course_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."course_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_section_progress" ADD CONSTRAINT "course_section_progress_enrollee_id_accounts_id_fk" FOREIGN KEY ("enrollee_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_sections" ADD CONSTRAINT "course_sections_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_owner_id_accounts_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gists" ADD CONSTRAINT "gists_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_accounts" ADD CONSTRAINT "github_accounts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_accounts" ADD CONSTRAINT "google_accounts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_creator_id_accounts_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_question_attempts" ADD CONSTRAINT "quiz_question_attempts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_question_attempts" ADD CONSTRAINT "quiz_question_attempts_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_question_attempts" ADD CONSTRAINT "quiz_question_attempts_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_account_integrations_account_id" ON "account_integrations" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "ix_account_subscriptions_account_id" ON "account_subscriptions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "ix_account_subscriptions_status" ON "account_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "account_subscriptions_stripe_subscription_id_key" ON "account_subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ix_accounts_username" ON "accounts" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "ix_accounts_normalized_username" ON "accounts" USING btree ("normalized_username");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_email_key" ON "accounts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "ix_accounts_deleted" ON "accounts" USING btree ("deleted");--> statement-breakpoint
CREATE INDEX "ix_accounts_flagged_as_spammer" ON "accounts" USING btree ("flagged_as_spammer");--> statement-breakpoint
CREATE INDEX "ix_course_assignment_submissions_course_id" ON "course_assignment_submissions" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "ix_course_assignment_submissions_section_id" ON "course_assignment_submissions" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "ix_course_assignment_submissions_enrollee_id" ON "course_assignment_submissions" USING btree ("enrollee_id");--> statement-breakpoint
CREATE INDEX "ix_course_assignment_submissions_evaluator_id" ON "course_assignment_submissions" USING btree ("evaluator_id");--> statement-breakpoint
CREATE INDEX "ix_course_assignment_submissions_deleted" ON "course_assignment_submissions" USING btree ("deleted");--> statement-breakpoint
CREATE INDEX "ix_course_assignment_submissions_assignment_file_content_hash" ON "course_assignment_submissions" USING btree ("assignment_file_content_hash");--> statement-breakpoint
CREATE INDEX "ix_course_assignment_submissions_is_draft" ON "course_assignment_submissions" USING btree ("is_draft");--> statement-breakpoint
CREATE INDEX "ix_course_assignment_submissions_is_plagiarised" ON "course_assignment_submissions" USING btree ("is_plagiarised");--> statement-breakpoint
CREATE INDEX "ix_course_assignment_submissions_plagiarism_checked_at" ON "course_assignment_submissions" USING btree ("plagiarism_checked_at");--> statement-breakpoint
CREATE INDEX "ix_course_assignment_submissions_original_submission_id" ON "course_assignment_submissions" USING btree ("original_submission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_certificates_slug_key" ON "course_certificates" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ix_course_certificates_course_id" ON "course_certificates" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "ix_course_certificates_owner_id" ON "course_certificates" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_course_certificates_deleted" ON "course_certificates" USING btree ("deleted");--> statement-breakpoint
CREATE INDEX "ix_course_certificates_issued_at" ON "course_certificates" USING btree ("issued_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ix_course_certificates_course_id_owner_id" ON "course_certificates" USING btree ("course_id","owner_id");--> statement-breakpoint
CREATE INDEX "ix_course_enrollments_course_id" ON "course_enrollments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "ix_course_enrollments_enrollee_id" ON "course_enrollments" USING btree ("enrollee_id");--> statement-breakpoint
CREATE INDEX "ix_course_enrollments_deleted" ON "course_enrollments" USING btree ("deleted");--> statement-breakpoint
CREATE INDEX "ix_course_enrollments_certification_status" ON "course_enrollments" USING btree ("certification_status");--> statement-breakpoint
CREATE INDEX "ix_course_enrollments_payment_status" ON "course_enrollments" USING btree ("payment_status");--> statement-breakpoint
CREATE UNIQUE INDEX "ix_course_enrollments_course_id_enrollee_id" ON "course_enrollments" USING btree ("course_id","enrollee_id");--> statement-breakpoint
CREATE INDEX "ix_course_payments_payment_status" ON "course_payments" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "ix_course_payments_enrollee_id" ON "course_payments" USING btree ("enrollee_id");--> statement-breakpoint
CREATE INDEX "ix_course_payments_course_id" ON "course_payments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "ix_course_payments_currency" ON "course_payments" USING btree ("currency");--> statement-breakpoint
CREATE INDEX "ix_course_section_progress_section_id" ON "course_section_progress" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "ix_course_section_progress_enrollee_id" ON "course_section_progress" USING btree ("enrollee_id");--> statement-breakpoint
CREATE INDEX "ix_course_section_progress_reaction" ON "course_section_progress" USING btree ("reaction");--> statement-breakpoint
CREATE INDEX "ix_course_section_progress_deleted" ON "course_section_progress" USING btree ("deleted");--> statement-breakpoint
CREATE UNIQUE INDEX "ix_course_section_progress_section_id_enrollee_id" ON "course_section_progress" USING btree ("section_id","enrollee_id");--> statement-breakpoint
CREATE INDEX "ix_course_sections_course_id" ON "course_sections" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "ix_course_sections_legacy_slug" ON "course_sections" USING btree ("legacy_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "course_sections_short_slug_key" ON "course_sections" USING btree ("short_slug");--> statement-breakpoint
CREATE INDEX "ix_course_sections_deleted" ON "course_sections" USING btree ("deleted");--> statement-breakpoint
CREATE INDEX "ix_course_sections_is_optional" ON "course_sections" USING btree ("is_optional");--> statement-breakpoint
CREATE INDEX "ix_course_sections_require_questions" ON "course_sections" USING btree ("require_questions");--> statement-breakpoint
CREATE INDEX "ix_course_sections_disable_execution" ON "course_sections" USING btree ("disable_execution");--> statement-breakpoint
CREATE INDEX "ix_course_sections_allow_draft" ON "course_sections" USING btree ("allow_draft");--> statement-breakpoint
CREATE INDEX "ix_course_sections_visibility" ON "course_sections" USING btree ("visibility");--> statement-breakpoint
CREATE UNIQUE INDEX "ix_course_sections_course_id_slug" ON "course_sections" USING btree ("course_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "courses_name_key" ON "courses" USING btree ("name");--> statement-breakpoint
CREATE INDEX "ix_courses_owner_id" ON "courses" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_courses_published" ON "courses" USING btree ("published");--> statement-breakpoint
CREATE INDEX "ix_courses_slack_enabled" ON "courses" USING btree ("slack_enabled");--> statement-breakpoint
CREATE INDEX "ix_courses_show_right_sidebar" ON "courses" USING btree ("show_right_sidebar");--> statement-breakpoint
CREATE INDEX "ix_courses_show_left_sidebar" ON "courses" USING btree ("show_left_sidebar");--> statement-breakpoint
CREATE INDEX "ix_courses_show_jobs_board" ON "courses" USING btree ("show_jobs_board");--> statement-breakpoint
CREATE INDEX "ix_courses_visibility" ON "courses" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "ix_courses_level" ON "courses" USING btree ("level");--> statement-breakpoint
CREATE INDEX "ix_courses_deleted" ON "courses" USING btree ("deleted");--> statement-breakpoint
CREATE INDEX "ix_email_account_attempts_ip_address" ON "email_account_attempts" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "ix_email_account_attempts_email" ON "email_account_attempts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "ix_email_account_attempts_email_triggered" ON "email_account_attempts" USING btree ("email_triggered");--> statement-breakpoint
CREATE INDEX "ix_email_account_attempts_code_hash" ON "email_account_attempts" USING btree ("code_hash");--> statement-breakpoint
CREATE INDEX "ix_email_account_attempts_token_hash" ON "email_account_attempts" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "ix_email_account_attempts_state_token" ON "email_account_attempts" USING btree ("state_token");--> statement-breakpoint
CREATE INDEX "ix_gists_account_id" ON "gists" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gists_slug_key" ON "gists" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ix_gists_deleted" ON "gists" USING btree ("deleted");--> statement-breakpoint
CREATE INDEX "ix_gists_archive" ON "gists" USING btree ("archive");--> statement-breakpoint
CREATE INDEX "ix_gists_archived_at" ON "gists" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "ix_gists_title" ON "gists" USING btree ("title");--> statement-breakpoint
CREATE INDEX "ix_gists_legacy_title" ON "gists" USING btree ("legacy_title");--> statement-breakpoint
CREATE INDEX "ix_gists_google_drive_file_id" ON "gists" USING btree ("google_drive_file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ix_gists_account_id_title" ON "gists" USING btree ("account_id","title");--> statement-breakpoint
CREATE UNIQUE INDEX "github_accounts_github_id_key" ON "github_accounts" USING btree ("github_id");--> statement-breakpoint
CREATE UNIQUE INDEX "github_accounts_username_key" ON "github_accounts" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "github_accounts_normalized_username_key" ON "github_accounts" USING btree ("normalized_username");--> statement-breakpoint
CREATE INDEX "ix_github_accounts_account_id" ON "github_accounts" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "google_accounts_google_id_key" ON "google_accounts" USING btree ("google_id");--> statement-breakpoint
CREATE UNIQUE INDEX "google_accounts_email_key" ON "google_accounts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "ix_google_accounts_account_id" ON "google_accounts" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "ix_questions_title" ON "questions" USING btree ("title");--> statement-breakpoint
CREATE INDEX "ix_questions_creator_id" ON "questions" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "ix_quiz_question_attempts_account_id" ON "quiz_question_attempts" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "ix_quiz_question_attempts_quiz_id" ON "quiz_question_attempts" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "ix_quiz_question_attempts_question_id" ON "quiz_question_attempts" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "ix_quiz_questions_quiz_id" ON "quiz_questions" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "ix_quiz_questions_question_id" ON "quiz_questions" USING btree ("question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ix_quiz_questions_quiz_id_question_id" ON "quiz_questions" USING btree ("quiz_id","question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quizzes_url_slug_key" ON "quizzes" USING btree ("url_slug");--> statement-breakpoint
CREATE INDEX "ix_quizzes_sort_category" ON "quizzes" USING btree ("sort_category");--> statement-breakpoint
CREATE INDEX "ix_quizzes_start_date" ON "quizzes" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "ix_quizzes_end_date" ON "quizzes" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "ix_quizzes_visibility" ON "quizzes" USING btree ("visibility");