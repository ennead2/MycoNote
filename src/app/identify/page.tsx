'use client';
import PageHeader from '@/components/layout/PageHeader';
import { UI_TEXT } from '@/constants/ui-text';

export default function IdentifyPage() {
  return (
    <div>
      <PageHeader title={UI_TEXT.identify.title} />
      <div className="flex flex-col items-center justify-center px-4 py-16">
        <span className="mb-4 text-5xl">🔍</span>
        <p className="text-center text-forest-400">{UI_TEXT.identify.selectPrompt}</p>
      </div>
    </div>
  );
}
