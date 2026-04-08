'use client';
import { useParams } from 'next/navigation';
import RecordDetailClient from './RecordDetailClient';

export default function RecordDetailPage() {
  const params = useParams();
  const id = params.id as string;
  return <RecordDetailClient id={id} />;
}
