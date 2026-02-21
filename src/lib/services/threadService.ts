import { db } from "@/lib/db/client";
import { agentThreads, agentMessages, NewAgentMessage } from "@/lib/db/schema";
import { eq, desc, and, lte } from "drizzle-orm";

/**
 * Service for managing AI agent conversation threads.
 */
export const threadService = {
  /**
   * Create a new conversation thread.
   */
  async createThread(userId: string, resumeId?: string, title?: string) {
    const [thread] = await db
      .insert(agentThreads)
      .values({
        userId,
        resumeId,
        title: title || "New Conversation",
      })
      .returning();
    return thread;
  },

  /**
   * Get a user's conversation threads.
   */
  async getUserThreads(userId: string, limit = 10) {
    return db
      .select()
      .from(agentThreads)
      .where(eq(agentThreads.userId, userId))
      .orderBy(desc(agentThreads.updatedAt))
      .limit(limit);
  },

  /**
   * Get threads associated with a specific resume.
   */
  async getResumeThreads(resumeId: string, limit = 10) {
    return db
      .select()
      .from(agentThreads)
      .where(eq(agentThreads.resumeId, resumeId))
      .orderBy(desc(agentThreads.updatedAt))
      .limit(limit);
  },

  /**
   * Get a thread by ID.
   */
  async getThread(threadId: string) {
    const [thread] = await db
      .select()
      .from(agentThreads)
      .where(eq(agentThreads.id, threadId))
      .limit(1);
    return thread;
  },

  /**
   * Get a thread with all its messages.
   */
  async getThreadWithMessages(threadId: string) {
    const thread = await this.getThread(threadId);
    if (!thread) return null;

    const messages = await db
      .select()
      .from(agentMessages)
      .where(eq(agentMessages.threadId, threadId))
      .orderBy(agentMessages.sequenceNum);

    return { thread, messages };
  },

  /**
   * Add a message to a thread.
   */
  async addMessage(
    threadId: string,
    message: Omit<NewAgentMessage, "id" | "threadId" | "createdAt" | "sequenceNum">
  ) {
    const thread = await this.getThread(threadId);
    if (!thread) throw new Error("Thread not found");

    const sequenceNum = (thread.messageCount || 0) + 1;

    const [newMessage] = await db
      .insert(agentMessages)
      .values({
        threadId,
        sequenceNum,
        ...message,
      })
      .returning();

    await db
      .update(agentThreads)
      .set({
        messageCount: sequenceNum,
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agentThreads.id, threadId));

    return newMessage;
  },

  /**
   * Get messages up to a specific sequence number.
   */
  async getMessagesUpTo(threadId: string, sequenceNum: number) {
    return db
      .select()
      .from(agentMessages)
      .where(
        and(
          eq(agentMessages.threadId, threadId),
          lte(agentMessages.sequenceNum, sequenceNum)
        )
      )
      .orderBy(agentMessages.sequenceNum);
  },

  /**
   * Update thread status.
   */
  async updateThreadStatus(
    threadId: string,
    status: "active" | "completed" | "archived"
  ) {
    const [updated] = await db
      .update(agentThreads)
      .set({ status, updatedAt: new Date() })
      .where(eq(agentThreads.id, threadId))
      .returning();
    return updated;
  },

  /**
   * Update thread title.
   */
  async updateThreadTitle(threadId: string, title: string) {
    const [updated] = await db
      .update(agentThreads)
      .set({ title, updatedAt: new Date() })
      .where(eq(agentThreads.id, threadId))
      .returning();
    return updated;
  },

  /**
   * Delete a thread and all its messages (cascade).
   */
  async deleteThread(threadId: string) {
    await db.delete(agentThreads).where(eq(agentThreads.id, threadId));
  },
};
