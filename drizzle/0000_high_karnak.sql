CREATE TABLE "resumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" varchar(255) DEFAULT 'My Resume' NOT NULL,
	"template_id" varchar(50) DEFAULT 'two-column' NOT NULL,
	"data" jsonb NOT NULL,
	"is_public" boolean DEFAULT false,
	"share_slug" varchar(20),
	"pdf_blob_url" text,
	"pdf_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "resumes_share_slug_unique" UNIQUE("share_slug")
);
--> statement-breakpoint
CREATE INDEX "idx_resumes_user_id" ON "resumes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_resumes_share_slug" ON "resumes" USING btree ("share_slug");