import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import {
  addChatSession,
  getChatSession,
  getAllChatSessions,
  updateChatSession,
  deleteChatSession,
} from './db-chat';
import type { ChatSession, PlanContext } from '@/types/chat';

const createTestContext = (): PlanContext => ({
  date: '2026-04-12',
  location: '高尾山',
  currentMonth: 4,
  recordsSummary: 'なし',
});

const createTestSession = (overrides?: Partial<ChatSession>): ChatSession => ({
  id: crypto.randomUUID(),
  title: '高尾山 春の採取計画',
  messages: [],
  context: createTestContext(),
  created_at: '2026-04-09T10:00:00Z',
  updated_at: '2026-04-09T10:00:00Z',
  ...overrides,
});

describe('db-chat', () => {
  beforeEach(async () => {
    await db.chatSessions.clear();
  });

  it('adds and retrieves a chat session', async () => {
    const session = createTestSession();
    await addChatSession(session);
    const retrieved = await getChatSession(session.id);
    expect(retrieved).toEqual(session);
  });

  it('returns undefined for nonexistent session', async () => {
    const result = await getChatSession('nonexistent');
    expect(result).toBeUndefined();
  });

  it('retrieves all sessions sorted by updated_at descending', async () => {
    const s1 = createTestSession({ updated_at: '2026-04-01T00:00:00Z' });
    const s2 = createTestSession({ updated_at: '2026-04-03T00:00:00Z' });
    const s3 = createTestSession({ updated_at: '2026-04-02T00:00:00Z' });
    await addChatSession(s1);
    await addChatSession(s2);
    await addChatSession(s3);
    const all = await getAllChatSessions();
    expect(all[0].updated_at).toBe('2026-04-03T00:00:00Z');
    expect(all[1].updated_at).toBe('2026-04-02T00:00:00Z');
    expect(all[2].updated_at).toBe('2026-04-01T00:00:00Z');
  });

  it('updates a chat session', async () => {
    const session = createTestSession();
    await addChatSession(session);
    const updated: ChatSession = {
      ...session,
      messages: [{ role: 'user', content: 'テスト' }],
      updated_at: '2026-04-09T12:00:00Z',
    };
    await updateChatSession(updated);
    const retrieved = await getChatSession(session.id);
    expect(retrieved?.messages).toHaveLength(1);
    expect(retrieved?.messages[0].content).toBe('テスト');
  });

  it('deletes a chat session', async () => {
    const session = createTestSession();
    await addChatSession(session);
    await deleteChatSession(session.id);
    const retrieved = await getChatSession(session.id);
    expect(retrieved).toBeUndefined();
  });
});
