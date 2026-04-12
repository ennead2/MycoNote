'use client';

import { useState, useRef } from 'react';
import { ArrowUp } from 'lucide-react';
import { UI_TEXT } from '@/constants/ui-text';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  disabledReason?: string;
}

export function ChatInput({ onSend, disabled = false, disabledReason }: ChatInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    // Drop focus so the on-screen keyboard hides after send, freeing screen space.
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-soil-surface px-3 py-2.5">
      {disabledReason && (
        <p className="text-xs text-amber-400 mb-2">{disabledReason}</p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={UI_TEXT.plan.inputPlaceholder}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-soil-surface border border-moss-primary rounded-2xl px-4 py-2 text-sm text-washi-cream placeholder-washi-dim resize-none focus:outline-none focus:ring-2 focus:ring-moss-light disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="w-9 h-9 rounded-full bg-moss-primary text-washi-cream flex items-center justify-center hover:bg-moss-light transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          aria-label="送信"
        >
          <ArrowUp size={18} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
