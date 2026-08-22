/**
 * Turn a picked document photo into an upright, sensibly sized image to hand to
 * the crop dialog.
 *
 * Naji 2026-08-22 — "students are unable to properly adjust the document while
 * uploading... the crop/resize option does not allow them to drag the four
 * edges". Document picks had been going through PhotoCropper, the PROFILE PHOTO
 * cropper, which is locked to aspect={1}: a square frame cannot contain a
 * landscape certificate, so the edges always fell outside. A stored example came
 * back 899x899 with the subject names cut off one side and the entire GRAND
 * TOTAL column off the other. DocumentCropper replaces that control.
 *
 * This step runs BEFORE the cropper and deliberately does not crop anything. It
 * exists for two reasons:
 *  - Phone photos carry their rotation in EXIF. Drawing one to a canvas drops
 *    that tag, which is why documents were arriving on their side. Decoding with
 *    imageOrientation 'from-image' bakes the rotation into the pixels, so the
 *    student sees the page upright in the cropper and it stays that way through
 *    the crop, the upload and the generated application PDF (pdfkit does not
 *    honour EXIF either).
 *  - A modern phone camera file is far larger than anything needed to read a
 *    marks table, and the whole thing has to fit through the crop dialog and a
 *    10 MB upload cap.
 */

/** Long edge cap. Comfortably readable for a marks table; keeps uploads small. */
const MAX_EDGE = 2400;

const JPEG_QUALITY = 0.9;

function isSupportedImage(file: File): boolean {
  return file.type === 'image/jpeg' || file.type === 'image/png';
}

/**
 * Returns an upright, uncropped version of `file`. Falls back to the ORIGINAL
 * file on any failure — an untouched upload is always better than a mangled one.
 */
export async function prepareDocumentImage(file: File): Promise<File> {
  if (!isSupportedImage(file)) return file;

  let bitmap: ImageBitmap;
  try {
    // 'from-image' applies the EXIF orientation while decoding, so the bitmap
    // is already the right way up and we never have to parse EXIF ourselves.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    // A photographed page has white margins; fill first so a PNG with alpha
    // does not flatten to black behind the paper.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    // Whole bitmap to whole canvas — the entire document, no crop.
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
    });
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'document';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
  } finally {
    bitmap.close();
  }
}
