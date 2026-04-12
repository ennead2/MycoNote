'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Maitake } from '@/components/icons/Maitake';
import { UI_TEXT } from '@/constants/ui-text';
import { replaceEmojisInChildren } from '@/lib/emoji-to-icon';
import type { ChatMessage } from '@/types/chat';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`mb-3 ${isUser ? 'flex flex-col items-end' : ''}`}>
      <div className="inline-flex items-center gap-1 text-[10px] text-washi-dim mb-1">
        {isUser ? (
          UI_TEXT.plan.userLabel
        ) : (
          <>
            <Maitake size={14} className="text-moss-light" aria-hidden="true" />
            {UI_TEXT.plan.assistantLabel}
          </>
        )}
      </div>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-moss-primary text-white rounded-tr-none whitespace-pre-wrap'
            : 'bg-soil-surface text-washi-cream rounded-tl-none'
        }`}
      >
        {isUser ? (
          message.content
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="text-base font-bold mb-1 mt-2 first:mt-0">{replaceEmojisInChildren(children)}</h1>,
              h2: ({ children }) => <h2 className="text-sm font-bold mb-1 mt-2 first:mt-0">{replaceEmojisInChildren(children)}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-1.5 first:mt-0">{replaceEmojisInChildren(children)}</h3>,
              p: ({ children }) => <p className="mb-2 last:mb-0">{replaceEmojisInChildren(children)}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2 last:mb-0 space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 last:mb-0 space-y-0.5">{children}</ol>,
              li: ({ children }) => <li>{replaceEmojisInChildren(children)}</li>,
              // GFM タスクリスト (`- [ ] foo`) の disabled チェックボックスを非表示。
              // ネイティブ input はダークテーマで視認性が低く、何のマークか
              // 分かりにくいというフィードバックを受けて除去。箇条書きの「・」と
              // テキストだけ残る形になる。
              input: (props) =>
                props.type === 'checkbox' ? null : <input {...props} />,
              strong: ({ children }) => <strong className="font-bold text-washi-cream">{replaceEmojisInChildren(children)}</strong>,
              em: ({ children }) => <em className="italic">{replaceEmojisInChildren(children)}</em>,
              a: ({ href, children }) => <a href={href} className="underline text-moss-light hover:text-washi-muted" target="_blank" rel="noopener noreferrer">{replaceEmojisInChildren(children)}</a>,
              hr: () => <hr className="border-moss-primary my-2" />,
              table: ({ children }) => <table className="w-full border-collapse text-xs my-2">{children}</table>,
              thead: ({ children }) => <thead className="border-b border-moss-primary">{children}</thead>,
              tbody: ({ children }) => <tbody>{children}</tbody>,
              tr: ({ children }) => <tr className="border-b border-border last:border-b-0">{children}</tr>,
              th: ({ children }) => <th className="text-left py-1 pr-3 font-semibold text-moss-light">{replaceEmojisInChildren(children)}</th>,
              td: ({ children }) => <td className="py-1 pr-3 text-washi-muted">{replaceEmojisInChildren(children)}</td>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
