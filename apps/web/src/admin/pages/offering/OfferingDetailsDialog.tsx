import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { dmy } from '../cohorts/list-model.js';
import { DetailGrid } from '../fee/fee-ui.js';
import type { OfferingRow } from './offering-list-model.js';

// Read-only offering details (Naji's "View" row action). Editing stays on the
// full Edit Offering page, which also manages the certificate packages.

const RELEASE_LABEL: Record<string, string> = { full: 'Full (all at once)', cohort: 'Cohort Based', subject: 'Subject Based' };

export function OfferingDetailsDialog({
  row, onClose, onEdit,
}: { row: OfferingRow | null; onClose: () => void; onEdit: (id: string) => void }) {
  return (
    <Dialog open={row !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        style={{ width: 'min(620px, calc(100vw - 2rem))', maxWidth: 'min(620px, calc(100vw - 2rem))' }}
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0"
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6">
          <DialogTitle className="break-words">{row?.title || 'Offering details'}</DialogTitle>
          <DialogDescription>{row?.course || 'Offering details'}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {row ? (
            <DetailGrid
              items={[
                ['Offering Code', row.code],
                ['Delivery Mode', row.modeLabel],
                ['Academic Year', row.academicYear],
                ['Status', row.status],
                ['Enrollment Start', dmy(row.enrolStartYmd)],
                ['Enrollment End', dmy(row.enrolEndYmd)],
                ['Course Start', dmy(row.startYmd)],
                ['Course End', dmy(row.endYmd)],
                ['Maximum Enrollment', row.maxEnrollment > 0 ? String(row.maxEnrollment) : 'Unlimited'],
                ['Enrollments', String(row.enrolled)],
                ['Cohorts', String(row.cohortCount)],
                ['Pricing Type', row.pricing],
                ['Publish Type', row.publishType ? row.publishType.charAt(0).toUpperCase() + row.publishType.slice(1) : ''],
                ['Content Release', RELEASE_LABEL[row.releaseStrategy] ?? row.releaseStrategy],
                ...(row.mode === 'self_paced' ? [['Course Expiry (Days)', row.expiryDays > 0 ? String(row.expiryDays) : ''] as [string, string]] : []),
                ['Completion Policy', row.completionPolicy],
                ['Certificate Template', row.certificateTemplate],
                ['Language', row.language || 'Any'],
              ]}
            />
          ) : null}
        </div>
        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {row ? <Button onClick={() => { const id = row.id; onClose(); onEdit(id); }}>Edit Offering</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
