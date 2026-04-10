'use client';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import { RecordForm } from '@/components/records/RecordForm';
import { useRecords } from '@/contexts/RecordsContext';
import { UI_TEXT } from '@/constants/ui-text';

export default function NewRecordPage() {
  const router = useRouter();
  const { addNewRecord } = useRecords();
  const handleSubmit = async (data: Parameters<typeof addNewRecord>[0], photos: Blob[]) => {
    await addNewRecord(data, photos);
    router.push('/records');
  };
  return (
    <div>
      <PageHeader title={UI_TEXT.records.newRecord} showBack />
      <RecordForm onSubmit={handleSubmit} />
    </div>
  );
}
