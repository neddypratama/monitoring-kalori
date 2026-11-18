/**
 * Compresses a browser File (photo from camera or gallery) to JPEG <= 1024px
 * so uploading to PHP cPanel & Gemini Vision API is fast and lightweight.
 */
export async function compressFoodImage(
  file: File,
  maxDimension = 1024,
  quality = 0.82
): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });

  // Fallback for environments without canvas/Image rendering (e.g., jsdom tests)
  const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
  if (typeof document === 'undefined' || typeof Image === 'undefined' || isJsdom) {
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    return { base64, mimeType: file.type || 'image/jpeg', previewUrl: dataUrl };
  }

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Format gambar tidak dapat dibaca.'));
      image.src = dataUrl;
    });

    let { width, height } = img;
    if (width > maxDimension || height > maxDimension) {
      if (width >= height) {
        height = Math.round((height / width) * maxDimension);
        width = maxDimension;
      } else {
        width = Math.round((width / height) * maxDimension);
        height = maxDimension;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      return { base64, mimeType: file.type || 'image/jpeg', previewUrl: dataUrl };
    }
    ctx.drawImage(img, 0, 0, width, height);
    const compressedUrl = canvas.toDataURL('image/jpeg', quality);
    const base64 = compressedUrl.split(',')[1] || '';
    return { base64, mimeType: 'image/jpeg', previewUrl: compressedUrl };
  } catch {
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    return { base64, mimeType: file.type || 'image/jpeg', previewUrl: dataUrl };
  }
}
