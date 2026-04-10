'use client';

import { useRouter } from 'next/navigation';
import { UI_TEXT } from '@/constants/ui-text';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
}

export default function PageHeader({ title, showBack = false }: PageHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 bg-forest-900 border-b border-forest-700">
      <div className="max-w-lg mx-auto flex items-center h-14 px-4 gap-3">
        {showBack && (
          <button
            onClick={() => router.back()}
            aria-label={UI_TEXT.common.back}
            className="text-forest-300 text-xl leading-none p-1 -ml-1 hover:text-forest-100 transition-colors"
          >
            ←
          </button>
        )}
        <h1 className="text-lg font-bold text-forest-100 flex-1">{title}</h1>
      </div>
    </header>
  );
}
