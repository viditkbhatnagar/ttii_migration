// Dedicated "Record Payment" modal for the counsellor portal — used when a
// payment arrives offline (cash / bank / cheque / UPI) and the counsellor needs
// to log it directly rather than sending a payment link. Matches Naji's Lovable
// RecordPaymentModal: a student + amount summary header, payment mode, reference,
// receipt upload, paid date and notes. Submits via the existing application
// mark-paid endpoint (api.admin.markApplicationPaid) — the recorded payment goes
// to Finance for approval before it reflects to the student.
//
// Theming note: shadcn Dialog/Select portal to <body> and escape the
// .counsellor-theme wrapper. We add className="counsellor-theme" to every
// portaled *Content so this modal keeps the navy/orange palette instead of
// falling back to the admin magenta.

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload, Wallet } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** Receipt uploader — returns the stored URL (wired to api.admin.uploadFile). */
type UploadFn = (file: File) => Promise<string>;

/** Records the manual payment. Wired by the page to markApplicationPaid. */
type RecordFn = (input: {
  mode: string;
  reference: string;
  receiptUrl: string;
  note: string;
  /** Actual amount received, in rupees. */
  amount: number;
  /** Date the payment was received (YYYY-MM-DD). */
  paidDate: string;
}) => Promise<void>;

interface CounsellorRecordPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  /** Expected amount in rupees. Display-only — omitted gracefully when 0/unknown. */
  amount?: number;
  /** Short context line (e.g. course / offering title). */
  description?: string;
  onUploadReceipt: UploadFn;
  onRecord: RecordFn;
}

const MODE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card / POS' },
  { value: 'upi', label: 'UPI' },
  { value: 'other', label: 'Other' },
];

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fmtInr(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function fileNameFromUrl(url: string): string {
  return url.split('/').pop() || 'Receipt uploaded';
}

export function CounsellorRecordPaymentModal({
  open,
  onOpenChange,
  studentName,
  amount = 0,
  description,
  onUploadReceipt,
  onRecord,
}: CounsellorRecordPaymentModalProps) {
  const [mode, setMode] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [reference, setReference] = useState('');
  const [paidDate, setPaidDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset to a clean slate every time the modal opens so a previous record
  // doesn't bleed into the next one. Amount is prefilled with the expected
  // amount (editable — the recorder confirms/adjusts the actual received).
  useEffect(() => {
    if (!open) return;
    setMode('cash');
    setAmountReceived(amount > 0 ? String(Math.round(amount)) : '');
    setReference('');
    setPaidDate(todayIso());
    setNote('');
    setReceiptUrl('');
    setUploading(false);
    setSubmitting(false);
  }, [open, amount]);

  const handleUpload = (file: File): void => {
    setUploading(true);
    void onUploadReceipt(file)
      .then((url) => {
        setReceiptUrl(url);
        toast.success('Receipt uploaded.');
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Upload failed.'))
      .finally(() => {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      });
  };

  const handleSubmit = (): void => {
    const amountNum = Number(amountReceived);
    if (!(amountNum > 0)) {
      toast.error('Amount received is required.');
      return;
    }
    if (!reference.trim()) {
      toast.error('Reference number is required.');
      return;
    }
    if (!receiptUrl) {
      toast.error('Receipt upload is required.');
      return;
    }
    const modeLabel = MODE_OPTIONS.find((m) => m.value === mode)?.label ?? mode;
    // Fold the paid date into the note so it reaches Finance even though the
    // mark-paid endpoint only persists mode/reference/receipt/note.
    const noteParts = [paidDate ? `Paid on ${paidDate}` : '', note.trim()].filter(Boolean);
    setSubmitting(true);
    void onRecord({
      mode: modeLabel,
      amount: amountNum,
      reference: reference.trim(),
      receiptUrl,
      note: noteParts.join(' — '),
      paidDate,
    })
      .then(() => {
        // Page owns the success toast + reload; just close here.
        onOpenChange(false);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to record payment.'))
      .finally(() => setSubmitting(false));
  };

  const busy = submitting || uploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Width via inline style — a `max-w-[...]` className LOSES to shadcn
          DialogContent's base `sm:max-w-lg`, leaving the modal uncapped so the
          long student/course line blew the layout out past the viewport. Inline
          style wins, capping it at 560px so the header text truncates. */}
      <DialogContent
        className="counsellor-theme gap-0 overflow-hidden p-0 [&>*]:min-w-0"
        style={{ width: 'min(560px, calc(100vw - 2rem))', maxWidth: 'min(560px, calc(100vw - 2rem))' }}
      >
        <DialogHeader className="space-y-3 px-6 pb-4 pt-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-accent-foreground">
              <Wallet className="h-4 w-4" />
            </span>
            <DialogTitle className="text-xl">Record Payment</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Log a payment received offline for {studentName}. It is sent to Finance for approval.
          </DialogDescription>
          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/50 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Student</p>
              <p className="truncate text-sm font-semibold text-foreground">{studentName || '—'}</p>
              {description ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p> : null}
            </div>
            {amount > 0 ? (
              <div className="shrink-0 pl-4 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Amount</p>
                <p className="text-lg font-bold text-success">{fmtInr(amount)}</p>
              </div>
            ) : null}
          </div>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <div className="space-y-2">
            <Label htmlFor="cn-rp-amount">Amount Received (₹) *</Label>
            <Input
              id="cn-rp-amount"
              type="number"
              min="1"
              step="1"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              placeholder="Actual amount received"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cn-rp-mode">Payment Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger id="cn-rp-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="counsellor-theme">
                  {MODE_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cn-rp-date">Payment Date</Label>
              <Input
                id="cn-rp-date"
                type="date"
                value={paidDate}
                max={todayIso()}
                onChange={(e) => setPaidDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cn-rp-ref">Reference / Transaction ID *</Label>
            <Input
              id="cn-rp-ref"
              placeholder="Txn / cheque / UTR no."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cn-rp-note">Notes</Label>
            <textarea
              id="cn-rp-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional — anything Finance should know about this payment."
              className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="space-y-2">
            <Label>Receipt *</Label>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading…' : receiptUrl ? fileNameFromUrl(receiptUrl) : 'Upload receipt'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              Recorded payments are sent to the Finance Department for verification before they reflect.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border bg-muted/30 px-6 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            className="bg-success text-success-foreground hover:bg-success/90"
            onClick={handleSubmit}
            disabled={busy || !(Number(amountReceived) > 0) || !reference.trim() || !receiptUrl}
          >
            {submitting ? 'Recording…' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
