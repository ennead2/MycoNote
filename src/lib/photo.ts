const MAX_DIMENSION = 1200;

export async function compressImage(blob: Blob, quality: number = 80): Promise<Blob> {
  const imageBitmap = await createImageBitmap(blob);
  const { width, height } = imageBitmap;

  let targetWidth = width;
  let targetHeight = height;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    targetWidth = Math.round(width * ratio);
    targetHeight = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
  imageBitmap.close();

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((result) => resolve(result!), 'image/jpeg', quality / 100);
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Blob の読み取りに失敗しました'));
    reader.readAsDataURL(blob);
  });
}
