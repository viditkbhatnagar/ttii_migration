import { describe, expect, test } from 'vitest';

import { prepareDocumentImage } from '../src/public/prepare-document-image';

// Naji 2026-08-22 — "students are unable to properly adjust the document while
// uploading it through the mobile application. The crop/resize option does not
// allow them to drag the four edges." Document picks were going through the
// PROFILE PHOTO cropper, locked to a 1:1 frame, so a landscape certificate
// could never fit: one stored example was 899x899 with the subject names cut
// off one side and the GRAND TOTAL column off the other. DocumentCropper (free
// frame, draggable from any corner) replaces it; this module is the step before
// it, which turns the photo upright and caps its size WITHOUT cropping.
//
// The canvas/createImageBitmap path cannot run under vitest's node environment,
// so what is asserted here is the contract that protects the upload when image
// processing is unavailable or fails: NEVER substitute a different file, and
// never touch a non-image at all.

function makeFile(name: string, type: string, bytes = 32): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe('preparing a document image for upload', () => {
  test('a PDF is passed through completely untouched', async () => {
    const pdf = makeFile('certificate.pdf', 'application/pdf');
    const out = await prepareDocumentImage(pdf);

    // Same object — no re-encode, no rename, no size change.
    expect(out).toBe(pdf);
    expect(out.type).toBe('application/pdf');
  });

  test('an unsupported image type is passed through rather than mangled', async () => {
    const heic = makeFile('scan.heic', 'image/heic');
    expect(await prepareDocumentImage(heic)).toBe(heic);
  });

  test('when the image cannot be decoded, the ORIGINAL file is returned', async () => {
    // Not a real JPEG, so decoding fails. The upload must still carry the
    // student's actual bytes — a failed conversion must never silently upload
    // something else, which is how the square-crop damage went unnoticed.
    const broken = makeFile('senior-secondary.jpg', 'image/jpeg');
    const out = await prepareDocumentImage(broken);

    expect(out).toBe(broken);
    expect(out.name).toBe('senior-secondary.jpg');
  });
});
