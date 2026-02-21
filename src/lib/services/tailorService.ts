import { getDb } from "@/lib/db/client";
import { tailoredResumes, NewTailoredResume } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

/**
 * Service for managing tailored resume variants.
 */
export const tailorService = {
  /** Create a new tailored resume. */
  async create(data: Omit<NewTailoredResume, "id" | "createdAt" | "updatedAt">) {
    const db = getDb();
    const [tailored] = await db.insert(tailoredResumes).values(data).returning();
    return tailored;
  },

  /** Get all tailored resumes for a user. */
  async getByUser(userId: string) {
    const db = getDb();
    return db
      .select()
      .from(tailoredResumes)
      .where(eq(tailoredResumes.userId, userId))
      .orderBy(desc(tailoredResumes.createdAt));
  },

  /** Get a single tailored resume by ID. */
  async getById(id: string) {
    const db = getDb();
    const [tailored] = await db
      .select()
      .from(tailoredResumes)
      .where(eq(tailoredResumes.id, id))
      .limit(1);
    return tailored;
  },

  /** Update a tailored resume. */
  async update(id: string, userId: string, data: Partial<NewTailoredResume>) {
    const db = getDb();
    const [updated] = await db
      .update(tailoredResumes)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(tailoredResumes.id, id), eq(tailoredResumes.userId, userId)))
      .returning();
    return updated;
  },

  /** Delete a tailored resume. */
  async delete(id: string, userId: string) {
    const db = getDb();
    await db
      .delete(tailoredResumes)
      .where(and(eq(tailoredResumes.id, id), eq(tailoredResumes.userId, userId)));
  },

  /** Get tailored resumes for a specific base resume. */
  async getByBaseResume(baseResumeId: string) {
    const db = getDb();
    return db
      .select()
      .from(tailoredResumes)
      .where(eq(tailoredResumes.baseResumeId, baseResumeId))
      .orderBy(desc(tailoredResumes.createdAt));
  },
};
