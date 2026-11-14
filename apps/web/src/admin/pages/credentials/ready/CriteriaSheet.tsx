import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { AdminPortalApi } from '../../../admin-portal-api.js';
import { Pill } from '../../../shared/components/ui-kit.js';
import { dash, fmtDateTime } from '../credential-format.js';
import type { EligibilityDetail, ReadyRow, SubjectRow } from '../credential-issue-types.js';
import { STAGE_TONE } from './ready-model.js';

const W = 'min(560px, calc(100vw - 1rem))';

function Subjects({ subjects }: { subjects: SubjectRow[] }) {
  if (subjects.length === 0) return null;
  const has = (k: 'credits' | 'internal' | 'theory' | 'practical') => subjects.some((s) => s[k] !== null);
  const cols: Array<[string, (s: SubjectRow) => string]> = [
    ['Subject', (s) => s.title || s.code],
    ...(has('credits') ? [['Credits', (s: SubjectRow) => dash(s.credits)] as [string, (s: SubjectRow) => string]] : []),
    ...(has('internal') ? [['Internal', (s: SubjectRow) => dash(s.internal)] as [string, (s: SubjectRow) => string]] : []),
    ...(has('theory') ? [['Theory', (s: SubjectRow) => dash(s.theory)] as [string, (s: SubjectRow) => string]] : []),
    ...(has('practical') ? [['Practical', (s: SubjectRow) => dash(s.practical)] as [string, (s: SubjectRow) => string]] : []),
    ['Total', (s) => String(s.total)], ['Grade', (s) => s.grade], ['Points', (s) => String(s.points)], ['Result', (s) => s.result],
  ];
  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-semibold">Subjects</h3>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>{cols.map(([h]) => <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.code || s.title} className="border-t border-border">
                {cols.map(([h, f]) => <td key={h} className="px-3 py-2">{f(s)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function CriteriaSheet({ api, token, row, onClose }: { api: AdminPortalApi; token: string; row: ReadyRow | null; onClose: () => void }) {
  const [detail, setDetail] = useState<EligibilityDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!row) return;
    let live = true;
    setDetail(null); setError('');
    api.credentialReadyDetail(token, row.enrolId)
      .then((res) => { if (!live) return; if (res.ok && res.data) setDetail(res.data); else setError(res.message || 'Could not load the criteria.'); })
      .catch((e: unknown) => { if (live) setError(e instanceof Error ? e.message : 'Could not load the criteria.'); });
    return () => { live = false; };
  }, [api, token, row]);
  const shown = detail?.row ?? row;
  return (
    <Sheet open={row !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" style={{ width: W, maxWidth: W }} className="@container overflow-y-auto sm:max-w-none">
        <SheetHeader>
          <SheetTitle>Completion criteria</SheetTitle>
          <SheetDescription>{shown ? `${shown.learner} · ${shown.enrolmentNo}` : ''}</SheetDescription>
        </SheetHeader>
        <div className="grid gap-5 px-4 pb-6">
          {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : null}
          {!detail && !error ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {detail ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={STAGE_TONE[detail.row.status]}>{detail.row.status}</Pill>
                {detail.ruleVersion !== null ? <span className="text-sm text-muted-foreground">{detail.row.percent}% met · Rule v{detail.ruleVersion}</span> : null}
              </div>
              {detail.criteria.length === 0 && detail.ruleVersion === null ? (
                <p className="text-sm text-muted-foreground">No completion rule effective for this batch.</p>
              ) : (
                <ul className="grid gap-2">
                  {detail.criteria.map((c) => (
                    <li key={c.id} className="flex gap-3 rounded-xl border border-border p-3">
                      {c.met
                        ? <CheckCircle2 aria-label="Met" className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                        : <XCircle aria-label="Not met" className="mt-0.5 size-5 shrink-0 text-rose-600" />}
                      <div className="min-w-0 text-sm">
                        <p className="font-medium">{c.label}</p>
                        <p className="text-xs text-muted-foreground">Required: {c.required} · Actual: {c.actual}</p>
                        <p className="text-xs text-muted-foreground">{c.mandatory ? 'Mandatory' : 'Optional'} · {c.source}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Subjects subjects={detail.subjects} />
              <section className="grid gap-2">
                <h3 className="text-sm font-semibold">Hold history</h3>
                {detail.holds.length === 0 ? <p className="text-xs text-muted-foreground">No holds recorded.</p> : detail.holds.map((h) => (
                  <div key={h.id} className="rounded-xl border border-border p-3 text-xs">
                    <p className="text-sm font-medium">{h.reason} · {h.releasedAt ? 'Released' : 'Active'}</p>
                    {h.remarks ? <p className="text-muted-foreground">{h.remarks}</p> : null}
                    <p className="text-muted-foreground">Placed: {fmtDateTime(h.placedAt)} · {dash(h.placedBy)}</p>
                    {h.releasedAt ? <p className="text-muted-foreground">Released: {fmtDateTime(h.releasedAt)} · {dash(h.releasedBy)}</p> : null}
                  </div>
                ))}
              </section>
              <section className="grid gap-2">
                <h3 className="text-sm font-semibold">Action history</h3>
                {detail.history.length === 0 ? <p className="text-xs text-muted-foreground">No actions recorded.</p> : detail.history.map((h) => (
                  <div key={h.id} className="rounded-xl border border-border p-3 text-xs">
                    <p className="text-sm font-medium">{h.action}{h.reason ? ` · ${h.reason}` : ''}</p>
                    <p className="text-muted-foreground">{dash(h.user)} · {fmtDateTime(h.at)}</p>
                  </div>
                ))}
              </section>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
