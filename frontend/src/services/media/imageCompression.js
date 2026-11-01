/**
 * Shrinks large photos in the browser before upload.
 *
 * Serverless hosting (Vercel) caps request bodies at 4.5MB, and modern phone photos
 * are often 4-12MB. Re-encoding to JPEG at most 1600px on the long side keeps every
 * detail the AI and officers need while staying well under that limit.
 * Small files are returned untouched; if the browser cannot decode the image the
 * original file is returned and the backend validates it as usual.
 */

const MAX_SIDE = 1600;
const SKIP_BELOW_BYTES = 900 * 1024;
const TARGET_MAX_BYTES = 3 * 1024 * 1024;

async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* fall back to an <img> element below */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const toBlob = (canvas, quality) => new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

export async function compressImage(file) {
  if (!file || file.size <= SKIP_BELOW_BYTES) return file;
  try {
    const source = await decode(file);
    const w = source.width;
    const h = source.height;
    const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
    if (typeof source.close === 'function') source.close();

    let blob = null;
    for (const quality of [0.85, 0.75, 0.6]) {
      blob = await toBlob(canvas, quality);
      if (blob && blob.size <= TARGET_MAX_BYTES) break;
    }
    if (!blob || blob.size >= file.size) return file;
    const name = (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

export default compressImage;
