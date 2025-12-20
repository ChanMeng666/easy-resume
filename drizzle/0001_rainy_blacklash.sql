CREATE TABLE "copilot_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"tool_name" varchar(100),
	"tool_args" jsonb,
	"tool_result" jsonb,
	"agent_id" varchar(50),
	"sequence_num" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "copilot_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"resume_id" uuid,
	"title" varchar(255) DEFAULT 'New Conversation',
	"status" varchar(20) DEFAULT 'active',
	"agent_state" jsonb DEFAULT '{}'::jsonb,
	"last_agent_id" varchar(50),
	"message_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"last_message_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "resume_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resume_id" uuid NOT NULL,
	"thread_id" uuid,
	"version" integer NOT NULL,
	"data" jsonb NOT NULL,
	"template_id" varchar(50) NOT NULL,
	"change_description" text,
	"changed_by" varchar(20) DEFAULT 'user',
	"message_id" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "copilot_messages" ADD CONSTRAINT "copilot_messages_thread_id_copilot_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."copilot_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_threads" ADD CONSTRAINT "copilot_threads_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_thread_id_copilot_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."copilot_threads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_message_id_copilot_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."copilot_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_messages_thread_id" ON "copilot_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "idx_messages_sequence" ON "copilot_messages" USING btree ("thread_id","sequence_num");--> statement-breakpoint
CREATE INDEX "idx_threads_user_id" ON "copilot_threads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_threads_resume_id" ON "copilot_threads" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "idx_threads_status" ON "copilot_threads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_versions_resume_id" ON "resume_versions" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "idx_versions_version" ON "resume_versions" USING btree ("resume_id","version");