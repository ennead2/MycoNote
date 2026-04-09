// src/components/plan/ChatHistory.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatHistoryList } from './ChatHistory';
import type { ChatSession } from '@/types/chat';

const mockSessions: ChatSession[] = [
  {
    id: '1', title: '高尾山 春の採取計画',
    messages: [{ role: 'user', content: '6号路で' }, { role: 'assistant', content: 'いいですね' }],
    context: { currentMonth: 4, recordsSummary: '', location: '高尾山', date: '2026-04-12' },
    created_at: '2026-04-09T10:00:00Z', updated_at: '2026-04-09T12:00:00Z',
  },
  {
    id: '2', title: '奥多摩 キノコ狩り',
    messages: [{ role: 'user', content: 'マイタケを探したい' }],
    context: { currentMonth: 4, recordsSummary: '', location: '奥多摩' },
    created_at: '2026-03-28T10:00:00Z', updated_at: '2026-03-28T12:00:00Z',
  },
];

describe('ChatHistoryList', () => {
  it('renders all sessions', () => {
    render(<ChatHistoryList sessions={mockSessions} onSelect={vi.fn()} onDelete={vi.fn()} onNewSession={vi.fn()} />);
    expect(screen.getByText('高尾山 春の採取計画')).toBeInTheDocument();
    expect(screen.getByText('奥多摩 キノコ狩り')).toBeInTheDocument();
  });

  it('shows message count', () => {
    render(<ChatHistoryList sessions={mockSessions} onSelect={vi.fn()} onDelete={vi.fn()} onNewSession={vi.fn()} />);
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  it('calls onSelect when session is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ChatHistoryList sessions={mockSessions} onSelect={onSelect} onDelete={vi.fn()} onNewSession={vi.fn()} />);
    await user.click(screen.getByText('高尾山 春の採取計画'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });

  it('shows empty message when no sessions', () => {
    render(<ChatHistoryList sessions={[]} onSelect={vi.fn()} onDelete={vi.fn()} onNewSession={vi.fn()} />);
    expect(screen.getByText(/チャット履歴がありません/)).toBeInTheDocument();
  });

  it('renders new session button', () => {
    render(<ChatHistoryList sessions={[]} onSelect={vi.fn()} onDelete={vi.fn()} onNewSession={vi.fn()} />);
    expect(screen.getByRole('button', { name: /新しい計画を作成/ })).toBeInTheDocument();
  });
});
