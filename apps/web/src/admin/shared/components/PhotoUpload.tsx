import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Profile-photo upload — circular preview + upload button only. No URL
 * text input (per Naji 2026-04-30: admins shouldn't see / edit raw URLs;
 * just upload an image and confirm the preview). Designed for the user
 * creation forms (Admin / Counsellor / Associate / Instructor / Centre).
 *
 * The image is uploaded immediately on file selection via `onUpload` and
 * the resulting URL is passed up via `onChange`. A "Remove" affordance
 * clears the value back to empty string.
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

export function PhotoUpload({ value, onChange, onUpload, fallbackInitials, accept }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      // Reasonable client-side guard — the storage backend has its own
      // limits but we'd rather fail fast on a 50MB photo than wait for
      // the upload to die mid-flight.
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be 5MB or smaller.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please pick an image file (JPG, PNG, etc).');
        return;
      }
      setUploading(true);
      try {
        const url = await onUpload(file);
        onChange(url);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [onUpload, onChange],
  );

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
        <p className="text-[11px] text-slate-500">JPG, PNG up to 5MB. A square image works best.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept || 'image/*'}
        aria-label="Choose profile photo to upload"
        className="hidden"
        onChange={(e) => { void handleFileChange(e); }}
      />
    </div>
  );
}
