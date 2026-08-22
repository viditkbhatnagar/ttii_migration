import { useCallback, useEffect, useRef, useState } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { RotateCw, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';
import 'react-image-crop/dist/ReactCrop.css';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * Crop/resize for an uploaded DOCUMENT.
 *
 * Naji 2026-08-22 — "Students are unable to properly adjust the document while
 * uploading it through the mobile application. The crop/resize option does not
 * allow them to drag the four edges, making it difficult to include the
 * complete document. Please enable a proper crop/resize function so students
 * can adjust the frame from all four corners."
 *
 * Document picks were being sent through PhotoCropper, which is the PROFILE
 * PHOTO cropper: react-easy-crop locked to aspect={1}, where the frame is fixed
 * and you pan/zoom the picture underneath it. On a rectangular certificate that
 * is unwinnable — a square frame cannot contain a landscape page, so whatever
 * you do the edges fall outside. A stored example came out 899x899 with the
 * subject names cut off one side and the whole GRAND TOTAL column off the other.
 *
 * So this is a different control, not a tweak: react-image-crop with NO aspect,
 * giving a frame the student drags by any corner or edge. It opens covering the
 * ENTIRE image, so the default action already submits the whole document and
 * cropping is opt-in. Rotate is here too, because phone photos of a page
 * regularly arrive on their side.
 */

/** Cap the exported edge — plenty to read a marks table, keeps the upload small. */
const MAX_OUTPUT_EDGE = 2400;
const JPEG_QUALITY = 0.92;

/** The whole image, which is what a document upload should default to. */
function fullCrop(): Crop {
  return { unit: '%', x: 0, y: 0, width: 100, height: 100 };
}

/** Render the selected region at source resolution (capped). */
function exportCrop(image: HTMLImageElement, pixelCrop: PixelCrop): string {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const sourceX = pixelCrop.x * scaleX;
  const sourceY = pixelCrop.y * scaleY;
  const sourceWidth = Math.max(1, pixelCrop.width * scaleX);
  const sourceHeight = Math.max(1, pixelCrop.height * scaleY);

  const scale = Math.min(1, MAX_OUTPUT_EDGE / Math.max(sourceWidth, sourceHeight));
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  // Paper has white margins; fill so any transparency flattens to white, not black.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(
    image,
    sourceX, sourceY, sourceWidth, sourceHeight,
    0, 0, targetWidth, targetHeight,
  );

  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

/** Rotate the working image 90 degrees clockwise, returning a new data URL. */
function rotateDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Swapped: a quarter turn exchanges width and height.
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas unavailable')); return; }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

export function DocumentCropper({
  imageSrc,
  label,
  open,
  onCancel,
  onConfirm,
}: {
  imageSrc: string | null;
  label: string;
  open: boolean;
  onCancel: () => void;
  onConfirm: (croppedDataUrl: string) => void;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>(fullCrop());
  const [pixelCrop, setPixelCrop] = useState<PixelCrop | null>(null);
  const [busy, setBusy] = useState(false);

  // A newly picked file replaces the working image and resets the frame.
  // Rotation edits `source` afterwards, so it cannot simply mirror the prop.
  useEffect(() => {
    setSource(imageSrc);
    setCrop(fullCrop());
    setPixelCrop(null);
  }, [imageSrc]);

  const onImageLoad = useCallback(() => {
    // Open covering everything: the student's default is the WHOLE document.
    setCrop(fullCrop());
  }, []);

  const handleRotate = async () => {
    if (!source) return;
    setBusy(true);
    try {
      setSource(await rotateDataUrl(source));
      setCrop(fullCrop());
      setPixelCrop(null);
    } catch {
      toast.error('Could not rotate this image.');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    setCrop(fullCrop());
    setPixelCrop(null);
  };

  const handleConfirm = () => {
    const image = imgRef.current;
    if (!image) return;
    setBusy(true);
    try {
      // No adjustment made, or a degenerate selection: take the whole image.
      const effective: PixelCrop = pixelCrop && pixelCrop.width > 4 && pixelCrop.height > 4
        ? pixelCrop
        : { unit: 'px', x: 0, y: 0, width: image.width, height: image.height };
      onConfirm(exportCrop(image, effective));
    } catch {
      toast.error("Couldn't process this image. Try another photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent
        className="counsellor-theme apply-form-theme p-4 sm:p-6"
        style={{ width: 'min(760px, calc(100vw - 2rem))', maxWidth: 'min(760px, calc(100vw - 2rem))' }}
      >
        <DialogHeader>
          <DialogTitle>Adjust {label || 'document'}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Drag any corner or edge of the frame to fit your document. The whole page is selected
          by default — you only need to change it if you want to trim the edges.
        </p>

        <div className="max-h-[55dvh] overflow-auto rounded-lg bg-secondary p-2">
          {source ? (
            <ReactCrop
              crop={crop}
              onChange={(_pixels, percent) => setCrop(percent)}
              onComplete={(c) => setPixelCrop(c)}
              keepSelection
              minWidth={16}
              minHeight={16}
              className="max-w-full"
            >
              <img
                ref={imgRef}
                src={source}
                alt={label || 'document'}
                onLoad={onImageLoad}
                className="max-h-[50dvh] w-auto"
              />
            </ReactCrop>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void handleRotate()} disabled={busy}>
            <RotateCw aria-hidden="true" className="mr-2 size-4" />
            Rotate
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleReset} disabled={busy}>
            <Maximize2 aria-hidden="true" className="mr-2 size-4" />
            Select whole page
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button type="button" onClick={handleConfirm} disabled={busy || !source}>
            {busy ? 'Processing…' : 'Use this document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
