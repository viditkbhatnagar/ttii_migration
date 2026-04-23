import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FileUploadProps {
  value: string;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<string>;
  accept?: string;
  placeholder?: string;
}

export function FileUpload({ value, onChange, onUpload, accept, placeholder }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
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

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'File URL or upload'}
        className="flex-1"
        readOnly={uploading}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5"
        disabled={uploading}
        aria-busy={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload aria-hidden="true" className="h-3.5 w-3.5" />
        {uploading ? 'Uploading...' : 'Upload'}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        aria-label="Choose file to upload"
        className="hidden"
        onChange={(e) => { void handleFileChange(e); }}
      />
    </div>
  );
}
