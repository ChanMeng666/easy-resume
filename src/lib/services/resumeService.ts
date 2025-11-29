import { db } from "@/lib/db/client";
import { resumes, type NewResume, type Resume } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Resume service for CRUD operations.
 * All operations require a userId for data isolation.
 */
export const resumeService = {
  /**
   * Get all resumes for a user.
   */
  async getAll(userId: string): Promise<Resume[]> {
    return db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, userId))
      .orderBy(desc(resumes.updatedAt));
  },

  /**
   * Get a single resume by ID.
   * Returns null if not found or not owned by user.
   */
  async getById(id: string, userId: string): Promise<Resume | null> {
    const result = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
      .limit(1);
    return result[0] ?? null;
  },

  /**
   * Get a resume by share slug (for public viewing).
   */
  async getByShareSlug(slug: string): Promise<Resume | null> {
    const result = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.shareSlug, slug), eq(resumes.isPublic, true)))
      .limit(1);
    return result[0] ?? null;
  },

  /**
   * Create a new resume.
   */
  async create(data: Omit<NewResume, "id" | "createdAt" | "updatedAt">): Promise<Resume> {
    const result = await db.insert(resumes).values(data).returning();
    return result[0];
  },

  /**
   * Update an existing resume.
   */
  async update(
    id: string,
    userId: string,
    data: Partial<Omit<NewResume, "id" | "userId" | "createdAt">>
  ): Promise<Resume | null> {
    const result = await db
      .update(resumes)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
      .returning();
    return result[0] ?? null;
  },

  /**
   * Delete a resume.
   */
  async delete(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(resumes)
      .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
      .returning();
    return result.length > 0;
  },

  /**
   * Generate a unique share slug for a resume.
   */
  async generateShareSlug(id: string, userId: string): Promise<string | null> {
    const slug = nanoid(10);
    const result = await db
      .update(resumes)
      .set({ shareSlug: slug, isPublic: true, updatedAt: new Date() })
      .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
      .returning();
    return result[0]?.shareSlug ?? null;
  },

  /**
   * Remove share slug and make resume private.
   */
  async removeShareSlug(id: string, userId: string): Promise<boolean> {
    const result = await db
      .update(resumes)
      .set({ shareSlug: null, isPublic: false, updatedAt: new Date() })
      .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
      .returning();
    return result.length > 0;
  },
};
