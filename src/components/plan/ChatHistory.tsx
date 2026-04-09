'use client';

import { Button } from '@/components/ui/Button';
import { UI_TEXT } from '@/constants/ui-text';
import type { ChatSession } from '@/types/chat';

interface ChatHistoryListProps {
  sessions: ChatSession[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewSession: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月`;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')           // 見出し
    .replace(/\*\*(.+?)\*\*/g, '$1')     // 太字
    .replace(/\*(.+?)\*/g, '$1')         // 斜体
    .replace(/\|/g, ' ')                 // テーブル区切り
    .replace(/-{3,}/g, '')               // テーブル区切り線
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')  // リンク
    .replace(/\s{2,}/g, ' ')             // 連続空白
    .trim();
}

export function ChatHistoryList({ sessions, onSelect, onDelete, onNewSession }: ChatHistoryListProps) {
  return (
    <div className="px-4 py-4 space-y-3">
      {sessions.length === 0 && (
        <p className="text-center text-sm text-forest-500 py-8">{UI_TEXT.plan.noSessions}</p>
      )}

      {sessions.map((session) => {
        const lastMessage = session.messages[session.messages.length - 1];
        return (
          <div key={session.id} className="rounded-lg border border-forest-700 bg-forest-800 p-3">
            <button onClick={() => onSelect(session.id)} className="w-full text-left">
              <div className="flex items-start justify-between mb-1">
                <span className="font-bold text-sm text-forest-100">{session.title}</span>
                <span className="text-[10px] text-forest-500 shrink-0 ml-2">{formatDate(session.updated_at)}</span>
              </div>
              <div className="text-xs text-forest-400 mb-1">
                {session.context.location && `📍 ${session.context.location}`}
                {session.context.location && session.context.date && ' · '}
                {session.context.date && `📅 ${session.context.date.slice(5, 7)}月`}
              </div>
              {lastMessage && (
                <p className="text-xs text-forest-300 truncate">{stripMarkdown(lastMessage.content)}</p>
              )}
            </button>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-forest-500">
                💬 {session.messages.length} {UI_TEXT.plan.messageCount}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(UI_TEXT.plan.deleteSession)) onDelete(session.id);
                }}
                className="text-lg text-red-800 hover:text-red-500"
                aria-label={`${session.title} を削除`}
              >
                🗑
              </button>
            </div>
          </div>
        );
      })}

      <Button variant="primary" size="lg" onClick={onNewSession} className="w-full">
        + {UI_TEXT.plan.newSession}
      </Button>
    </div>
  );
}
