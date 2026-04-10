// src/components/identify/IdentifyResult.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IdentifyResultView } from './IdentifyResult';
import type { IdentifyResult } from '@/types/chat';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockResult: IdentifyResult = {
  candidates: [
    { id: 'hiratake', name_ja: 'ヒラタケ', confidence: 'high', reason: '傘の形状が一致' },
    { id: null, name_ja: 'ツキヨタケ', confidence: 'medium', reason: '形状が類似' },
  ],
  cautions: ['柄の断面を確認してください'],
  similar_toxic: ['ツキヨタケ — 食中毒の原因として最多'],
};

describe('IdentifyResultView', () => {
  it('displays all candidates', () => {
    render(<IdentifyResultView result={mockResult} onRetry={vi.fn()} />);
    expect(screen.getByText('ヒラタケ')).toBeInTheDocument();
    expect(screen.getByText('ツキヨタケ')).toBeInTheDocument();
  });

  it('shows confidence badges with correct text', () => {
    render(<IdentifyResultView result={mockResult} onRetry={vi.fn()} />);
    expect(screen.getByText('高')).toBeInTheDocument();
    expect(screen.getByText('中')).toBeInTheDocument();
  });

  it('shows similar toxic warning section', () => {
    render(<IdentifyResultView result={mockResult} onRetry={vi.fn()} />);
    expect(screen.getByText(/類似する毒キノコ/)).toBeInTheDocument();
    expect(screen.getByText(/食中毒の原因として最多/)).toBeInTheDocument();
  });

  it('shows safety warning', () => {
    render(<IdentifyResultView result={mockResult} onRetry={vi.fn()} />);
    expect(screen.getByText(/AI推定/)).toBeInTheDocument();
  });

  it('shows zukan link only for candidates with id', () => {
    render(<IdentifyResultView result={mockResult} onRetry={vi.fn()} />);
    const zukanLinks = screen.getAllByText(/図鑑で詳しく見る/);
    expect(zukanLinks).toHaveLength(1);
  });
});
