import { useEffect, useMemo, useState } from 'react';
import { Layers, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { SubjectRow } from './question-bank-model.js';

// Pick one subject from a searchable list — "Move to another subject" for the
// selected questions, and "Add Question" from the Question Bank list.

export function SubjectPickerDialog({
  open, title, description, confirmLabel, busyLabel = 'Working…', subjects, excludeId = null, busy = false, onClose, onPick,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busyLabel?: string;
  subjects: SubjectRow[] | null;
  excludeId?: number | null;
  busy?: boolean;
  onClose: () => void;
  onPick: (subjectId: number) => void;
}) {
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<number | null>(null);
  useEffect(() => { if (open) { setSearch(''); setTarget(null); } }, [open]);

  const options = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (subjects ?? [])
      .filter((s) => s.id !== excludeId)
      .filter((s) => !q || s.title.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.courses.some((c) => c.title.toLowerCase().includes(q)));
  }, [subjects, search, excludeId]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0"
        style={{ width: 'min(560px, calc(100vw - 2rem))', maxWidth: 'min(560px, calc(100vw - 2rem))' }}
      >
        <DialogHeader className="shrink-0 border-b border-border p-5">
          <DialogTitle className="flex items-center gap-2"><Layers aria-hidden="true" className="size-4" /> {title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="shrink-0 p-4 pb-2">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search subjects" placeholder="Search subject, code or course…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div role="radiogroup" aria-label="Subject" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 pb-4">
          {subjects === null ? <p className="py-6 text-center text-sm text-muted-foreground">Loading subjects…</p> : null}
          {subjects !== null && options.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No subject matches.</p> : null}
          {options.map((s) => (
            <label
              key={s.id}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
                target === s.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40',
              )}
            >
              <input type="radio" name="qb-subject-pick" className="mt-1 size-3.5 accent-primary" checked={target === s.id} onChange={() => setTarget(s.id)} />
              <span className="min-w-0">
                <span className="block font-medium text-foreground">{s.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[s.code, s.courses.map((c) => c.title).join(', ')].filter(Boolean).join(' · ') || 'No course'} · {s.total} question{s.total === 1 ? '' : 's'}
                </span>
              </span>
            </label>
          ))}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-border p-4">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={() => { if (target !== null) onPick(target); }} disabled={busy || target === null}>
            {busy ? busyLabel : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
