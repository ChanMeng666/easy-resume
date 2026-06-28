import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index, uniqueIndex, integer, real } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { ResumeData } from "@/lib/validation/schema";
import type { ParsedJD } from "@/lib/agent/jd-parser";
import type { MatchAnalysis } from "@/lib/agent/matching-engine";

/**
 * Resumes table schema.
 * Stores user resume data with JSON content and metadata.
 */
export const resumes = pgTable("resumes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  title: varchar("title", { length: 255 }).notNull().default("My Resume"),
  templateId: varchar("template_id", { length: 50 }).notNull().default("two-column"),
  data: jsonb("data").$type<ResumeData>().notNull(),
  isPublic: boolean("is_public").default(false),
  shareSlug: varchar("share_slug", { length: 20 }).unique(),
  pdfBlobUrl: text("pdf_blob_url"),
  pdfUpdatedAt: timestamp("pdf_updated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_resumes_user_id").on(table.userId),
  shareSlugIdx: index("idx_resumes_share_slug").on(table.shareSlug),
}));

/**
 * Agent conversation threads.
 * Stores AI chat history for resume editing sessions.
 */
export const agentThreads = pgTable("agent_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  resumeId: uuid("resume_id").references(() => resumes.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).default("New Conversation"),
  status: varchar("status", { length: 20 }).default("active"),
  messageCount: integer("message_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
}, (table) => ({
  userIdIdx: index("idx_agent_threads_user_id").on(table.userId),
  resumeIdIdx: index("idx_agent_threads_resume_id").on(table.resumeId),
}));

/**
 * Agent thread messages.
 * Stores conversation messages for the AI agent chat.
 */
export const agentMessages = pgTable("agent_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id").notNull().references(() => agentThreads.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  toolName: varchar("tool_name", { length: 100 }),
  toolArgs: jsonb("tool_args"),
  toolResult: jsonb("tool_result"),
  sequenceNum: integer("sequence_num").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  threadIdIdx: index("idx_agent_messages_thread_id").on(table.threadId),
  sequenceIdx: index("idx_agent_messages_sequence").on(table.threadId, table.sequenceNum),
}));

/**
 * Resume version snapshots.
 * Enables undo/redo for resume edits.
 */
export const resumeVersions = pgTable("resume_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  resumeId: uuid("resume_id").notNull().references(() => resumes.id, { onDelete: "cascade" }),
  threadId: uuid("thread_id").references(() => agentThreads.id, { onDelete: "set null" }),
  version: integer("version").notNull(),
  data: jsonb("data").$type<ResumeData>().notNull(),
  templateId: varchar("template_id", { length: 50 }).notNull(),
  changeDescription: text("change_description"),
  changedBy: varchar("changed_by", { length: 20 }).default("user"),
  messageId: uuid("message_id").references(() => agentMessages.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  resumeIdIdx: index("idx_versions_resume_id").on(table.resumeId),
  versionIdx: index("idx_versions_version").on(table.resumeId, table.version),
}));

/**
 * Parsed job descriptions.
 * Stores structured data extracted from job postings.
 */
export const jobDescriptions = pgTable("job_descriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  rawText: text("raw_text").notNull(),
  sourceUrl: text("source_url"),
  parsed: jsonb("parsed").$type<ParsedJD>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_jd_user_id").on(table.userId),
}));

/**
 * Tailored resume variants.
 * Job-specific resume versions with match analysis.
 */
export const tailoredResumes = pgTable("tailored_resumes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  baseResumeId: uuid("base_resume_id").notNull().references(() => resumes.id, { onDelete: "cascade" }),
  jobDescriptionId: uuid("job_description_id").notNull().references(() => jobDescriptions.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<ResumeData>().notNull(), // Full ResumeData tailored to the JD
  templateId: varchar("template_id", { length: 50 }).notNull().default("two-column"),
  matchScore: real("match_score"), // 0-100 score
  matchAnalysis: jsonb("match_analysis").$type<MatchAnalysis>(),
  coverLetter: text("cover_letter"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_tailored_user_id").on(table.userId),
  baseResumeIdx: index("idx_tailored_base_resume").on(table.baseResumeId),
  jdIdx: index("idx_tailored_jd").on(table.jobDescriptionId),
}));

/**
 * Job application tracker.
 * Tracks application status through the hiring pipeline.
 */
export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  jobDescriptionId: uuid("job_description_id").references(() => jobDescriptions.id, { onDelete: "set null" }),
  tailoredResumeId: uuid("tailored_resume_id").references(() => tailoredResumes.id, { onDelete: "set null" }),
  company: varchar("company", { length: 255 }).notNull(),
  position: varchar("position", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, applied, interview, offer, rejected
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_applications_user_id").on(table.userId),
  statusIdx: index("idx_applications_status").on(table.userId, table.status),
}));

/**
 * User credit balance and subscription info.
 */
export const credits = pgTable("credits", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique(),
  balance: integer("balance").notNull().default(3), // 3 free credits on signup
  subscriptionTier: varchar("subscription_tier", { length: 20 }).default("free"), // free, pro, unlimited
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_credits_user_id").on(table.userId),
  stripeCustomerIdx: index("idx_credits_stripe_customer").on(table.stripeCustomerId),
}));

/**
 * Credit transaction history.
 * Tracks credit purchases, usage, and refunds.
 */
