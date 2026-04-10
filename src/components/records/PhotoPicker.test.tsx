import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoPicker } from './PhotoPicker';

vi.mock('@/lib/photo', () => ({
  compressImage: vi.fn().mockResolvedValue(new Blob(['compressed'], { type: 'image/jpeg' })),
  blobToDataUrl: vi.fn().mockResolvedValue('data:image/jpeg;base64,test'),
}));

describe('PhotoPicker', () => {
  it('renders add photo button', () => {
    render(<PhotoPicker photos={[]} onPhotosChange={() => {}} />);
    expect(screen.getByText('写真を追加')).toBeInTheDocument();
  });

  it('displays photo count when photos exist', () => {
    const photos = [new Blob(['1'], { type: 'image/jpeg' }), new Blob(['2'], { type: 'image/jpeg' })];
    render(<PhotoPicker photos={photos} onPhotosChange={() => {}} />);
    expect(screen.getByText('2枚')).toBeInTheDocument();
  });

  it('calls onPhotosChange when file is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PhotoPicker photos={[]} onPhotosChange={onChange} />);
    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);
    expect(onChange).toHaveBeenCalled();
  });
});
