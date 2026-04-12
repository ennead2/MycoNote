import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoPicker } from './PhotoPicker';

vi.mock('@/lib/photo', () => ({
  compressImage: vi.fn().mockResolvedValue(new Blob(['compressed'], { type: 'image/jpeg' })),
  blobToDataUrl: vi.fn().mockResolvedValue('data:image/jpeg;base64,test'),
}));

describe('PhotoPicker', () => {
  it('renders camera and file buttons', () => {
    render(<PhotoPicker photos={[]} onPhotosChange={() => {}} />);
    expect(screen.getByRole('button', { name: /撮影/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ファイル/ })).toBeInTheDocument();
  });

  it('displays photo count when photos exist', () => {
    const photos = [new Blob(['1'], { type: 'image/jpeg' }), new Blob(['2'], { type: 'image/jpeg' })];
    render(<PhotoPicker photos={photos} onPhotosChange={() => {}} />);
    expect(screen.getByText('2枚')).toBeInTheDocument();
  });

  it('camera input has capture attribute, file input does not', () => {
    render(<PhotoPicker photos={[]} onPhotosChange={() => {}} />);
    const inputs = document.querySelectorAll('input[type="file"]');
    expect(inputs).toHaveLength(2);
    // One of the two inputs should have capture, the other should not
    const hasCapture = Array.from(inputs).some((el) => el.hasAttribute('capture'));
    const hasNoCapture = Array.from(inputs).some((el) => !el.hasAttribute('capture'));
    expect(hasCapture).toBe(true);
    expect(hasNoCapture).toBe(true);
  });

  it('calls onPhotosChange when file is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PhotoPicker photos={[]} onPhotosChange={onChange} />);
    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    // Use the file-picker input (non-capture one)
    const inputs = Array.from(document.querySelectorAll('input[type="file"]')) as HTMLInputElement[];
    const fileInput = inputs.find((el) => !el.hasAttribute('capture'))!;
    await user.upload(fileInput, file);
    expect(onChange).toHaveBeenCalled();
  });
});
