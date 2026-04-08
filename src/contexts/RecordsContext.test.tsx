import 'fake-indexeddb/auto';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { RecordsProvider, useRecords } from './RecordsContext';
import { MushroomRecord } from '@/types/record';
import { ReactNode } from 'react';

// テスト用ヘルパーコンポーネント
function TestComponent({ onReady }: { onReady: (api: ReturnType<typeof useRecords>) => void }) {
  const api = useRecords();
  onReady(api);
  return <div data-testid="ready">{api.isLoading ? 'loading' : 'ready'}</div>;
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <RecordsProvider>{children}</RecordsProvider>
);

const baseInput: Parameters<ReturnType<typeof useRecords>['addNewRecord']>[0] = {
  mushroom_id: undefined,
  mushroom_name_ja: 'テストキノコ',
  observed_at: '2026-04-08T10:00:00.000Z',
  location: { lat: 35.6895, lng: 139.6917, description: '東京' },
  photos: [],
  quantity: '3本',
  memo: 'テストメモ',
  harvested: false,
  tags: ['テスト'],
};

beforeEach(async () => {
  await db.records.clear();
  await db.record_photos.clear();
});

describe('RecordsContext', () => {
  it('starts with empty records', async () => {
    let api!: ReturnType<typeof useRecords>;
    await act(async () => {
      render(<TestComponent onReady={(a) => { api = a; }} />, { wrapper });
    });
    expect(api.records).toEqual([]);
  });

  it('adds a record (gets id and appears in records)', async () => {
    let api!: ReturnType<typeof useRecords>;
    await act(async () => {
      render(<TestComponent onReady={(a) => { api = a; }} />, { wrapper });
    });

    let added!: MushroomRecord;
    await act(async () => {
      added = await api.addNewRecord(baseInput);
    });

    expect(added.id).toBeTruthy();
    expect(typeof added.id).toBe('string');
    expect(added.mushroom_name_ja).toBe('テストキノコ');
    expect(added.created_at).toBeTruthy();
    expect(added.updated_at).toBeTruthy();
    expect(api.records).toHaveLength(1);
    expect(api.records[0].id).toBe(added.id);
  });

  it('deletes a record', async () => {
    let api!: ReturnType<typeof useRecords>;
    await act(async () => {
      render(<TestComponent onReady={(a) => { api = a; }} />, { wrapper });
    });

    let added!: MushroomRecord;
    await act(async () => {
      added = await api.addNewRecord(baseInput);
    });
    expect(api.records).toHaveLength(1);

    await act(async () => {
      await api.removeRecord(added.id);
    });
    expect(api.records).toHaveLength(0);
  });

  it('persists records to IndexedDB', async () => {
    let api!: ReturnType<typeof useRecords>;
    await act(async () => {
      render(<TestComponent onReady={(a) => { api = a; }} />, { wrapper });
    });

    await act(async () => {
      await api.addNewRecord(baseInput);
    });

    // DBに直接確認
    const dbRecords = await db.records.toArray();
    expect(dbRecords).toHaveLength(1);
    expect(dbRecords[0].mushroom_name_ja).toBe('テストキノコ');
  });
});
