import { db } from "@/lib/db/client";
import { resumeVersions, resumes } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

/**
 * Service for managing resume version snapshots.
 * Enables time travel and undo/redo for resume edits.
 */
export const versionService = {
  /**
   * Create a version snapshot of a resume.
   */
  async createVersion(
    resumeId: string,
    data: Record<string, unknown>,
    templateId: string,
    options?: {
      threadId?: string;
      messageId?: string;
      changeDescription?: string;
      changedBy?: "user" | "ai" | "system";
    }
  ) {
    // Get current version number
    const [latest] = await db
      .select()
      .from(resumeVersions)
      .where(eq(resumeVersions.resumeId, resumeId))
      .orderBy(desc(resumeVersions.version))
      .limit(1);

    const version = (latest?.version || 0) + 1;

    const [newVersion] = await db
      .insert(resumeVersions)
      .values({
        resumeId,
        version,
        data,
        templateId,
        threadId: options?.threadId,
        messageId: options?.messageId,
        changeDescription: options?.changeDescription,
        changedBy: options?.changedBy || "user",
      })
      .returning();

    return newVersion;
  },

  /**
   * Get version history for a resume.
   */
  async getVersionHistory(resumeId: string, limit = 20) {
    return db
      .select()
      .from(resumeVersions)
      .where(eq(resumeVersions.resumeId, resumeId))
      .orderBy(desc(resumeVersions.version))
      .limit(limit);
  },

  /**
   * Get a specific version of a resume.
   */
  async getVersion(resumeId: string, version: number) {
    const [v] = await db
      .select()
      .from(resumeVersions)
      .where(
        and(
          eq(resumeVersions.resumeId, resumeId),
          eq(resumeVersions.version, version)
        )
      )
      .limit(1);
    return v;
  },

  /**
   * Get the latest version of a resume.
   */
  async getLatestVersion(resumeId: string) {
    const [latest] = await db
      .select()
      .from(resumeVersions)
      .where(eq(resumeVersions.resumeId, resumeId))
      .orderBy(desc(resumeVersions.version))
      .limit(1);
    return latest;
  },

  /**
   * Restore a resume to a specific version.
   * Creates a new version snapshot with the restored data.
   */
  async restoreToVersion(resumeId: string, version: number) {
    // Get the version to restore
    const targetVersion = await this.getVersion(resumeId, version);
    if (!targetVersion) {
      throw new Error(`Version ${version} not found for resume ${resumeId}`);
    }

    // Update the resume with the restored data
    const [updatedResume] = await db
      .update(resumes)
      .set({
        data: targetVersion.data,
        templateId: targetVersion.templateId,
        updatedAt: new Date(),
      })
      .where(eq(resumes.id, resumeId))
      .returning();

    // Create a new version snapshot for the restore action
    const newVersion = await this.createVersion(
      resumeId,
      targetVersion.data as Record<string, unknown>,
      targetVersion.templateId,
      {
        changeDescription: `Restored to version ${version}`,
        changedBy: "system",
      }
    );

    return { resume: updatedResume, version: newVersion };
  },

  /**
   * Get the count of versions for a resume.
   */
  async getVersionCount(resumeId: string) {
    const versions = await db
      .select()
      .from(resumeVersions)
      .where(eq(resumeVersions.resumeId, resumeId));
    return versions.length;
  },

  /**
   * Delete old versions, keeping only the most recent N versions.
   */
  async pruneVersions(resumeId: string, keepCount = 50) {
    const allVersions = await db
      .select()
      .from(resumeVersions)
      .where(eq(resumeVersions.resumeId, resumeId))
      .orderBy(desc(resumeVersions.version));

    if (allVersions.length <= keepCount) return 0;

    const versionsToDelete = allVersions.slice(keepCount);
    let deletedCount = 0;

    for (const v of versionsToDelete) {
      await db
        .delete(resumeVersions)
        .where(eq(resumeVersions.id, v.id));
      deletedCount++;
    }

    return deletedCount;
  },
};
