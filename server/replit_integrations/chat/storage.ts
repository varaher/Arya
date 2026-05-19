import { db } from "../../db";
import { conversations, messages } from "@shared/schema";
import { eq, desc, isNull, and } from "drizzle-orm";

export interface IChatStorage {
  getConversation(id: number): Promise<typeof conversations.$inferSelect | undefined>;
  getAllConversations(userId?: string | null): Promise<(typeof conversations.$inferSelect)[]>;
  createConversation(title: string, userId?: string | null): Promise<typeof conversations.$inferSelect>;
  updateConversationTitle(id: number, title: string): Promise<void>;
  deleteConversation(id: number, userId?: string | null): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<(typeof messages.$inferSelect)[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<typeof messages.$inferSelect>;
}

export const chatStorage: IChatStorage = {
  async getConversation(id: number) {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  },

  async getAllConversations(userId?: string | null) {
    if (userId) {
      return db.select().from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.createdAt));
    }
    // Anonymous: return nothing (no cross-user leakage)
    return [];
  },

  async createConversation(title: string, userId?: string | null) {
    const [conversation] = await db.insert(conversations)
      .values({ title, userId: userId || null })
      .returning();
    return conversation;
  },

  async updateConversationTitle(id: number, title: string) {
    await db.update(conversations).set({ title }).where(eq(conversations.id, id));
  },

  async deleteConversation(id: number, userId?: string | null) {
    // Only delete if it belongs to this user (or no user scoping for anonymous)
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!conv) return;
    if (userId && conv.userId && conv.userId !== userId) return; // not owner
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  },

  async getMessagesByConversation(conversationId: number) {
    return db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  },

  async createMessage(conversationId: number, role: string, content: string) {
    const [message] = await db.insert(messages).values({ conversationId, role, content }).returning();
    return message;
  },
};
