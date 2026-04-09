'use client';

import { UI_TEXT } from '@/constants/ui-text';
import type { ChatMessage } from '@/types/chat';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`mb-3 ${isUser ? 'flex flex-col items-end' : ''}`}>
      <div className="text-[10px] text-forest-500 mb-1">
        {isUser ? UI_TEXT.plan.userLabel : `🤖 ${UI_TEXT.plan.assistantLabel}`}
      </div>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-forest-600 text-white rounded-tr-none'
            : 'bg-forest-800 text-forest-100 rounded-tl-none'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
