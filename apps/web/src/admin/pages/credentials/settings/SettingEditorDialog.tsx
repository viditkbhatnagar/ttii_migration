import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { AdminPortalApi } from '../../../admin-portal-api.js';
import { messageFromError } from '../../../shared/utils/admin-data-utils.js';
import { Field, ToggleField, selectClass, thisYear } from './editor-ui.js';
import { GradingEditorFields } from './GradingEditorFields.js';
import { ImageField } from './ImageField.js';
import { RuleEditorFields } from './RuleEditorFields.js';
import { TemplateEditorFields } from './TemplateEditorFields.js';
import { TemplatePreview } from './TemplatePreview.js';
import {
  DOC_TYPES, SETTING_TABS, buildPayload, formFromRow, emptyForm, numberExample, savesNewVersion,
  type ConfigRow, type OfferingOption, type SeriesRow, type SettingForm, type SettingTab,
} from './settings-model.js';

const WIDTH = 'min(880px, calc(100vw - 2rem))';

export function SettingEditorDialog({ tab, row, offerings, signatories, api, token, onClose, onSaved }: {
  tab: SettingTab; row: ConfigRow | SeriesRow | null; offerings: OfferingOption[]; signatories: ConfigRow[];
  api: AdminPortalApi; token: string; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<SettingForm>(() => (row ? formFromRow(tab, row) : emptyForm()));
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const patch = (p: Partial<SettingForm>) => setForm((f) => ({ ...f, ...p }));
  const noun = SETTING_TABS.find((t) => t.id === tab)?.noun ?? 'Setting';
  const newVersion = savesNewVersion(tab, row);
  const hasName = tab !== 'rule' && tab !== 'number_series';

  const save = async () => {
    setSaving(true);
    try {
      const result = await api.saveCredentialSetting(token, tab, buildPayload(tab, form, row ? row.id : null));
      if (result.status !== 1) { toast.error(result.message || 'Could not save.'); return; }
      toast.success(newVersion ? 'New rule version saved' : result.message || 'Saved');
      onSaved();
    } catch (error) {
      toast.error(messageFromError(error) || 'Could not save.');
    } finally { setSaving(false); }
  };

  return (
    <>
      <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" style={{ width: WIDTH, maxWidth: WIDTH }}>
          <DialogHeader><DialogTitle>{row ? 'Edit' : 'Create'} {noun.toLowerCase()}</DialogTitle></DialogHeader>
          <div className="@container space-y-4">
            {hasName ? (
              <div className="grid gap-4 @xl:grid-cols-2">
                <Field label="Name" htmlFor="setting-name"><Input id="setting-name" value={form.name} maxLength={200} onChange={(e) => patch({ name: e.target.value })} /></Field>
                <div className="flex items-end pb-1"><ToggleField label="Active" checked={form.active} onChange={(v) => patch({ active: v })} /></div>
              </div>
            ) : null}

            {tab === 'rule' ? (
              <>
                <RuleEditorFields form={form} onChange={patch} offerings={offerings} isNewVersion={newVersion} />
                <ToggleField label="Active" checked={form.active} onChange={(v) => patch({ active: v })} />
              </>
            ) : null}
            {tab === 'template' ? <TemplateEditorFields form={form} onChange={patch} offerings={offerings} signatories={signatories} api={api} token={token} /> : null}
            {tab === 'number_series' ? (
              <div className="grid gap-4 @xl:grid-cols-2">
                <Field label="Document type" htmlFor="ns-doc">
                  <select id="ns-doc" className={selectClass} value={form.docType} onChange={(e) => patch({ docType: e.target.value })}>
                    {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </Field>
                <Field label="Prefix"><Input value={form.prefix} maxLength={60} onChange={(e) => patch({ prefix: e.target.value })} /></Field>
                <Field label="Year"><Input type="number" min={2000} max={9999} value={form.year} onChange={(e) => patch({ year: e.target.value })} /></Field>
                <Field label="Padding"><Input type="number" min={1} max={12} value={form.padding} onChange={(e) => patch({ padding: e.target.value })} /></Field>
                <Field label="Next number"><Input type="number" min={1} value={form.nextNumber} onChange={(e) => patch({ nextNumber: e.target.value })} /></Field>
                <div className="flex items-end pb-1"><ToggleField label="Reset yearly" checked={form.resetYearly} onChange={(v) => patch({ resetYearly: v })} /></div>
                <p className="rounded-md bg-muted px-3 py-2 text-sm @xl:col-span-2">Live example · no number allocated: <span className="font-mono font-medium">{numberExample(form)}</span></p>
              </div>
            ) : null}
            {tab === 'signatory' ? (
              <>
                <div className="grid gap-4 @xl:grid-cols-3">
                  <Field label="Designation"><Input value={form.designation} maxLength={200} onChange={(e) => patch({ designation: e.target.value })} /></Field>
                  <Field label="Valid from"><DmyDateInput value={form.validFrom} onChange={(v) => patch({ validFrom: v })} minYear={2000} maxYear={thisYear + 10} /></Field>
                  <Field label="Valid to (optional)"><DmyDateInput value={form.validTo} onChange={(v) => patch({ validTo: v })} minYear={2000} maxYear={thisYear + 10} /></Field>
                </div>
                <ImageField label="Signature image" kind="signature" value={form.signatureKey} onChange={(k) => patch({ signatureKey: k })} api={api} token={token} />
              </>
            ) : null}
            {tab === 'grading' ? <GradingEditorFields form={form} onChange={patch} offerings={offerings} /> : null}
            {tab === 'courier' ? (
              <Field label="Tracking URL pattern (with {AWB})" htmlFor="courier-url" hint="Must be https and contain {AWB}, e.g. https://courier.example.com/track?awb={AWB}">
                <Input id="courier-url" value={form.trackingUrlPattern} maxLength={500} onChange={(e) => patch({ trackingUrlPattern: e.target.value })} />
              </Field>
            ) : null}
          </div>
          <DialogFooter className="gap-2">
            {tab === 'template' ? <Button type="button" variant="outline" className="mr-auto" onClick={() => setPreviewing(true)}>Preview</Button> : null}
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="button" disabled={saving} onClick={() => { void save(); }}>{saving ? 'Saving...' : newVersion ? 'Save new version' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {previewing ? <TemplatePreview template={previewFromForm(form)} offerings={offerings} signatories={signatories} api={api} token={token} onClose={() => setPreviewing(false)} /> : null}
    </>
  );
}

function previewFromForm(f: SettingForm) {
  return { docType: f.docType, level: f.level, offeringId: f.offeringId ? Number(f.offeringId) : null, fields: f.fields, signatoryIds: f.signatoryIds, backContent: f.backContent, backgroundKey: f.backgroundKey };
}
