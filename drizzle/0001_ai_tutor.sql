CREATE TABLE "ai_tutor_conversations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"account_id" bigint NOT NULL,
	"course_id" bigint NOT NULL,
	"title" text,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"cost_micros" bigint DEFAULT 0 NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_tutor_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"conversation_id" bigint NOT NULL,
	"role" varchar(16) NOT NULL,
	"parts" jsonb NOT NULL,
	"section_id" bigint,
	"status" varchar(16),
	"model" text,
	"plan" varchar(16),
	"reasoning_effort" varchar(16),
	"input_tokens" integer,
	"cached_input_tokens" integer,
	"output_tokens" integer,
	"reasoning_tokens" integer,
	"cost_micros" bigint DEFAULT 0 NOT NULL,
	"usage_estimated" boolean DEFAULT false NOT NULL,
	"error" text,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "ai_tutor_usage_windows" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"account_id" bigint NOT NULL,
	"kind" varchar(16) NOT NULL,
	"started_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"spent_micros" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_tutor_conversations" ADD CONSTRAINT "ai_tutor_conversations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tutor_conversations" ADD CONSTRAINT "ai_tutor_conversations_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tutor_messages" ADD CONSTRAINT "ai_tutor_messages_conversation_id_ai_tutor_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_tutor_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tutor_usage_windows" ADD CONSTRAINT "ai_tutor_usage_windows_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_ai_tutor_conversations_account_id_course_id" ON "ai_tutor_conversations" USING btree ("account_id","course_id","last_message_at");--> statement-breakpoint
CREATE INDEX "ix_ai_tutor_conversations_course_id" ON "ai_tutor_conversations" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "ix_ai_tutor_conversations_last_message_at" ON "ai_tutor_conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "ix_ai_tutor_messages_conversation_id" ON "ai_tutor_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "ix_ai_tutor_messages_created_at" ON "ai_tutor_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ix_ai_tutor_usage_windows_account_id_ends_at" ON "ai_tutor_usage_windows" USING btree ("account_id","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ix_ai_tutor_usage_windows_account_id_kind_started_at" ON "ai_tutor_usage_windows" USING btree ("account_id","kind","started_at");