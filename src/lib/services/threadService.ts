import { db } from "@/lib/db/client";
import { copilotThreads, copilotMessages, NewCopilotMessage } from "@/lib/db/schema";
import { eq, desc, and, lte } from "drizzle-orm";

/**
 * Service for managing CopilotKit conversation threads.
 * Supports thread persistence and time travel features (v1.50).
 */
export const threadService = {
  /**
   * Create a new conversation thread.
   */
  async createThread(userId: string, resumeId?: string, title?: string) {
    const [thread] = await db
      .insert(copilotThreads)
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
      .from(copilotThreads)
      .where(eq(copilotThreads.userId, userId))
      .orderBy(desc(copilotThreads.updatedAt))
      .limit(limit);
  },

  /**
   * Get threads associated with a specific resume.
   */
  async getResumeThreads(resumeId: string, limit = 10) {
    return db
      .select()
      .from(copilotThreads)
      .where(eq(copilotThreads.resumeId, resumeId))
      .orderBy(desc(copilotThreads.updatedAt))
      .limit(limit);
  },

  /**
   * Get a thread by ID.
   */
  async getThread(threadId: string) {
    const [thread] = await db
      .select()
      .from(copilotThreads)
      .where(eq(copilotThreads.id, threadId))
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
      .from(copilotMessages)
      .where(eq(copilotMessages.threadId, threadId))
      .orderBy(copilotMessages.sequenceNum);

    return { thread, messages };
  },

  /**
   * Add a message to a thread.
   */
  async addMessage(
    threadId: string,
    message: Omit<NewCopilotMessage, "id" | "threadId" | "createdAt" | "sequenceNum">
  ) {
    // Get current message count for sequence number
    const thread = await this.getThread(threadId);
    if (!thread) throw new Error("Thread not found");

    const sequenceNum = (thread.messageCount || 0) + 1;

    // Insert message
    const [newMessage] = await db
      .insert(copilotMessages)
      .values({
        threadId,
        sequenceNum,
        ...message,
      })
      .returning();

    // Update thread metadata
    await db
      .update(copilotThreads)
      .set({
        messageCount: sequenceNum,
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(copilotThreads.id, threadId));

    return newMessage;
  },

  /**
   * Get messages up to a specific sequence number (for time travel).
   */
  async getMessagesUpTo(threadId: string, sequenceNum: number) {
    return db
      .select()
      .from(copilotMessages)
      .where(
        and(
          eq(copilotMessages.threadId, threadId),
          lte(copilotMessages.sequenceNum, sequenceNum)
        )
      )
      .orderBy(copilotMessages.sequenceNum);
  },

  /**
   * Update thread status.
   */
  async updateThreadStatus(
    threadId: string,
    status: "active" | "completed" | "archived"
  ) {
    const [updated] = await db
      .update(copilotThreads)
      .set({ status, updatedAt: new Date() })
      .where(eq(copilotThreads.id, threadId))
      .returning();
    return updated;
  },

  /**
   * Update thread title.
   */
  async updateThreadTitle(threadId: string, title: string) {
    const [updated] = await db
      .update(copilotThreads)
      .set({ title, updatedAt: new Date() })
      .where(eq(copilotThreads.id, threadId))
      .returning();
    return updated;
  },

  /**
   * Update agent state for multi-agent coordination.
   */
  async updateAgentState(
    threadId: string,
    agentState: Record<string, unknown>,
    lastAgentId?: string
  ) {
    const [updated] = await db
      .update(copilotThreads)
      .set({
        agentState,
        lastAgentId,
        updatedAt: new Date(),
      })
      .where(eq(copilotThreads.id, threadId))
      .returning();
    return updated;
  },

  /**
   * Delete a thread and all its messages (cascade).
   */
  async deleteThread(threadId: string) {
    await db.delete(copilotThreads).where(eq(copilotThreads.id, threadId));
  },
};
