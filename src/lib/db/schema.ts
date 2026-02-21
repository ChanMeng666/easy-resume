import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index, integer, real } from "drizzle-orm/pg-core";

/**
 * Resumes table schema.
 * Stores user resume data with JSON content and metadata.
 */
export const resumes = pgTable("resumes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  title: varchar("title", { length: 255 }).notNull().default("My Resume"),
  templateId: varchar("template_id", { length: 50 }).notNull().default("two-column"),
  data: jsonb("data").notNull(),
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
  data: jsonb("data").notNull(),
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
  parsed: jsonb("parsed").notNull(), // { title, company, location, skills[], keywords[], requirements[], etc. }
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
  data: jsonb("data").notNull(), // Full ResumeData tailored to the JD
  templateId: varchar("template_id", { length: 50 }).notNull().default("two-column"),
  matchScore: real("match_score"), // 0-100 score
  matchAnalysis: jsonb("match_analysis"), // { skillMatches, gaps, suggestions }
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
