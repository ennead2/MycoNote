// src/components/identify/FeatureSelector.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeatureSelector } from './FeatureSelector';
import type { IdentifyInput } from '@/lib/identify-matcher';

describe('FeatureSelector', () => {
  it('renders all required feature sections', () => {
    render(<FeatureSelector input={{}} onChange={vi.fn()} />);
    expect(screen.getByText(/ヒダのタイプ/)).toBeInTheDocument();
    expect(screen.getByText(/傘の色/)).toBeInTheDocument();
    expect(screen.getByText(/傘の形/)).toBeInTheDocument();
    expect(screen.getByText(/傘のサイズ/)).toBeInTheDocument();
  });

  it('calls onChange when a chip is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FeatureSelector input={{}} onChange={onChange} />);
    await user.click(screen.getByText('ヒダ'));
    expect(onChange).toHaveBeenCalledWith({ gill_type: 'gills' });
  });

  it('shows additional filters when toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<FeatureSelector input={{}} onChange={vi.fn()} />);
    expect(screen.queryByText(/ヒダの付き方/)).not.toBeInTheDocument();
    await user.click(screen.getByText(/もっと絞り込む/));
    expect(screen.getByText(/ヒダの付き方/)).toBeInTheDocument();
    expect(screen.getByText(/柄の色/)).toBeInTheDocument();
    expect(screen.getByText(/変色反応/)).toBeInTheDocument();
  });

  it('highlights selected chips', () => {
    render(<FeatureSelector input={{ gill_type: 'gills' }} onChange={vi.fn()} />);
    const gillsChip = screen.getByText('ヒダ');
    expect(gillsChip.className).toContain('bg-forest-500');
  });

  it('deselects a chip when clicked again', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FeatureSelector input={{ gill_type: 'gills' }} onChange={onChange} />);
    await user.click(screen.getByText('ヒダ'));
    expect(onChange).toHaveBeenCalledWith({});
  });
});
