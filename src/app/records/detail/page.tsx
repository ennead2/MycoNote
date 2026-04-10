'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import RecordDetailClient from './RecordDetailClient';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

function RecordDetailInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  return <RecordDetailClient id={id} />;
}

export default function RecordDetailPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <RecordDetailInner />
    </Suspense>
  );
}
