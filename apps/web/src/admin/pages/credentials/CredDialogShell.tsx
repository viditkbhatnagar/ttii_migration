import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// A credential dialog with the inline width the shared DialogContent needs (its
// `sm:max-w-lg` beats any max-w class) and a scrolling body. Layouts inside use
// container queries (`@container` + `@xl:`), never viewport breakpoints.

export function CredDialog({
  open, onOpenChange, title, description, width = 640, footer, children,
}: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; width?: number; footer?: ReactNode; children: ReactNode;
}) {
  const w = `min(${width}px, calc(100vw - 2rem))`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ width: w, maxWidth: w }} className="flex max-h-[90vh] flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4 text-left">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
        </DialogHeader>
        <div className="@container min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer ? <DialogFooter className="border-t border-border px-6 py-3">{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-foreground">{label}</label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export const controlClass = 'h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';
export const areaClass = 'min-h-[4.5rem] w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';
