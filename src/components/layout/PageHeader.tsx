'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { UI_TEXT } from '@/constants/ui-text';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  /** Custom back handler. When provided, used instead of router.back(). */
  onBack?: () => void;
}

export default function PageHeader({ title, showBack = false, onBack }: PageHeaderProps) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());

  return (
    <header className="sticky top-0 z-40 bg-soil-surface border-b border-border">
      <div className="max-w-lg mx-auto flex items-center h-14 px-4 gap-3">
        {showBack && (
          <button
            onClick={handleBack}
            aria-label={UI_TEXT.common.back}
            className="text-moss-light p-1 -ml-1 hover:text-washi-cream transition-colors"
          >
            <ArrowLeft size={22} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
        <h1 className="serif-display text-lg font-bold text-washi-cream flex-1">{title}</h1>
      </div>
    </header>
  );
}
