import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index, integer } from "drizzle-orm/pg-core";

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
 * Copilot AI conversation threads.
 * Enables resumable conversations across sessions (CopilotKit v1.50 Thread Persistence).
 */
export const copilotThreads = pgTable("copilot_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Link to user and optionally to a specific resume
  userId: text("user_id").notNull(),
  resumeId: uuid("resume_id").references(() => resumes.id, { onDelete: "cascade" }),
  
  // Thread metadata
  title: varchar("title", { length: 255 }).default("New Conversation"),
  status: varchar("status", { length: 20 }).default("active"), // active, completed, archived
  
  // Agent state (for multi-agent coordination)
  agentState: jsonb("agent_state").default({}),
  
  // Last agent used (for multi-agent system)
  lastAgentId: varchar("last_agent_id", { length: 50 }),
  
  // Message count for quick stats
  messageCount: integer("message_count").default(0),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
}, (table) => ({
  userIdIdx: index("idx_threads_user_id").on(table.userId),
  resumeIdIdx: index("idx_threads_resume_id").on(table.resumeId),
  statusIdx: index("idx_threads_status").on(table.status),
}));

/**
 * Copilot thread messages.
 * Stores conversation history for time travel and replay.
 */
export const copilotMessages = pgTable("copilot_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Link to thread
  threadId: uuid("thread_id").notNull().references(() => copilotThreads.id, { onDelete: "cascade" }),
  
  // Message content
  role: varchar("role", { length: 20 }).notNull(), // user, assistant, system, tool
  content: text("content").notNull(),
  
  // For tool calls/results
  toolName: varchar("tool_name", { length: 100 }),
  toolArgs: jsonb("tool_args"),
  toolResult: jsonb("tool_result"),
  
  // Agent that sent this message (for multi-agent)
  agentId: varchar("agent_id", { length: 50 }),
  
  // Sequence number for ordering and time travel
  sequenceNum: integer("sequence_num").notNull(),
  
  // Timestamp
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  threadIdIdx: index("idx_messages_thread_id").on(table.threadId),
  sequenceIdx: index("idx_messages_sequence").on(table.threadId, table.sequenceNum),
}));

/**
 * Resume version snapshots.
 * Enables time travel and undo/redo for resume edits.
 */
export const resumeVersions = pgTable("resume_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Link to resume and thread
  resumeId: uuid("resume_id").notNull().references(() => resumes.id, { onDelete: "cascade" }),
  threadId: uuid("thread_id").references(() => copilotThreads.id, { onDelete: "set null" }),
  
  // Version number for ordering
  version: integer("version").notNull(),
  
  // Snapshot of resume data at this point
  data: jsonb("data").notNull(),
  templateId: varchar("template_id", { length: 50 }).notNull(),
  
  // What changed (for display in history)
  changeDescription: text("change_description"),
  changedBy: varchar("changed_by", { length: 20 }).default("user"), // user, ai, system
  
  // Link to the message that triggered this change
  messageId: uuid("message_id").references(() => copilotMessages.id, { onDelete: "set null" }),
  
  // Timestamp
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  resumeIdIdx: index("idx_versions_resume_id").on(table.resumeId),
  versionIdx: index("idx_versions_version").on(table.resumeId, table.version),
}));

// Resume types
export type NewResume = typeof resumes.$inferInsert;
export type Resume = typeof resumes.$inferSelect;

// Copilot thread types
export type CopilotThread = typeof copilotThreads.$inferSelect;
export type NewCopilotThread = typeof copilotThreads.$inferInsert;

// Copilot message types
export type CopilotMessage = typeof copilotMessages.$inferSelect;
export type NewCopilotMessage = typeof copilotMessages.$inferInsert;

// Resume version types
export type ResumeVersion = typeof resumeVersions.$inferSelect;
export type NewResumeVersion = typeof resumeVersions.$inferInsert;
