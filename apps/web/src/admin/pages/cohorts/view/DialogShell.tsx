import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// One modal frame for the cohort detail dialogs: fixed header and footer, the
// body scrolls. Width is set inline because DialogContent's `sm:max-w-lg`
// beats a custom max-w class.
export function DialogShell({
  open, onClose, title, description, width = 560, footer, children, onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string | undefined;
  width?: number;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** When set, the body + footer are a form submitted by the footer's submit button. */
  onSubmit?: (() => void) | undefined;
}) {
  const w = `min(${width}px, calc(100vw - 2rem))`;
  const body = (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
      {footer ? <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-6 py-4">{footer}</div> : null}
    </>
  );
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent style={{ width: w, maxWidth: w }} className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <DialogTitle className="truncate">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {onSubmit ? (
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            {body}
          </form>
        ) : body}
      </DialogContent>
    </Dialog>
  );
}
