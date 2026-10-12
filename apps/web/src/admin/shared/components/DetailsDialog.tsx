import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Read-only "View" dialog from Naji's prototype (record-dialogs ViewDialog):
// a title, a subtitle and label / value rows. Values render as React text, so
// stored HTML is shown literally and never injected.

export interface DetailRow { label: string; value: ReactNode }

const WIDTH = 'min(520px, calc(100vw - 2rem))';

export function DetailsDialog({
  open, title, subtitle, rows, onClose, footer,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  rows: DetailRow[];
  onClose: () => void;
  footer?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent style={{ width: WIDTH, maxWidth: WIDTH }} className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle className="break-words">{title}</DialogTitle>
          <DialogDescription>{subtitle || 'Details'}</DialogDescription>
        </DialogHeader>
        <dl className="min-h-0 flex-1 divide-y divide-border overflow-y-auto px-6 py-2">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[140px_1fr] gap-3 py-2.5 text-sm">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="min-w-0 whitespace-pre-wrap break-words font-medium text-foreground">{r.value === '' || r.value === null || r.value === undefined ? '—' : r.value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-3">
          {footer}
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
