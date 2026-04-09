'use client';

import ReactMarkdown from 'react-markdown';
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
        className={`max-w-[85%] rounded-xl px-3 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-forest-600 text-white rounded-tr-none whitespace-pre-wrap'
            : 'bg-forest-800 text-forest-100 rounded-tl-none'
        }`}
      >
        {isUser ? (
          message.content
        ) : (
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className="text-base font-bold mb-1 mt-2 first:mt-0">{children}</h1>,
              h2: ({ children }) => <h2 className="text-sm font-bold mb-1 mt-2 first:mt-0">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-1.5 first:mt-0">{children}</h3>,
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2 last:mb-0 space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 last:mb-0 space-y-0.5">{children}</ol>,
              li: ({ children }) => <li>{children}</li>,
              strong: ({ children }) => <strong className="font-bold text-forest-50">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              a: ({ href, children }) => <a href={href} className="underline text-forest-300 hover:text-forest-200" target="_blank" rel="noopener noreferrer">{children}</a>,
              hr: () => <hr className="border-forest-600 my-2" />,
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
