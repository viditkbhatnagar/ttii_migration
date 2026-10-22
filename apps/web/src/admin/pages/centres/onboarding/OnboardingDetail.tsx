import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowLeft, Award, Building2, CheckCircle2, Clock, Copy, Eye, FileSignature, Flag, Pencil, RefreshCw,
  RotateCcw, Send, Upload, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AdminPortalApi } from '../../../admin-portal-api.js';
import { Pill } from '../../../shared/components/ui-kit.js';
import { messageFromError } from '../../../shared/utils/admin-data-utils.js';
import { DocViewerDialog } from './DocViewerDialog.js';
import {
  SECTIONS, duplicateMessages, fmtDate, inr, locationOf, stepTracker, verifiedCount,
  type OnbDetail, type SectionField,
} from './onboarding-model.js';
import { AgeingBadge, DocLink, Info, StageBadge, type ViewerDoc } from './onboarding-ui.js';
import { copyText, useOnboardingAction } from './use-onboarding-action.js';

// Centre Onboarding record (Naji's OnbView): header + stage actions, the
// 5-step tracker, the submitted application with per-section Verify / Flag,
// the signed agreement, the affiliation certificate and the activity timeline.
// "Request Changes" is on Under Review (in Naji's plan; the prototype had the
// dialog but no button). "Simulate centre submission" is gone: the centre
// submits the real public form.

export type DetailDialog = 'edit' | 'send' | 'reject' | 'changes' | 'agreement' | 'certificate';

