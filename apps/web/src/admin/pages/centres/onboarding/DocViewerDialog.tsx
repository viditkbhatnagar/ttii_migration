import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { ViewerDoc } from './onboarding-ui.js';

// Naji's DocViewer: the browser's own PDF reader (pages, search, zoom) in a
// full-height dialog with Download. Images open the same way.

const IMAGE = /\.(png|jpe?g)(\?|$)/i;

export function DocViewerDialog({ doc, onClose }: { doc: ViewerDoc | null; onClose: () => void }) {
  const size = 'min(1024px, calc(100vw - 1rem))';
  return (
    <Dialog open={doc !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        style={{ width: size, maxWidth: size }}
        className="flex h-[92vh] flex-col gap-0 overflow-hidden p-0 supports-[height:1dvh]:h-[92dvh] [&>*]:min-w-0"
      >
        {doc ? (
          <>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <DialogTitle className="truncate text-sm font-semibold text-foreground">{doc.title}</DialogTitle>
                <DialogDescription className="truncate text-xs text-muted-foreground">{doc.subtitle}</DialogDescription>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a href={doc.url} download target="_blank" rel="noreferrer">
                    <Download aria-hidden="true" className="size-4" /> Download
                  </a>
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                  <X aria-hidden="true" className="size-4" />
                </Button>
              </div>
            </div>
            {IMAGE.test(doc.url) ? (
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-muted p-4">
                <img src={doc.url} alt={doc.title} className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <iframe src={doc.url} title={doc.title} className="min-h-0 w-full flex-1 bg-muted" />
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
