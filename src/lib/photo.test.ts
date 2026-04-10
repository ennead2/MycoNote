import { describe, it, expect, vi, afterEach } from 'vitest';
import { compressImage, blobToDataUrl } from './photo';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('compressImage', () => {
  it('画像Blobを受け取りJPEG Blobを返す', async () => {
    // jsdomではcreateImageBitmapとcanvas.toBlobが制限されているためモック
    const mockImageBitmap = {
      width: 800,
      height: 600,
      close: vi.fn(),
    };

    const expectedBlob = new Blob(['fake-jpeg-data'], { type: 'image/jpeg' });

    // createImageBitmap をグローバルにモック
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockImageBitmap));

    // document.createElement をモックしてcanvasを返す
    const mockCtx = {
      drawImage: vi.fn(),
    };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockCtx),
      toBlob: vi.fn((callback: (blob: Blob) => void) => {
        callback(expectedBlob);
      }),
    };
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return mockCanvas as unknown as HTMLElement;
      return document.createElement(tag);
    });

    const inputBlob = new Blob(['fake-image-data'], { type: 'image/png' });
    const result = await compressImage(inputBlob);

    expect(result).toBe(expectedBlob);
    expect(result.type).toBe('image/jpeg');

    vi.unstubAllGlobals();
  });

  it('最大寸法(1200px)を超える画像はリサイズされる', async () => {
    const mockImageBitmap = {
      width: 2400,
      height: 1800,
      close: vi.fn(),
    };

    const expectedBlob = new Blob(['fake-jpeg-data'], { type: 'image/jpeg' });

    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockImageBitmap));

    let capturedWidth = 0;
    let capturedHeight = 0;
    const mockCtx = { drawImage: vi.fn() };
    const mockCanvas = {
      get width() { return capturedWidth; },
      set width(v: number) { capturedWidth = v; },
      get height() { return capturedHeight; },
      set height(v: number) { capturedHeight = v; },
      getContext: vi.fn().mockReturnValue(mockCtx),
      toBlob: vi.fn((callback: (blob: Blob) => void) => {
        callback(expectedBlob);
      }),
    };
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return mockCanvas as unknown as HTMLElement;
      return document.createElement(tag);
    });

    const inputBlob = new Blob(['fake-image-data'], { type: 'image/png' });
    await compressImage(inputBlob);

    // 2400x1800 → ratio = 1200/2400 = 0.5 → 1200x900
    expect(capturedWidth).toBe(1200);
    expect(capturedHeight).toBe(900);

    vi.unstubAllGlobals();
  });
});

describe('blobToDataUrl', () => {
  it('BlobをデータURL文字列に変換する', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });
    const result = await blobToDataUrl(blob);

    expect(typeof result).toBe('string');
    expect(result.startsWith('data:')).toBe(true);
  });
});
