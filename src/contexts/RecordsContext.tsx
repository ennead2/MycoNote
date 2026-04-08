'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { MushroomRecord } from '@/types/record';
import {
  addRecord,
  getAllRecords,
  updateRecord,
  deleteRecord,
  addPhoto,
} from '@/lib/db';

type NewRecordInput = Omit<MushroomRecord, 'id' | 'created_at' | 'updated_at'>;

interface RecordsContextValue {
  records: MushroomRecord[];
  isLoading: boolean;
  addNewRecord: (input: NewRecordInput, photoBlobs?: Blob[]) => Promise<MushroomRecord>;
  editRecord: (record: MushroomRecord) => Promise<void>;
  removeRecord: (id: string) => Promise<void>;
  getRecordsByMushroomId: (mushroomId: string) => MushroomRecord[];
}

const RecordsContext = createContext<RecordsContextValue | null>(null);

export function RecordsProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<MushroomRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // マウント時にDexieから全レコードを読み込む
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await getAllRecords();
        if (!cancelled) setRecords(all);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const addNewRecord = useCallback(async (input: NewRecordInput, photoBlobs?: Blob[]): Promise<MushroomRecord> => {
    const now = new Date().toISOString();
    const record: MushroomRecord = {
      ...input,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    };

    await addRecord(record);

    if (photoBlobs && photoBlobs.length > 0) {
      await Promise.all(photoBlobs.map((blob) => addPhoto(record.id, blob)));
    }

    setRecords((prev) => [record, ...prev]);
    return record;
  }, []);

  const editRecord = useCallback(async (record: MushroomRecord): Promise<void> => {
    const updated: MushroomRecord = {
      ...record,
      updated_at: new Date().toISOString(),
    };
    await updateRecord(updated);
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }, []);

  const removeRecord = useCallback(async (id: string): Promise<void> => {
    await deleteRecord(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const getRecordsByMushroomId = useCallback((mushroomId: string): MushroomRecord[] => {
    return records.filter((r) => r.mushroom_id === mushroomId);
  }, [records]);

  return (
    <RecordsContext.Provider value={{ records, isLoading, addNewRecord, editRecord, removeRecord, getRecordsByMushroomId }}>
      {children}
    </RecordsContext.Provider>
  );
}

export function useRecords(): RecordsContextValue {
  const context = useContext(RecordsContext);
  if (!context) throw new Error('useRecords must be used within RecordsProvider');
  return context;
}
