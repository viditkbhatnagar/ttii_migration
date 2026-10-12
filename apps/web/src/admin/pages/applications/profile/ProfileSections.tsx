import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Briefcase, Check, CheckCircle2, Circle, FileText, GraduationCap, MapPin, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { asString, formatDate, toRecords } from '../../../shared/utils/admin-data-utils.js';
import { displayPhone } from '../application-list-model.js';
import { formatDateOnly, type ApplicationDocument } from '../application-profile-model.js';

// Building blocks of Naji's ApplicationProfile tabs: a titled section card with
// an icon tile, label/value fields, and the Overview / Application / Documents
// tab bodies. Every value shown here comes from /admin/applications/get.

export function Section({
  title, icon: Icon, action, children, className,
}: { title: string; icon: LucideIcon; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={cn('gap-0 p-6 shadow-sm', className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon aria-hidden="true" className="size-4" />
          </span>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function FieldGrid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <dl className={cn('grid gap-x-6 gap-y-4', cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>{children}</dl>;
}

export function Field({ label, value, full }: { label: string; value: ReactNode; full?: boolean }) {
  const empty = value === '' || value === null || value === undefined;
  return (
    <div className={cn('min-w-0', full && 'sm:col-span-2')}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium">{empty ? <span className="text-muted-foreground">-</span> : value}</dd>
    </div>
  );
}

/** Admin-only Verify toggle (Naji UAT 2026-05-31) for a section or one document. */
export function VerifyButton({ isVerified, busy, onToggle }: { isVerified: boolean; busy: boolean; onToggle: (next: boolean) => void }) {
  return isVerified ? (
    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onToggle(false)} className="h-8 gap-1 border-emerald-300 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800">
      <Check aria-hidden="true" className="size-3.5" /> Verified
    </Button>
  ) : (
    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onToggle(true)} className="h-8 border-amber-300 text-xs font-semibold text-amber-700 hover:bg-amber-50">
      {busy ? 'Saving…' : 'Verify'}
    </Button>
  );
}

const money = (v: unknown) => (asString(v) ? `₹${asString(v)}` : '');
const phoneOf = (app: Record<string, unknown>) => displayPhone(app) || asString(app.phone);
const emailOf = (app: Record<string, unknown>) => asString(app.user_email) || asString(app.email);

export function OverviewTab({ app, leadStage }: { app: Record<string, unknown>; leadStage: boolean }) {
  return (
    <div className="space-y-6">
      <Section title="Personal & Contact Information" icon={User}>
        <FieldGrid>
          <Field label="Application ID" value={asString(app.application_id)} />
          <Field label="Name" value={asString(app.name)} />
          <Field label="Email ID" value={emailOf(app)} />
          <Field label="Phone" value={phoneOf(app)} />
          <Field label="Created" value={formatDate(app.created_at)} />
        </FieldGrid>
      </Section>
      <Section title="Course Information" icon={FileText}>
        <FieldGrid>
          <Field label="Course" value={asString(app.course_title)} />
          <Field label="Offering" value={asString(app.offering_title)} />
          <Field label="Certificate Combination" value={asString(app.combination_title)} />
          <Field label="Source" value={asString(app.marketing_source_display) || asString(app.marketing_source) || asString(app.lead_source)} />
          <Field label="Pipeline" value={asString(app.pipeline)} />
          <Field label="Pipeline User" value={asString(app.pipeline_user_name)} />
        </FieldGrid>
        {leadStage ? (
          <p className="mt-4 text-xs text-muted-foreground">Full applicant details will appear here once the student submits the application form.</p>
        ) : null}
      </Section>
      {!leadStage ? (
        <Section title="Enrolment & Fee" icon={GraduationCap}>
          <FieldGrid>
            <Field label="Batch" value={asString(app.batch_title)} />
            <Field label="Enrolment Date" value={formatDate(app.enrollment_date)} />
            <Field label="Mode of Study" value={asString(app.mode_of_study)} />
            <Field label="Language" value={asString(app.language_name) || asString(app.preferred_language)} />
            <Field label="Course Fee" value={money(app.course_fee)} />
            <Field label="Discount" value={asString(app.discount) ? `${asString(app.discount)}%` : ''} />
            <Field label="GST Applicability" value={asString(app.gst_applicability)} />
            <Field label="Final Course Fee" value={money(app.final_course_fee)} />
            <Field label="Application Status" value={asString(app.status)} />
            <Field label="Stage" value={asString(app.stage)} />
          </FieldGrid>
        </Section>
      ) : null}
    </div>
  );
}

interface VerifyProps {
  isAdmin: boolean;
  verified: Set<string>;
  busyKey: string | null;
  onToggle: (key: string, next: boolean) => void;
}

function verifyAction(key: string, v: VerifyProps) {
  return v.isAdmin ? <VerifyButton isVerified={v.verified.has(key)} busy={v.busyKey === key} onToggle={(next) => v.onToggle(key, next)} /> : null;
}

export function ApplicationTab({ app, educationPathway, verify }: { app: Record<string, unknown>; educationPathway: unknown; verify: VerifyProps }) {
  const pathway = toRecords(educationPathway);
  const photo = asString(app.image);
  return (
    <div className="space-y-6">
      <Section title="Personal Information" icon={User} action={verifyAction('basic', verify)}>
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex shrink-0 flex-col items-center gap-2">
            {photo ? (
              <img src={photo} alt={asString(app.name) || 'Profile photo'} className="size-32 rounded-xl border border-border object-cover" loading="lazy" />
            ) : (
              <div className="flex size-32 items-center justify-center rounded-xl border border-dashed border-border bg-muted text-2xl font-semibold text-muted-foreground">
                {(asString(app.name) || '?').slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-xs text-muted-foreground">Profile Photo</span>
          </div>
          <div className="flex-1">
            <FieldGrid>
              <Field label="Full Name" value={asString(app.name)} />
              <Field label="Date of Birth" value={formatDateOnly(app.date_of_birth)} />
              <Field label="Age" value={asString(app.age)} />
              <Field label="Gender" value={asString(app.gender)} />
              <Field label="Marital Status" value={asString(app.marital_status)} />
              <Field label="Nationality" value={asString(app.nationality_name) || asString(app.nationality)} />
              <Field label="Aadhaar No" value={asString(app.aadhar_no)} />
              <Field label="Passport No" value={asString(app.passport_no)} />
              <Field label="Father's Name" value={asString(app.father_name)} />
              <Field label="Mother's Name" value={asString(app.mother_name)} />
              <Field label="Guardian's Name" value={asString(app.guardian_name)} />
            </FieldGrid>
          </div>
        </div>
      </Section>

      <Section title="Contact Information" icon={MapPin}>
        <FieldGrid>
          <Field label="Email" value={emailOf(app)} />
          <Field label="Phone" value={phoneOf(app)} />
          <Field label="Alternate Phone" value={asString(app.second_phone)} />
          <Field label="WhatsApp" value={asString(app.whatsapp_no)} />
          <Field label="Country" value={asString(app.country_name) || asString(app.country) || asString(app.country_id)} />
          <Field label="State" value={asString(app.state)} />
          <Field label="City / District" value={asString(app.district)} />
          <Field label="Permanent Address" value={asString(app.address)} full />
          <Field label="Correspondence Address" value={asString(app.native_address)} full />
        </FieldGrid>
      </Section>

      <Section title="Qualification & Employment" icon={Briefcase} action={verifyAction('qualification', verify)}>
        <FieldGrid>
          <Field label="Highest Qualification" value={asString(app.highest_qualification)} />
          <Field label="Specialization" value={asString(app.specialization)} />
          <Field label="School / College" value={asString(app.institution_name)} />
          <Field label="Year of Passing" value={asString(app.year_of_passing)} />
          <Field label="Employment Status" value={asString(app.employment_status)} />
          <Field label="Current Occupation" value={asString(app.current_occupation)} />
          <Field label="Experience" value={asString(app.work_experience)} />
        </FieldGrid>
      </Section>

      <Section title="Education Pathway" icon={GraduationCap}>
        {pathway.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Qualification</th>
                  <th className="py-2 pr-3">Specialization</th>
                  <th className="py-2 pr-3">Institution</th>
                  <th className="py-2 pr-3">Board</th>
                  <th className="py-2 pr-3">Year</th>
                  <th className="py-2 pr-3">Marks</th>
                </tr>
              </thead>
              <tbody>
                {pathway.map((row, idx) => (
                  <tr key={idx} className="border-b border-border/60 last:border-0">
                    <td className="py-3 pr-3 font-medium">{asString(row.qualification) || '-'}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{asString(row.specialization) || '-'}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{asString(row.institution) || '-'}</td>
                    <td className="py-3 pr-3">{asString(row.board) || '-'}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{asString(row.year_passed) || '-'}</td>
                    <td className="py-3 pr-3">{asString(row.marks) || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No education pathway entries recorded.</p>
        )}
      </Section>
    </div>
  );
}

export function DocumentsTab({ documents, verify }: { documents: ApplicationDocument[]; verify: VerifyProps }) {
  return (
    <Section title="Documents" icon={FileText} action={verifyAction('documents', verify)}>
      <p className="-mt-2 mb-4 text-xs text-muted-foreground">Uploaded paperwork &amp; verification. Documents are added or replaced from Edit Application.</p>
      {documents.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {documents.map((doc, idx) => {
            const key = `doc:${idx}`;
            const isVerified = verify.verified.has(key);
            const label = asString(doc.label) || asString(doc.name) || `Document ${idx + 1}`;
            const url = asString(doc.url);
            return (
              <li key={idx} className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/30">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileText aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={label}>{label}</p>
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    {isVerified
                      ? <><CheckCircle2 aria-hidden="true" className="size-3 text-emerald-600" /> Verified</>
                      : <><Circle aria-hidden="true" className="size-3" /> Pending review</>}
                  </p>
                </div>
                {url ? (
                  <a href={url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">View</a>
                ) : (
                  <span className="text-xs text-muted-foreground">No file</span>
                )}
                {verifyAction(key, verify)}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">No documents uploaded.</p>
      )}
    </Section>
  );
}

export type { VerifyProps };
