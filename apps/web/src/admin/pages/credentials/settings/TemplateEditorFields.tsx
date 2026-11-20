import { Checkbox } from '@/components/ui/checkbox';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { asString } from '../../../shared/utils/admin-data-utils.js';
import type { AdminPortalApi } from '../../../admin-portal-api.js';
import { Field, Section, selectClass, thisYear } from './editor-ui.js';
import { ImageField } from './ImageField.js';
import { DOC_TYPES, LEVELS, PRINT_FIELDS, type ConfigRow, type OfferingOption, type SettingForm } from './settings-model.js';

export function TemplateEditorFields({ form, onChange, offerings, signatories, api, token }: {
  form: SettingForm; onChange: (patch: Partial<SettingForm>) => void; offerings: OfferingOption[]; signatories: ConfigRow[]; api: AdminPortalApi; token: string;
}) {
  const toggle = <T,>(list: T[], item: T, on: boolean): T[] => (on ? [...list.filter((x) => x !== item), item] : list.filter((x) => x !== item));
  return (
    <>
      <div className="grid gap-4 @xl:grid-cols-2">
        <Field label="Document type" htmlFor="tpl-doc">
          <select id="tpl-doc" className={selectClass} value={form.docType} onChange={(e) => onChange({ docType: e.target.value })}>
            {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </Field>
        <Field label="Effective from">
          <DmyDateInput value={form.effectiveFrom} onChange={(v) => onChange({ effectiveFrom: v })} minYear={2020} maxYear={thisYear + 5} />
        </Field>
        <Field label="Apply to course offering" htmlFor="tpl-offering">
          <select id="tpl-offering" className={selectClass} value={form.offeringId} onChange={(e) => onChange({ offeringId: e.target.value, level: e.target.value ? '' : form.level })}>
            <option value="">Apply by level instead</option>
            {offerings.map((o) => <option key={o.id} value={o.id}>{o.title}{o.course ? ` - ${o.course}` : ''}</option>)}
          </select>
        </Field>
        <Field label="Level" htmlFor="tpl-level">
          <select id="tpl-level" className={selectClass} value={form.level} onChange={(e) => onChange({ level: e.target.value, offeringId: e.target.value ? '' : form.offeringId })}>
            <option value="">Select level</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
      </div>
      <ImageField label="Front background" kind="background" allowPdf value={form.backgroundKey} onChange={(k) => onChange({ backgroundKey: k })} api={api} token={token} />

      <Section title="Fields to print">
        <div className="grid gap-2 @md:grid-cols-2 @2xl:grid-cols-3">
          {PRINT_FIELDS.map((f) => (
            <label key={f} className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.fields.includes(f)} onCheckedChange={(v) => onChange({ fields: toggle(form.fields, f, v === true) })} /> {f}
            </label>
          ))}
        </div>
      </Section>
      <Section title="Signatories">
        {signatories.length === 0 ? <p className="text-sm text-muted-foreground">No active signatories yet. Add them under the Signatories tab.</p> : (
          <div className="grid gap-2 @md:grid-cols-2">
            {signatories.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.signatoryIds.includes(s.id)} onCheckedChange={(v) => onChange({ signatoryIds: toggle(form.signatoryIds, s.id, v === true) })} />
                {s.name} · {asString(s.data.designation)}
              </label>
            ))}
          </div>
        )}
      </Section>
      <Field label="Back-side text" htmlFor="tpl-back">
        <textarea id="tpl-back" rows={4} maxLength={5000} value={form.backContent} onChange={(e) => onChange({ backContent: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </Field>
    </>
  );
}
