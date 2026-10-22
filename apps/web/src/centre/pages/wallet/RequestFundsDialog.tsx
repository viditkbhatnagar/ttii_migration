import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePortalThemeClass } from '@/lib/portal-theme';
import { cn } from '@/lib/utils';
import type { CentrePortalApi } from '../../centre-portal-api.js';
import { istToday } from '../kit/format.js';
import { EMPTY_FUND_FORM, fundRequestError, moneyOf, proofFileError, type FundRequestForm } from './wallet-model.js';

interface RequestFundsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  api: CentrePortalApi;
  token: string;
  onSent: () => void;
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * "Request Wallet Top-up": the existing POST /centre/wallet/add (a pending
 * centre_fund_requests row TTII approves), with the payment proof uploaded
 * first through /centre/upload. The design's "Mode" (NEFT / RTGS / UPI …) has
 * no column, so it is not asked.
 */
export function RequestFundsDialog({ open, onOpenChange, api, token, onSent }: RequestFundsDialogProps) {
  const portalTheme = usePortalThemeClass();
  const [form, setForm] = useState<FundRequestForm>(EMPTY_FUND_FORM);
  const [proof, setProof] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const reset = () => { setForm(EMPTY_FUND_FORM); setProof(null); setError(null); };
  const close = (next: boolean) => {
    if (sending) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = async () => {
    const problem = fundRequestError(form) ?? proofFileError(proof);
    if (problem) { setError(problem); return; }
    setSending(true);
    setError(null);
    try {
      const attachment = proof ? (await api.uploadFile(token, proof)).url : '';
      await api.addFundRequest(token, {
        amount: moneyOf(form.amount),
        date: istToday(),
        transactionNo: form.reference.trim(),
        description: form.description.trim(),
        attachmentFile: attachment,
      });
      toast.success('Fund request sent to TTII');
      reset();
      onOpenChange(false);
      onSent();
    } catch (err: unknown) {
      setError(errorText(err, 'Could not send the request. Please try again.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className={cn(portalTheme, 'modal-maxh overflow-y-auto')} style={{ width: 'min(32rem, calc(100vw - 2rem))', maxWidth: 'none' }}>
        <DialogHeader>
          <DialogTitle>Request Wallet Top-up</DialogTitle>
          <DialogDescription>Tell TTII about a transfer you made. The wallet is credited once TTII approves it.</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="fund-amount">Amount (₹) *</Label>
            <Input id="fund-amount" inputMode="decimal" autoComplete="off" placeholder="e.g. 25,000" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fund-reference">Transaction reference *</Label>
            <Input id="fund-reference" autoComplete="off" placeholder="UTR / cheque number" maxLength={255} value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fund-description">Description</Label>
            <Input id="fund-description" autoComplete="off" placeholder="e.g. NEFT from HDFC current account" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fund-proof">Payment proof</Label>
            <Input id="fund-proof" type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
              onChange={(e) => setProof(e.target.files?.[0] ?? null)} />
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Paperclip className="h-3 w-3" /> Image or PDF, up to 20 MB. Optional, but it speeds up approval.
            </p>
          </div>
          {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
          <DialogFooter className="gap-2 pt-1">
            <Button type="button" variant="outline" disabled={sending} onClick={() => close(false)}>Cancel</Button>
            <Button type="submit" disabled={sending} className="gap-1.5">
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              {sending ? 'Sending…' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