export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // purchase, usage, refund, signup_bonus
  amount: integer("amount").notNull(), // positive for additions, negative for usage
  description: text("description"),
  referenceType: varchar("reference_type", { length: 50 }), // tailored_resume, cover_letter, ats_report
  referenceId: uuid("reference_id"),
  stripePaymentId: varchar("stripe_payment_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_credit_tx_user_id").on(table.userId),
  typeIdx: index("idx_credit_tx_type").on(table.userId, table.type),
  // Backs the idempotency lookup in creditService.useCreditsIdempotent:
  // a usage txn carrying the generation idempotencyKey as referenceId means
  // the result was already charged, so we must not deduct again.
  referenceIdx: index("idx_credit_tx_reference").on(table.referenceId),
  // Enforces idempotent billing at the DB level: at most one usage txn per
  // referenceId, so concurrent requests for the same generation can't double
  // charge. Partial (WHERE type='usage') so purchase/signup_bonus rows with a
  // NULL referenceId are unaffected.
  usageReferenceUk: uniqueIndex("uk_credit_tx_reference_usage")
    .on(table.referenceId)
    .where(sql`type = 'usage'`),
}));

// Resume types
export type NewResume = typeof resumes.$inferInsert;
export type Resume = typeof resumes.$inferSelect;

// Agent thread types
export type AgentThread = typeof agentThreads.$inferSelect;
export type NewAgentThread = typeof agentThreads.$inferInsert;

// Agent message types
export type AgentMessage = typeof agentMessages.$inferSelect;
export type NewAgentMessage = typeof agentMessages.$inferInsert;

// Resume version types
export type ResumeVersion = typeof resumeVersions.$inferSelect;
export type NewResumeVersion = typeof resumeVersions.$inferInsert;

// Job description types
export type JobDescription = typeof jobDescriptions.$inferSelect;
export type NewJobDescription = typeof jobDescriptions.$inferInsert;

// Tailored resume types
export type TailoredResume = typeof tailoredResumes.$inferSelect;
export type NewTailoredResume = typeof tailoredResumes.$inferInsert;

// Application types
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;

// Credit types
export type Credit = typeof credits.$inferSelect;
export type NewCredit = typeof credits.$inferInsert;

// Credit transaction types
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type NewCreditTransaction = typeof creditTransactions.$inferInsert;

/**
 * API keys for agent/server-to-server access ("the API is the UI").
 * Only the SHA-256 hash of the secret is stored; the raw token is shown once
 * at creation. Lookup is by `prefix`, then a constant-time hash comparison.
 */
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: varchar("name", { length: 120 }).notNull().default("default"),
  prefix: varchar("prefix", { length: 16 }).notNull(), // e.g. "vitex_ab12cd34"
  keyHash: text("key_hash").notNull(), // sha256(secret) hex; raw never stored
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_api_keys_user_id").on(table.userId),
  prefixIdx: index("idx_api_keys_prefix").on(table.prefix),
}));

/**
 * Asynchronous generation jobs for the public v1 API.
 * Agents POST to create a job, then poll until it succeeds/fails. The pipeline
 * runs in-process (one monolith — no external queue/microservice).
 */
export const generationJobs = pgTable("generation_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("queued"), // queued, running, succeeded, failed
  title: text("title"), // human-friendly label for the My Resumes list (derived at persist time)
  input: jsonb("input").$type<{
    jobDescription: string;
    background: string;
    templateId?: string;
    // Optional pre-parsed background (from a candidate_profile) — when present the
    // pipeline reuses it and skips the parse_background LLM step.
    baseResume?: ResumeData;
    // The candidate_profile that seeded this generation, if any.
    profileId?: string;
  }>().notNull(),
  result: jsonb("result").$type<Record<string, unknown>>(), // wire-shaped GenerateResult (no PDF bytes)
  error: jsonb("error").$type<Record<string, unknown>>(), // error envelope on failure
  pdfUrl: text("pdf_url"), // route serving the compiled PDF bytes
  profileId: uuid("profile_id"), // saved candidate_profile that seeded this generation (provenance)
  charged: boolean("charged").notNull().default(false),
  idempotencyKey: uuid("idempotency_key").notNull().unique(), // dedupes job + charge
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_generation_jobs_user_id").on(table.userId),
  statusIdx: index("idx_generation_jobs_status").on(table.status),
}));

/**
 * Fixed-window rate limit counters.
 * Lives in Postgres (always-on) instead of Redis so it can't be idle-deleted
 * and adds no extra infra dependency. Each row is one (key, time-bucket).
 */
export const rateLimits = pgTable("rate_limits", {
  bucketKey: varchar("bucket_key", { length: 255 }).primaryKey(), // `${key}:${bucket}`
  count: integer("count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => ({
  expiresIdx: index("idx_rate_limits_expires").on(table.expiresAt),
}));

/**
 * Processed Stripe webhook events.
 * Stripe retries webhooks, so we dedupe by event id to avoid double-crediting.
 */
export const stripeEvents = pgTable("stripe_events", {
  id: varchar("id", { length: 255 }).primaryKey(), // Stripe event id (evt_...)
  type: varchar("type", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/**
 * Persistent candidate background profiles ("enter once, reuse across JDs").
 *
 * The canonical source of truth for a user's reusable background — deliberately
 * a NEW minimal table, not a revival of the dormant `resumes` model (see ADR
 * 0001). `data` holds the parsed ResumeData (reused at generation time to skip
 * the parse_background LLM step); `rawBackground` keeps the original free text
 * so the profile can be re-parsed or edited later.
 */
export const candidateProfiles = pgTable("candidate_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  label: varchar("label", { length: 255 }).notNull().default("My Background"),
  data: jsonb("data").$type<ResumeData>().notNull(),
  rawBackground: text("raw_background").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_candidate_profiles_user_id").on(table.userId, table.updatedAt.desc()),
}));

// Candidate profile types
export type CandidateProfile = typeof candidateProfiles.$inferSelect;
export type NewCandidateProfile = typeof candidateProfiles.$inferInsert;

// API key types
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

// Generation job types
export type GenerationJob = typeof generationJobs.$inferSelect;
export type NewGenerationJob = typeof generationJobs.$inferInsert;
