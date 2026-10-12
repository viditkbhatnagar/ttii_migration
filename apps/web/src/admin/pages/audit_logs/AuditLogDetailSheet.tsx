import { ExternalLink, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Pill } from '../../shared/components/ui-kit.js';
import { istDateTime } from '../../shared/utils/ist-date.js';
import { actorLabel, auditStatus, parseUserAgent, recordLabel, type AuditRow } from './audit-logs-model.js';

// The prototype's "Audit details" drawer, on what we record. No Change Details
// (old / new value) or Session / Location sections: nothing stores them.

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <span className={cn('min-w-0 break-words text-right text-sm font-medium text-foreground', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  );
}

export function AuditLogDetailSheet({
  row, onClose, onNavigate,
}: { row: AuditRow | null; onClose: () => void; onNavigate: (href: string) => void }) {
  const ua = parseUserAgent(row?.userAgent ?? '');
  return (
    <Sheet open={row !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
        {row ? (
          <>
            <SheetHeader className="space-y-3 border-b border-border p-6 pb-4">
              <div className="flex items-center justify-between gap-2 pr-8">
                <span className="font-mono text-xs font-semibold text-primary">{row.event}</span>
                <Pill tone={row.success ? 'emerald' : 'rose'}>{auditStatus(row)}</Pill>
              </div>
              <SheetTitle className="text-lg">{row.action}</SheetTitle>
              <SheetDescription className="text-xs">
                {istDateTime(row.at) || 'Time not recorded'} · {row.category}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5 p-6">
              <Section title="Activity Summary">
                <Detail label="User" value={actorLabel(row)} />
                <Detail label="Role" value={row.userRole} />
                <Detail label="Email" value={row.userEmail} />
                <Detail label="User ID" value={row.userId} mono />
                <Detail label="Sign-in name" value={row.identifier} />
                <Detail label="Source" value={row.source === 'auth' ? 'Sign-in log' : 'Application history'} />
                <Detail label="Action" value={row.action} />
                <Detail label="Description" value={row.description} />
                {row.details.map((d) => <Detail key={d.label} label={d.label} value={d.value} />)}
              </Section>

              {row.source === 'auth' ? (
                <Section title="Technical Information">
                  <Detail label="IP Address" value={row.ipAddress || 'Not recorded'} mono />
                  <Detail label="Browser" value={ua.browser} />
                  <Detail label="Device" value={ua.device} />
                  <Detail label="User Agent" value={row.userAgent} mono />
                </Section>
              ) : null}

              {row.applicationId ? (
                <Section title="Related Record">
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">Application</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">{recordLabel(row)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1.5"
                      onClick={() => { onClose(); onNavigate(`/admin/applications/view/${row.applicationId}`); }}
                    >
                      <ExternalLink aria-hidden="true" className="size-3.5" /> View Record
                    </Button>
                  </div>
                </Section>
              ) : null}

              <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <Key aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                Audit entries are read-only here: they cannot be edited or deleted from the admin portal.
              </p>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