export function OnboardingDetail({ detail, api, token, onBack, onNavigate, onDialog, reload }: {
  detail: OnbDetail;
  api: AdminPortalApi;
  token: string;
  onBack: () => void;
  onNavigate: (href: string) => void;
  onDialog: (d: DetailDialog) => void;
  reload: () => void;
}) {
  const [doc, setDoc] = useState<ViewerDoc | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const { run, busy } = useOnboardingAction(api, token);
  const r = detail.record;
  const steps = stepTracker(detail);
  const verified = verifiedCount(r.verification);
  const allVerified = verified === SECTIONS.length;
  const warnings = duplicateMessages(detail);
  const reviewing = r.stage === 'under_review';

  const act = async (action: 'expire_link' | 'approve' | 'reopen', quiet = false) => {
    const res = await run(action, { id: r.id }, { quiet });
    if (res) reload();
  };
  const verify = async (section: string, state: 'verified' | 'flagged') => {
    const res = await run('verify', { id: r.id, section, state }, { quiet: true });
    if (res) reload();
  };
  const regenerate = async (certificateId: string) => {
    setRegenerating(true);
    try {
      const res = await api.affiliationAction(token, 'regenerate_pdf', { certificate_id: certificateId });
      toast.success(res.message);
      reload();
    } catch (err: unknown) {
      toast.error(messageFromError(err));
    } finally {
      setRegenerating(false);
    }
  };

  const fieldValue = (f: SectionField) => {
    const form = detail.form;
    if (!form) return '—';
    const v = form[f.key];
    if (f.doc) {
      const d = v && typeof v === 'object' ? v : null;
      return d ? <DocLink name={d.name} url={d.url} subtitle={`${f.label} — ${r.centreName}`} onOpen={setDoc} /> : '—';
    }
    return typeof v === 'string' && v ? v : '—';
  };

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to onboarding
      </button>

      <Card className="gap-0 border-border/70 p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Building2 aria-hidden="true" className="size-6" /></span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground">{r.centreName}</h1>
                <StageBadge row={r} />
                <AgeingBadge row={r} today={detail.today} />
              </div>
              <p className="break-words text-sm text-muted-foreground">{[r.refNo, r.contactName, r.mobile, r.email, locationOf(r)].filter(Boolean).join(' · ')}</p>
              {r.centreCode && ['agreement_pending', 'certificate_pending', 'onboarded'].includes(r.stage) ? (
                <p className="mt-1 text-sm font-medium text-foreground">Centre Code: {r.centreCode}</p>
              ) : null}
              {r.stage === 'lead' && detail.link ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Form link sent {fmtDate(r.linkSentAt)} · {detail.link.open ? `open until ${fmtDate(detail.link.expiresAt)}` : 'expired'}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {r.stage !== 'onboarded' ? <Button variant="outline" className="gap-1.5" onClick={() => onDialog('edit')}><Pencil aria-hidden="true" className="size-4" />Edit</Button> : null}
            {r.stage === 'lead' && !r.linkSentAt ? <Button className="gap-1.5" onClick={() => onDialog('send')}><Send aria-hidden="true" className="size-4" />Send Form Link</Button> : null}
            {r.stage === 'lead' && r.linkSentAt ? (
              <>
                <Button variant="outline" className="gap-1.5" onClick={() => onDialog('send')}><RotateCcw aria-hidden="true" className="size-4" />Resend</Button>
                {detail.link?.open ? (
                  <Button variant="outline" className="gap-1.5" onClick={() => { void copyText(detail.link?.url ?? '').then((ok) => (ok ? toast.success('Link copied') : toast.error('Copy failed: open Resend to see the link.'))); }}>
                    <Copy aria-hidden="true" className="size-4" />Copy Link
                  </Button>
                ) : null}
                {detail.link?.open && !r.linkExpired ? <Button variant="outline" disabled={busy} onClick={() => { void act('expire_link'); }}>Mark Expired</Button> : null}
              </>
            ) : null}
            {reviewing ? (
              <>
                <Button variant="outline" className="gap-1.5 text-destructive" onClick={() => onDialog('reject')}><XCircle aria-hidden="true" className="size-4" />Reject</Button>
                <Button variant="outline" className="gap-1.5" onClick={() => onDialog('changes')}><RotateCcw aria-hidden="true" className="size-4" />Request Changes</Button>
                <Button className="gap-1.5" disabled={!allVerified || busy} title={allVerified ? undefined : 'Verify every section first'} onClick={() => { void act('approve'); }}>
                  <CheckCircle2 aria-hidden="true" className="size-4" />Approve
                </Button>
              </>
            ) : null}
            {r.stage === 'agreement_pending' ? <Button className="gap-1.5" onClick={() => onDialog('agreement')}><Upload aria-hidden="true" className="size-4" />Upload Signed Agreement</Button> : null}
            {r.stage === 'certificate_pending' ? <Button className="gap-1.5" onClick={() => onDialog('certificate')}><Award aria-hidden="true" className="size-4" />Generate Certificate</Button> : null}
            {r.stage === 'onboarded' && r.centreId ? (
              <Button variant="outline" className="gap-1.5" onClick={() => onNavigate(`/admin/centres/view/${r.centreId}`)}><Building2 aria-hidden="true" className="size-4" />Open Centre Profile</Button>
            ) : null}
            {r.stage === 'rejected' ? <Button className="gap-1.5" disabled={busy} onClick={() => { void act('reopen'); }}><RotateCcw aria-hidden="true" className="size-4" />Reopen as Lead</Button> : null}
          </div>
        </div>

        <ol className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {steps.map((s, i) => (
            <li key={s.stage} aria-current={s.state === 'current' ? 'step' : undefined} className={cn('rounded-xl border p-3', s.state === 'done' ? 'border-emerald-200 bg-emerald-50/60' : s.state === 'current' ? 'border-primary bg-primary/5' : 'border-border')}>
              <div className="flex items-center gap-2 text-xs font-semibold">
                {s.state === 'done' ? <CheckCircle2 aria-hidden="true" className="size-4 text-emerald-600" /> : s.state === 'current' ? <Clock aria-hidden="true" className="size-4 text-primary" /> : <span className="grid size-4 place-items-center rounded-full border text-[9px]">{i + 1}</span>}
                {s.label}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{s.note}</p>
            </li>
          ))}
        </ol>
        {r.stage === 'rejected' ? <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">Rejected on {fmtDate(r.rejectedAt)}: {r.rejectReason}</p> : null}
        {r.remarks && r.stage === 'lead' && r.linkSentAt ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Changes requested: {r.remarks}</p> : null}
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 space-y-5 lg:col-span-2">
          {detail.form ? (
            <Card className="gap-0 border-border/70 p-5 shadow-[var(--shadow-soft)]">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="font-semibold">Submitted Application</h2>
                {reviewing ? <span className="text-xs text-muted-foreground">{verified}/{SECTIONS.length} sections verified</span> : null}
              </div>
              {warnings.length > 0 ? (
                <div role="status" className="mb-4 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {warnings.map((w) => <p key={w} className="flex items-start gap-2"><AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{w}</p>)}
                </div>
              ) : null}
              <div className="space-y-4">
                {SECTIONS.map((sec) => {
                  const v = r.verification[sec.key];
                  return (
                    <section key={sec.key} aria-label={sec.title} className="rounded-xl border border-border p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{sec.title}</p>
                        {reviewing ? (
                          <div className="flex gap-1.5">
                            <Button size="sm" variant={v === 'verified' ? 'default' : 'outline'} aria-pressed={v === 'verified'} disabled={busy} className="h-7 gap-1 text-xs" onClick={() => { void verify(sec.key, 'verified'); }}>
                              <CheckCircle2 aria-hidden="true" className="size-3.5" />Verify
                            </Button>
                            <Button size="sm" variant={v === 'flagged' ? 'destructive' : 'outline'} aria-pressed={v === 'flagged'} disabled={busy} className="h-7 gap-1 text-xs" onClick={() => { void verify(sec.key, 'flagged'); }}>
                              <Flag aria-hidden="true" className="size-3.5" />Flag
                            </Button>
                          </div>
                        ) : v ? (
                          <span className={cn('text-[11px] font-semibold', v === 'verified' ? 'text-emerald-700' : 'text-rose-700')}>{v === 'verified' ? 'Verified' : 'Flagged'}</span>
                        ) : null}
                      </div>
                      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                        {sec.fields.map((f) => <Info key={f.key} label={f.label} value={fieldValue(f)} />)}
                      </dl>
                    </section>
                  );
                })}
              </div>
            </Card>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">The centre hasn&apos;t submitted the application form yet.</div>
          )}

          {detail.agreement ? (
            <Card className="gap-0 border-border/70 p-5 shadow-[var(--shadow-soft)]">
              <h2 className="mb-3 flex items-center gap-2 font-semibold"><FileSignature aria-hidden="true" className="size-4" />Signed Agreement</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <Info label="Agreement No." value={detail.agreement.agreementNo} />
                <Info label="Effective" value={fmtDate(detail.agreement.effectiveDate)} />
                <Info label="Expiry" value={`${fmtDate(detail.agreement.expiryDate)} (${detail.agreement.termYears} yr)`} />
                {detail.agreement.signedOn ? <Info label="Signed on" value={fmtDate(detail.agreement.signedOn)} /> : null}
                {detail.agreement.ttiiSignatory ? <Info label="TTII signatory" value={detail.agreement.ttiiSignatory} /> : null}
                {detail.agreement.centreSignatory ? <Info label="Centre signatory" value={detail.agreement.centreSignatory} /> : null}
                <Info label="Affiliation fee" value={`${inr(detail.agreement.feeAmount)} · ${detail.agreement.feePaid ? `Paid${detail.agreement.feePaidOn ? ` on ${fmtDate(detail.agreement.feePaidOn)}` : ''}` : 'Unpaid'}`} />
                <Info label="File" value={<DocLink name={detail.agreement.fileName} url={detail.agreement.fileUrl} subtitle={`Signed agreement ${detail.agreement.agreementNo} — ${r.centreName}`} onOpen={setDoc} />} />
                {detail.agreement.notes ? <Info label="Notes" value={detail.agreement.notes} /> : null}
              </dl>
              <Button variant="outline" size="sm" className="mt-3 w-fit gap-1.5" onClick={() => setDoc({ title: `Agreement ${detail.agreement?.agreementNo ?? ''}`, subtitle: r.centreName, url: detail.agreement?.fileUrl ?? '' })}>
                <Eye aria-hidden="true" className="size-4" />View PDF
              </Button>
            </Card>
          ) : null}

          {detail.certificate ? (
            <Card className="gap-0 border-border/70 p-5 shadow-[var(--shadow-soft)]">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-semibold"><Award aria-hidden="true" className="size-4" />Affiliation Certificate</h2>
                <Pill tone={detail.certificate.status === 'Valid' ? 'emerald' : detail.certificate.status === 'Revoked' ? 'slate' : 'rose'}>{detail.certificate.status}</Pill>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <Info label="Certificate No." value={detail.certificate.certificateNo} />
                <Info label="Valid from" value={fmtDate(detail.certificate.validFrom)} />
                <Info label="Valid to" value={fmtDate(detail.certificate.validTo)} />
              </dl>
              {detail.certificate.fileUrl ? (
                <Button variant="outline" size="sm" className="mt-3 w-fit gap-1.5" onClick={() => setDoc({ title: `Affiliation Certificate ${detail.certificate?.certificateNo ?? ''}`, subtitle: r.centreName, url: detail.certificate?.fileUrl ?? '' })}>
                  <Eye aria-hidden="true" className="size-4" />View PDF
                </Button>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <p className="text-xs text-muted-foreground">The certificate PDF has not been generated.</p>
                  <Button variant="outline" size="sm" className="gap-1.5" disabled={regenerating} onClick={() => { void regenerate(detail.certificate?.id ?? ''); }}>
                    <RefreshCw aria-hidden="true" className="size-4" />{regenerating ? 'Generating...' : 'Regenerate PDF'}
                  </Button>
                </div>
              )}
            </Card>
          ) : null}
        </div>

        <Card className="h-fit gap-0 border-border/70 p-5 shadow-[var(--shadow-soft)]">
          <h2 className="mb-3 font-semibold">Activity</h2>
          {detail.events.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : (
            <ol className="space-y-3 border-l border-border pl-4">
              {detail.events.map((e) => (
                <li key={e.id} className="relative">
                  <span aria-hidden="true" className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" />
                  <p className="break-words text-sm">{e.message}</p>
                  <p className="text-[11px] text-muted-foreground">{fmtDate(e.at)} · {e.by}</p>
                </li>
              ))}
            </ol>
          )}
          <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <Info label="Source" value={r.source} />
            {r.notes ? <Info label="Notes" value={<span className="whitespace-pre-line">{r.notes}</span>} /> : null}
          </dl>
        </Card>
      </div>
      <DocViewerDialog doc={doc} onClose={() => setDoc(null)} />
    </div>
  );
}
