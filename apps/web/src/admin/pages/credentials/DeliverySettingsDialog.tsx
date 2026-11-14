import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { asNumber, asString, messageFromError, toRecords } from '../../shared/utils/admin-data-utils.js';
import { Field, selectClass } from './settings/editor-ui.js';
import { DELIVERY_MODE_OPTIONS } from './settings/settings-model.js';

// "Delivery settings" (spec §1.4/§1.11): overdue days, ready-waiting days (1-365)
// and a per-centre delivery-mode override. Mounted by the Delivery Tracking page
// for users holding credentials.settings; saved as the single `delivery` config row.
//
//   <DeliverySettingsDialog open={open} onClose={...} onSaved={reload} api={api} token={session.token} />

const WIDTH = 'min(640px, calc(100vw - 2rem))';

interface Centre { id: string; name: string }

export function DeliverySettingsDialog({ open, onClose, onSaved, api, token }: {
  open: boolean; onClose: () => void; onSaved?: () => void; api: AdminPortalApi; token: string;
}) {
  const [overdue, setOverdue] = useState('10');
  const [ready, setReady] = useState('3');
  const [modes, setModes] = useState<Record<string, string>>({});
  const [centres, setCentres] = useState<Centre[]>([]);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setLoading(true);
    void (async () => {
      try {
        const [settings, centreRows] = await Promise.all([api.loadCredentialDeliverySettings(token), api.loadCentres(token).catch(() => [])]);
        if (!live) return;
        const s = (settings.settings && typeof settings.settings === 'object' ? settings.settings : {}) as Record<string, unknown>;
        setOverdue(String(asNumber(s.overdueDays) || 10));
        setReady(String(asNumber(s.readyDays) || 3));
        setModes(Object.fromEntries(Object.entries((s.centreModes && typeof s.centreModes === 'object' ? s.centreModes : {}) as Record<string, unknown>).map(([k, v]) => [k, asString(v)])));
        setNotice(settings.ready === false ? asString(settings.message) : '');
        setCentres(toRecords(centreRows).map((c) => ({ id: asString(c.id), name: asString(c.centre_name) || `Centre ${asString(c.id)}` })).sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        if (live) toast.error(messageFromError(error) || 'Could not load delivery settings.');
      } finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [open, api, token]);

  const dayError = useMemo(() => {
    const ok = (v: string) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 365;
    return ok(overdue) && ok(ready) ? '' : 'Days must be whole numbers from 1 to 365.';
  }, [overdue, ready]);

  const save = async () => {
    setSaving(true);
    try {
      const out = await api.saveCredentialDeliverySettings(token, { overdue_days: Number(overdue), ready_days: Number(ready), centre_modes: modes });
      if (out.status !== 1) { toast.error(out.message || 'Could not save.'); return; }
      toast.success('Delivery settings saved');
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error(messageFromError(error) || 'Could not save.');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto" style={{ width: WIDTH, maxWidth: WIDTH }}>
        <DialogHeader>
          <DialogTitle>Delivery settings</DialogTitle>
          <DialogDescription>Reminder thresholds and how each centre receives printed credentials.</DialogDescription>
        </DialogHeader>
        {notice ? <p role="status" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p> : null}
        <div className="@container space-y-4">
          <div className="grid gap-4 @md:grid-cols-2">
            <Field label="Overdue after (days)" htmlFor="ds-overdue" hint="A dispatched item with no delivery after this many days is overdue.">
              <Input id="ds-overdue" type="number" min={1} max={365} step={1} value={overdue} onChange={(e) => setOverdue(e.target.value)} />
            </Field>
            <Field label="Ready-waiting days" htmlFor="ds-ready" hint="A queued print waiting longer than this is flagged.">
              <Input id="ds-ready" type="number" min={1} max={365} step={1} value={ready} onChange={(e) => setReady(e.target.value)} />
            </Field>
          </div>
          {dayError ? <p role="alert" className="text-sm text-destructive">{dayError}</p> : null}
          <section className="space-y-2 border-t border-border pt-4">
            <h3 className="text-sm font-semibold">Centre delivery mode overrides</h3>
            <p className="text-xs text-muted-foreground">A centre without an override uses the course offering&rsquo;s default delivery mode.</p>
            {loading ? <p className="text-sm text-muted-foreground">Loading centres...</p> : centres.length === 0 ? <p className="text-sm text-muted-foreground">No centres.</p> : (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {centres.map((c) => (
                  <div key={c.id} className="grid items-center gap-2 @md:grid-cols-[1fr_200px]">
                    <label htmlFor={`ds-centre-${c.id}`} className="text-sm">{c.name}</label>
                    <select
                      id={`ds-centre-${c.id}`} className={selectClass} value={modes[c.id] ?? ''}
                      onChange={(e) => setModes((m) => { const next = { ...m }; if (e.target.value) next[c.id] = e.target.value; else delete next[c.id]; return next; })}
                    >
                      <option value="">Use offering default</option>
                      {DELIVERY_MODE_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={saving || loading || dayError !== ''} onClick={() => { void save(); }}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
