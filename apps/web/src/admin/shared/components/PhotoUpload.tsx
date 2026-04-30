import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * Profile-photo upload — preview + Upload button + crop step. The crop
 * dialog opens automatically when the admin picks a file (Naji
 * 2026-04-30: "Crop will require, it's an essential feature in
 * application stage, we had that in old LMS"). Crop is fixed 1:1 to
 * suit circular avatars; the cropped result is encoded as a JPEG
 * (94% quality) before being handed to onUpload.
 *
 * Designed to slot into the user creation forms without per-form code
 * changes — same prop shape as before.
 */
interface PhotoUploadProps {
  value: string;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<string>;
  /** Initials fallback shown inside the preview circle when no value. */
  fallbackInitials?: string;
  /** Defaults to 'image/*' — pass narrower types if you need them. */
  accept?: string;
}

const MAX_OUTPUT_DIMENSION = 1024; // cap exported avatar at 1024px square

function buildAspectCrop(width: number, height: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 80 }, 1, width, height),
    width,
    height,
  );
}

async function cropImageToFile(
  image: HTMLImageElement,
  pixelCrop: PixelCrop,
  filename: string,
): Promise<File> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const targetWidth = Math.min(MAX_OUTPUT_DIMENSION, Math.round(pixelCrop.width * scaleX));
  const targetHeight = Math.min(MAX_OUTPUT_DIMENSION, Math.round(pixelCrop.height * scaleY));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser cannot create canvas context for cropping.');

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to encode cropped image.'))),
      'image/jpeg',
      0.94,
    );
  });

  return new File([blob], filename.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}

export function PhotoUpload({ value, onChange, onUpload, fallbackInitials, accept }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Crop dialog state
  const [cropOpen, setCropOpen] = useState(false);
  const [pendingFileName, setPendingFileName] = useState('photo.jpg');
  const [pendingDataUrl, setPendingDataUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop | undefined>(undefined);
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | undefined>(undefined);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Reset crop state when dialog closes (so re-opening starts fresh).
  useEffect(() => {
    if (!cropOpen) {
      setPendingDataUrl(null);
      setCrop(undefined);
      setCompletedCrop(undefined);
    }
  }, [cropOpen]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 8 * 1024 * 1024) {
        toast.error('Image must be 8MB or smaller.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please pick an image file (JPG, PNG, etc).');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setPendingDataUrl(typeof reader.result === 'string' ? reader.result : null);
        setPendingFileName(file.name);
        setCropOpen(true);
      };
      reader.readAsDataURL(file);
      // Reset the input so picking the same file again still triggers onChange.
      if (inputRef.current) inputRef.current.value = '';
    },
    [],
  );

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(buildAspectCrop(width, height));
  }, []);

  const handleConfirmCrop = useCallback(async () => {
    if (!imgRef.current || !completedCrop || !completedCrop.width || !completedCrop.height) {
      toast.error('Drag to select a crop region first.');
      return;
    }
    setUploading(true);
    try {
      const file = await cropImageToFile(imgRef.current, completedCrop, pendingFileName);
      const url = await onUpload(file);
      onChange(url);
      setCropOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [completedCrop, pendingFileName, onUpload, onChange]);

  const handleRemove = useCallback(() => {
    onChange('');
  }, [onChange]);

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
          {value ? (
            <img src={value} alt="Profile" className="size-full object-cover" />
          ) : (
            <span className="text-xl font-medium text-slate-500">{fallbackInitials || '—'}</span>
          )}
        </div>
        {value && !uploading && (
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remove photo"
            className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          aria-busy={uploading}
          onClick={() => inputRef.current?.click()}
          className="gap-1.5"
        >
          <Upload aria-hidden="true" className="size-3.5" />
          {uploading ? 'Uploading…' : value ? 'Replace photo' : 'Upload photo'}
        </Button>
        <p className="text-[11px] text-slate-500">JPG/PNG, up to 8MB. You'll get a crop step before saving.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept || 'image/*'}
        aria-label="Choose profile photo to upload"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Crop dialog */}
      <Dialog open={cropOpen} onOpenChange={(open) => { if (!open && !uploading) setCropOpen(false); }}>
        <DialogContent className="w-[min(560px,calc(100vw-2rem))] max-w-[min(560px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Crop Photo</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center bg-slate-100 p-3 rounded-md">
            {pendingDataUrl ? (
              <ReactCrop
                {...(crop ? { crop } : {})}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
                keepSelection
              >
                <img
                  ref={imgRef}
                  alt="Photo to crop"
                  src={pendingDataUrl}
                  onLoad={handleImageLoad}
                  style={{ maxHeight: '60vh', maxWidth: '100%' }}
                />
              </ReactCrop>
            ) : (
              <p className="py-8 text-sm text-slate-500">Loading…</p>
            )}
          </div>
          <p className="text-xs text-slate-500 text-center">Drag to select the area to keep. Square crop, suited for the avatar.</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCropOpen(false)} disabled={uploading}>Cancel</Button>
            <Button type="button" onClick={() => { void handleConfirmCrop(); }} disabled={uploading || !completedCrop}>
              {uploading ? 'Uploading…' : 'Save photo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
