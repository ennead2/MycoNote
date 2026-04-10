import { db } from './db';
import type { ChatSession } from '@/types/chat';

export async function addChatSession(session: ChatSession): Promise<void> {
  await db.chatSessions.add(session);
}

export async function getChatSession(id: string): Promise<ChatSession | undefined> {
  return db.chatSessions.get(id);
}

export async function getAllChatSessions(): Promise<ChatSession[]> {
  const sessions = await db.chatSessions.toArray();
  return sessions.sort((a, b) => {
    if (a.updated_at > b.updated_at) return -1;
    if (a.updated_at < b.updated_at) return 1;
    return 0;
  });
}

export async function updateChatSession(session: ChatSession): Promise<void> {
  await db.chatSessions.put(session);
}

export async function deleteChatSession(id: string): Promise<void> {
  await db.chatSessions.delete(id);
}
