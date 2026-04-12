// src/components/identify/PhotoUploader.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoUploader } from './PhotoUploader';

describe('PhotoUploader', () => {
  it('renders camera and file buttons', () => {
    render(<PhotoUploader images={[]} onImagesChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /撮影/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ファイル/ })).toBeInTheDocument();
  });

  it('shows hint text', () => {
    render(<PhotoUploader images={[]} onImagesChange={vi.fn()} />);
    expect(screen.getByText(/異なる角度/)).toBeInTheDocument();
  });

  it('displays image count when images exist', () => {
    const images = [{ data: 'abc', mediaType: 'image/jpeg' as const }];
    render(<PhotoUploader images={images} onImagesChange={vi.fn()} />);
    expect(screen.getByText('1枚')).toBeInTheDocument();
  });

  it('calls onImagesChange when remove button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const images = [
      { data: 'img1', mediaType: 'image/jpeg' as const },
      { data: 'img2', mediaType: 'image/jpeg' as const },
    ];
    render(<PhotoUploader images={images} onImagesChange={onChange} />);
    const removeButtons = screen.getAllByLabelText(/削除/);
    await user.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith([images[1]]);
  });
});
