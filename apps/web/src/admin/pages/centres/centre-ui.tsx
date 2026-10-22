import { CalendarClock, Download, ExternalLink, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Pill } from '../../shared/components/ui-kit.js';
import type { ExpiryInfo } from './centre-directory-model.js';
import type { CentreStatus } from './centre-list-model.js';
import { opensInline } from './centre-profile-model.js';

// Small pieces shared by the Centre Directory and the Centre Profile (Naji
// 2026-10-22): the status pill, the affiliation-expiry text + chip, the list
// search box and the document viewer.

export function CentreStatusPill({ status, dot = false }: { status: CentreStatus; dot?: boolean }) {
  const active = status === 'active';
  return (
    <Pill tone={active ? 'emerald' : 'slate'} className="px-2 py-0.5 text-[11px]">
      {dot ? <span aria-hidden="true" className={cn('size-1.5 rounded-full', active ? 'bg-emerald-500' : 'bg-slate-400')} /> : null}
      {active ? 'Active' : 'Inactive'}
    </Pill>
  );
}

/** "31 Dec 2026" coloured red when expired / amber within 90 days, plus the "Expired" / "{n}d" chip. */
export function ExpiryText({ info, className }: { info: ExpiryInfo; className?: string }) {
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1.5 whitespace-nowrap', className)}>
      <span className={cn(info.tone === 'expired' && 'text-rose-700', info.tone === 'soon' && 'text-amber-700', info.tone === 'none' && 'text-muted-foreground')}>
        {info.label}
      </span>
      {info.chip ? (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
            info.tone === 'expired' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700',
          )}
          title={info.tone === 'expired' ? 'Affiliation expired' : `Affiliation expires in ${info.days ?? 0} days`}
        >
          <CalendarClock aria-hidden="true" className="size-3" />{info.chip}
        </span>
      ) : null}
    </span>
  );
}

export function SearchBox({
  value, onChange, placeholder, label, className, onClear,
}: { value: string; onChange: (v: string) => void; placeholder: string; label?: string; className?: string; onClear?: (() => void) | undefined }) {
  return (
    <div className={cn('relative w-full sm:w-64', className)}>
      <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        className={cn('h-9 pl-9', onClear && 'pr-9')}
        onChange={(e) => onChange(e.target.value)}
      />
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          title="Clear search and filters"
          aria-label="Clear search and filters"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground motion-reduce:transition-none"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

export interface ViewedDocument {
  title: string;
  subtitle: string;
  url: string;
}

const VIEWER_WIDTH = 'min(1024px, calc(100vw - 1rem))';

/** Naji's DocViewer: the file in a tall dialog, with Open in new tab + Download. */
export function DocViewerDialog({ doc, onClose }: { doc: ViewedDocument | null; onClose: () => void }) {
  return (
    <Dialog open={doc !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        style={{ width: VIEWER_WIDTH, maxWidth: VIEWER_WIDTH }}
        className="top-2 flex h-[78vh] translate-y-0 sm:h-[88vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0 sm:top-[50%] sm:translate-y-[-50%]"
      >
        {doc ? (
          <>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 pr-12">
              <div className="min-w-0">
                <DialogTitle className="truncate text-sm font-semibold">{doc.title}</DialogTitle>
                <DialogDescription className="truncate text-xs">{doc.subtitle}</DialogDescription>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" className="size-4" /> <span className="hidden sm:inline">Open in new tab</span></a>
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" download><Download aria-hidden="true" className="size-4" /> <span className="hidden sm:inline">Download</span></a>
                </Button>
              </div>
            </div>
            {opensInline(doc.url) ? (
              <iframe src={doc.url} title={doc.title} className="min-h-0 w-full flex-1 bg-muted" />
            ) : (
              <p className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
                This file type cannot be previewed here. Open it in a new tab or download it.
              </p>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
