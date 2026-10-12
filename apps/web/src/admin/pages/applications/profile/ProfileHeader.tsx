import type { ReactNode } from 'react';
import {
  ArrowLeft, CheckCircle2, Download, Mail, MapPin, Pencil, Phone, Plus, RotateCcw, Send, Trash2, UserCog, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { asString } from '../../../shared/utils/admin-data-utils.js';
import { displayPhone, initials } from '../application-list-model.js';
import type { StageAction, StageStep } from '../application-profile-model.js';
import { StageBadge } from '../StageBadge.js';
import { PipelineProgress } from './ActivityTabs.js';

// Header card of Naji's ApplicationProfile: breadcrumb, identity, the stage's
// next-step actions (Naji 2026-05-07 — contextual by stage), Edit / Delete, and
// the pipeline progress bar.

export interface HeaderHandlers {
  onBack: () => void;
  onPlan: () => void;
  onMarkPaid: () => void;
  onSendFormLink: () => void;
  onAdminApprove: () => void;
  onReject: () => void;
  onMarkApproved: () => void;
  onDownloadPdf: () => void;
  onReopen: () => void;
  onReassign: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const SUCCESS = 'bg-emerald-600 text-white hover:bg-emerald-700';

function actionButton(a: StageAction, p: { busy: boolean; hasPlan: boolean; allVerified: boolean; h: HeaderHandlers }): ReactNode {
  const { busy, h } = p;
  switch (a) {
    case 'generate_plan':
      return <Button key={a} size="sm" className="gap-1.5" disabled={busy} onClick={h.onPlan}><Plus aria-hidden="true" className="size-4" />{p.hasPlan ? 'Edit / Resend Payment Plan' : 'Generate Payment Link'}</Button>;
    case 'resend_plan':
      return <Button key={a} size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={h.onPlan}><Pencil aria-hidden="true" className="size-4" />Edit / Resend Payment Plan</Button>;
    case 'mark_paid':
      return <Button key={a} size="sm" className={`gap-1.5 ${SUCCESS}`} disabled={busy} onClick={h.onMarkPaid}><CheckCircle2 aria-hidden="true" className="size-4" />Mark as Paid</Button>;
    case 'send_form_link':
    case 'resend_form_link':
      return <Button key={a} size="sm" className="gap-1.5" disabled={busy} onClick={h.onSendFormLink}><Send aria-hidden="true" className="size-4" />{a === 'resend_form_link' ? 'Resend Application Form Link' : 'Send Application Form Link'}</Button>;
    case 'admin_approve':
      return (
        <Button key={a} size="sm" className={`gap-1.5 ${SUCCESS}`} disabled={busy || !p.allVerified} title={p.allVerified ? undefined : 'Verify all sections and documents to enable approval.'} onClick={h.onAdminApprove}>
          <CheckCircle2 aria-hidden="true" className="size-4" />Admin Approve &amp; Enrol
        </Button>
      );
    case 'reject':
      return <Button key={a} size="sm" variant="destructive" className="gap-1.5" disabled={busy} onClick={h.onReject}><XCircle aria-hidden="true" className="size-4" />Reject</Button>;
    case 'mark_approved':
      return <Button key={a} size="sm" className={SUCCESS} disabled={busy} onClick={h.onMarkApproved}>Mark Approved</Button>;
    case 'download_pdf':
      return <Button key={a} size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={h.onDownloadPdf}><Download aria-hidden="true" className="size-4" />Download Application PDF</Button>;
    default:
      return null;
  }
}

export function ProfileHeader({
  app, stage, steps, actions, busy, hasPlan, allVerified, canReassign, handlers,
}: {
  app: Record<string, unknown>;
  stage: string;
  steps: StageStep[];
  actions: StageAction[];
  busy: boolean;
  hasPlan: boolean;
  allVerified: boolean;
  canReassign: boolean;
  handlers: HeaderHandlers;
}) {
  const name = asString(app.name);
  const appId = asString(app.application_id);
  const phone = displayPhone(app) || asString(app.phone);
  const email = asString(app.user_email) || (asString(app.email).includes('@') ? asString(app.email) : '');
  const location = [asString(app.district), asString(app.state)].filter(Boolean).join(', ');
  const photo = asString(app.image);
  // Naji UAT 2026-07-27 — the column is `rejection_reason`; keep the old key as a fallback.
  const reason = asString(app.rejection_reason) || asString(app.reject_reason);
  const h = handlers;

  return (
    <>
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <button type="button" onClick={h.onBack} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden="true" className="size-4" /> All Applications
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="font-mono text-xs">{appId || '—'}</span>
      </nav>

      <Card className="gap-0 p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-5">
          <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-lg font-semibold text-primary-foreground">
            {photo ? <img src={photo} alt={`${name || 'Applicant'} photo`} className="size-full object-cover" /> : initials(name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{name || 'Unnamed applicant'}</h1>
              <StageBadge stage={stage} />
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {appId ? <span className="font-mono">{appId}</span> : null}
              {phone ? <span className="inline-flex items-center gap-1"><Phone aria-hidden="true" className="size-3" /> {phone}</span> : null}
              {email ? <span className="inline-flex items-center gap-1"><Mail aria-hidden="true" className="size-3" /> {email}</span> : null}
              {location ? <span className="inline-flex items-center gap-1"><MapPin aria-hidden="true" className="size-3" /> {location}</span> : null}
            </div>
            {reason ? <p className="mt-2 text-sm text-rose-700">Reason: {reason}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actions.map((a) => actionButton(a, { busy, hasPlan, allVerified, h }))}
            {stage === 'rejected' ? (
              <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={h.onReopen} title="Puts the application back on the pipeline so a payment link can be sent again.">
                <RotateCcw aria-hidden="true" className="size-4" /> Reopen Application
              </Button>
            ) : null}
            {canReassign ? (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={h.onReassign}><UserCog aria-hidden="true" className="size-4" /> Reassign</Button>
            ) : null}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={h.onEdit}><Pencil aria-hidden="true" className="size-4" /> Edit</Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={h.onDelete}><Trash2 aria-hidden="true" className="size-4" /> Delete</Button>
          </div>
        </div>
        {actions.includes('admin_approve') && !allVerified ? (
          <p className="mt-3 text-right text-xs font-medium text-amber-700">Verify all sections and documents to enable approval.</p>
        ) : null}
        {actions.length === 0 && stage !== 'rejected' ? (
          <p className="mt-3 text-right text-xs text-muted-foreground">No further stage actions available.</p>
        ) : null}

        <div className="mt-7">
          <PipelineProgress steps={steps} />
        </div>
      </Card>
    </>
  );
}
