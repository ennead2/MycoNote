import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RecordForm } from './RecordForm';

vi.mock('@/lib/geolocation', () => ({
  getCurrentPosition: vi.fn().mockResolvedValue({ lat: 35.6762, lng: 139.6503, accuracy: 10 }),
}));

vi.mock('@/lib/photo', () => ({
  compressImage: vi.fn().mockResolvedValue(new Blob()),
  blobToDataUrl: vi.fn().mockResolvedValue('data:test'),
}));

const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

describe('RecordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields (日時, 場所, 写真, メモ, 保存)', () => {
    render(<RecordForm onSubmit={mockOnSubmit} />);

    // 日時フィールド
    expect(screen.getByLabelText(/日時/)).toBeInTheDocument();

    // 場所フィールド
    expect(screen.getByLabelText(/場所/)).toBeInTheDocument();

    // 写真フィールド (ラベル「写真」が存在すること)
    expect(screen.getAllByText(/写真/).length).toBeGreaterThan(0);

    // メモフィールド
    expect(screen.getByLabelText(/メモ/)).toBeInTheDocument();

    // 保存ボタン
    expect(screen.getByRole('button', { name: /保存/ })).toBeInTheDocument();
  });

  it('renders GPS button (現在地を取得)', () => {
    render(<RecordForm onSubmit={mockOnSubmit} />);
    expect(screen.getByRole('button', { name: /現在地を取得/ })).toBeInTheDocument();
  });

  it('renders harvest toggle (採取した / 観察のみ)', () => {
    render(<RecordForm onSubmit={mockOnSubmit} />);
    expect(screen.getByRole('button', { name: /採取した/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /観察のみ/ })).toBeInTheDocument();
  });

  it('shows mushroom selection (キノコの種類)', () => {
    render(<RecordForm onSubmit={mockOnSubmit} />);
    expect(screen.getByText(/キノコの種類/)).toBeInTheDocument();
  });
});
