import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

// Dialog chrome shared by the Team / Group forms and pickers (house modal
// rules: inline width, 85vh, fixed header + footer, scrolling body).

export const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-[invalid=true]:border-destructive';

export const TEXTAREA_CLASS = 'flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

export function OrgDialog({ open, title, description, width = 680, saving, saveLabel, saveIcon, canSave, onClose, onSave, children }: {
  open: boolean; title: string; description: string; width?: number; saving: boolean; saveLabel: string; saveIcon: React.ReactNode;
  canSave: boolean; onClose: () => void; onSave: () => void; children: React.ReactNode;
}) {
  const size = `min(${width}px, calc(100vw - 2rem))`;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent style={{ width: size, maxWidth: size }} className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0">
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); if (!saving && canSave) onSave(); }}>
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
            <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">{children}</div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" className="gap-1.5" disabled={saving || !canSave}>
              {saveIcon}{saving ? 'Saving...' : saveLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Field({ label, htmlFor, required, error, className, children }: {
  label: string; htmlFor: string; required?: boolean; error?: string | undefined; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={`grid gap-1.5 ${className ?? ''}`}>
      <Label htmlFor={htmlFor} className="text-xs font-semibold text-foreground">
        {label}{required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? <p id={`${htmlFor}-error`} className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
