'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { useApp } from '@/contexts/AppContext';
import { useRecords } from '@/contexts/RecordsContext';
import { streamPlanChat } from '@/lib/claude';
import {
  addChatSession,
  getChatSession,
  getAllChatSessions,
  updateChatSession,
  deleteChatSession,
} from '@/lib/db-chat';
import { PlanForm } from '@/components/plan/PlanForm';
import { ChatMessageBubble } from '@/components/plan/ChatMessage';
import { ChatInput } from '@/components/plan/ChatInput';
import { ChatHistoryList } from '@/components/plan/ChatHistory';
import { UI_TEXT } from '@/constants/ui-text';
import type { ChatSession, ChatMessage, PlanContext } from '@/types/chat';

type View = 'form' | 'chat' | 'history';

function generateTitle(context: PlanContext): string {
  const location = context.location ?? '';
  const date = context.date ?? '';
  if (location && date) return `${location} ${date}`;
  if (location) return `${location} の採取計画`;
  if (date) return `採取計画 ${date}`;
  const now = new Date();
  return `採取計画 ${now.getMonth() + 1}/${now.getDate()}`;
}

export default function PlanPage() {
  const { state } = useApp();
  const { records } = useRecords();
  const hasApiKey = !!state.apiKey;
  const isOnline = state.isOnline;

  const [view, setView] = useState<View>('form');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAllChatSessions().then(setSessions);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages, streamingText]);

  const buildRecordsSummary = useCallback((): string => {
    if (records.length === 0) return '採取記録なし';
    const recent = records.slice(0, 5);
    return recent.map((r) => {
      const name = r.mushroom_name_ja ?? '不明';
      const date = new Date(r.observed_at).toLocaleDateString('ja-JP');
      const loc = r.location.description ?? '';
      return `${date}: ${name}${loc ? ` (${loc})` : ''}`;
    }).join('\n');
  }, [records]);

  const buildInitialMessage = (context: PlanContext): string => {
    const parts: string[] = [];
    if (context.date) parts.push(`予定日: ${context.date}`);
    if (context.location) parts.push(`場所: ${context.location}`);
    if (context.targetSpecies?.length) parts.push(`探したいキノコ: ${context.targetSpecies.join(', ')}`);
    if (parts.length === 0) return '採取計画について相談したいです。アドバイスをお願いします。';
    return `以下の条件で採取計画を立てたいです。アドバイスをお願いします。\n\n${parts.join('\n')}`;
  };

  const handleFormSubmit = async (context: PlanContext) => {
    const fullContext: PlanContext = { ...context, recordsSummary: buildRecordsSummary() };
    const initialUserMessage: ChatMessage = { role: 'user', content: buildInitialMessage(context) };
    const session: ChatSession = {
      id: crypto.randomUUID(),
      title: generateTitle(context),
      messages: [initialUserMessage],
      context: fullContext,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await addChatSession(session);
    setCurrentSession(session);
    setSessions((prev) => [session, ...prev]);
    setView('chat');

    // AIの初回応答を自動送信
    setIsSending(true);
    setStreamingText('');
    try {
      let fullResponse = '';
      await streamPlanChat({
        apiKey: state.apiKey!,
        messages: [initialUserMessage],
        context: fullContext,
        onChunk: (chunk) => {
          fullResponse += chunk;
          setStreamingText(fullResponse);
        },
      });

      const assistantMessage: ChatMessage = { role: 'assistant', content: fullResponse };
      const finalSession: ChatSession = {
        ...session,
        messages: [initialUserMessage, assistantMessage],
        updated_at: new Date().toISOString(),
      };
      setCurrentSession(finalSession);
      await updateChatSession(finalSession);
      setSessions((prev) => prev.map((s) => (s.id === finalSession.id ? finalSession : s)));
    } catch (e) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `⚠ ${e instanceof Error ? e.message : UI_TEXT.common.error}`,
      };
      const errorSession: ChatSession = {
        ...session,
        messages: [initialUserMessage, errorMessage],
        updated_at: new Date().toISOString(),
      };
      setCurrentSession(errorSession);
      await updateChatSession(errorSession);
    } finally {
      setIsSending(false);
      setStreamingText('');
    }
  };

  const handleSend = async (text: string) => {
    if (!currentSession || !state.apiKey || isSending) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...currentSession.messages, userMessage];
    const updatedSession: ChatSession = {
      ...currentSession,
      messages: updatedMessages,
      updated_at: new Date().toISOString(),
    };
    setCurrentSession(updatedSession);
    await updateChatSession(updatedSession);

    setIsSending(true);
    setStreamingText('');

    try {
      let fullResponse = '';
      await streamPlanChat({
        apiKey: state.apiKey,
        messages: updatedMessages,
        context: currentSession.context,
        onChunk: (chunk) => {
          fullResponse += chunk;
          setStreamingText(fullResponse);
        },
      });

      const assistantMessage: ChatMessage = { role: 'assistant', content: fullResponse };
      const finalSession: ChatSession = {
        ...updatedSession,
        messages: [...updatedMessages, assistantMessage],
        updated_at: new Date().toISOString(),
      };
      setCurrentSession(finalSession);
      await updateChatSession(finalSession);
      setSessions((prev) => prev.map((s) => (s.id === finalSession.id ? finalSession : s)));
    } catch (e) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `⚠ ${e instanceof Error ? e.message : UI_TEXT.common.error}`,
      };
      const errorSession: ChatSession = {
        ...updatedSession,
        messages: [...updatedMessages, errorMessage],
        updated_at: new Date().toISOString(),
      };
      setCurrentSession(errorSession);
      await updateChatSession(errorSession);
    } finally {
      setIsSending(false);
      setStreamingText('');
    }
  };

  const handleSelectSession = async (id: string) => {
    const session = await getChatSession(id);
    if (session) {
      setCurrentSession(session);
      setView('chat');
    }
  };

  const handleDeleteSession = async (id: string) => {
    await deleteChatSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (currentSession?.id === id) {
      setCurrentSession(null);
      setView('form');
    }
  };

  if (!state.isHydrated) {
    return null;
  }

  if (!hasApiKey) {
    return (
      <div>
        <PageHeader title={UI_TEXT.plan.title} />
        <div className="flex flex-col items-center justify-center px-4 py-16">
          <span className="mb-4 text-5xl">🗺</span>
          <p className="text-center text-forest-400 text-sm mb-4">{UI_TEXT.plan.setupApiKey}</p>
          <a href="/settings" className="text-forest-300 underline text-sm">{UI_TEXT.identify.goToSettings}</a>
        </div>
      </div>
    );
  }

  if (view === 'history') {
    return (
      <div>
        <PageHeader title={UI_TEXT.plan.historyTitle} showBack />
        <ChatHistoryList
          sessions={sessions}
          onSelect={handleSelectSession}
          onDelete={handleDeleteSession}
          onNewSession={() => setView('form')}
        />
      </div>
    );
  }

  if (view === 'chat' && currentSession) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="sticky top-0 z-40 bg-forest-900 border-b border-forest-700">
          <div className="max-w-lg mx-auto flex items-center h-14 px-4 gap-3">
            <button
              onClick={() => setView('form')}
              className="text-forest-300 text-xl leading-none p-1 -ml-1 hover:text-forest-100"
              aria-label={UI_TEXT.common.back}
            >
              ←
            </button>
            <h1 className="text-lg font-bold text-forest-100 flex-1">{UI_TEXT.plan.title}</h1>
            <span className="text-[10px] text-forest-500">
              {currentSession.context.date && currentSession.context.date}
              {currentSession.context.date && currentSession.context.location && ' '}
              {currentSession.context.location && currentSession.context.location}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {currentSession.messages.map((msg, i) => (
            <ChatMessageBubble key={i} message={msg} />
          ))}
          {streamingText && (
            <ChatMessageBubble message={{ role: 'assistant', content: streamingText }} />
          )}
          <div ref={messagesEndRef} />
        </div>

        <ChatInput
          onSend={handleSend}
          disabled={isSending || !isOnline}
          disabledReason={!isOnline ? UI_TEXT.plan.offlineSendDisabled : undefined}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-40 bg-forest-900 border-b border-forest-700">
        <div className="max-w-lg mx-auto flex items-center h-14 px-4 gap-3">
          <h1 className="text-lg font-bold text-forest-100 flex-1">{UI_TEXT.plan.title}</h1>
          <button
            onClick={() => setView('history')}
            className="text-xs text-forest-400 bg-forest-800 px-2.5 py-1 rounded hover:bg-forest-700"
          >
            📋 {UI_TEXT.plan.historyButton}
          </button>
        </div>
      </div>
      <PlanForm onSubmit={handleFormSubmit} />
    </div>
  );
}
