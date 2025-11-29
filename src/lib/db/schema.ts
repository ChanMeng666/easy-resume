import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";

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
 * Type inference for resume insert operations.
 */
export type NewResume = typeof resumes.$inferInsert;

/**
 * Type inference for resume select operations.
 */
export type Resume = typeof resumes.$inferSelect;
