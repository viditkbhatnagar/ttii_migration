import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Field, Section, selectClass } from './editor-ui.js';
import { CGPA_METHODS, PASS_RULES, type FormBand, type OfferingOption, type SettingForm } from './settings-model.js';

export function GradingEditorFields({ form, onChange, offerings }: {
  form: SettingForm; onChange: (patch: Partial<SettingForm>) => void; offerings: OfferingOption[];
}) {
  const setBand = (i: number, patch: Partial<FormBand>) => onChange({ bands: form.bands.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  return (
    <>
      <div className="grid gap-4 @xl:grid-cols-2">
        <Field label="Scale maximum"><Input type="number" min={1} max={100} value={form.scaleMax} onChange={(e) => onChange({ scaleMax: e.target.value })} /></Field>
        <Field label="Pass minimum (%)"><Input type="number" min={0} max={100} value={form.passMinimum} onChange={(e) => onChange({ passMinimum: e.target.value })} /></Field>
        <Field label="Pass rule" htmlFor="gr-pass">
          <select id="gr-pass" className={selectClass} value={form.passRule} onChange={(e) => onChange({ passRule: e.target.value })}>
            {PASS_RULES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="CGPA method" htmlFor="gr-cgpa">
          <select id="gr-cgpa" className={selectClass} value={form.cgpaMethod} onChange={(e) => onChange({ cgpaMethod: e.target.value })}>
            {CGPA_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
      </div>
      <Section
        title="Grade bands"
        action={<Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => onChange({ bands: [...form.bands, { min: '0', max: '0', grade: '', points: '0' }] })}><Plus aria-hidden="true" className="size-4" /> Add band</Button>}
      >
        {form.bands.map((b, i) => (
          <div key={i} className="grid grid-cols-2 items-end gap-2 @xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <Field label="Min %"><Input type="number" step="any" value={b.min} onChange={(e) => setBand(i, { min: e.target.value })} /></Field>
            <Field label="Max %"><Input type="number" step="any" value={b.max} onChange={(e) => setBand(i, { max: e.target.value })} /></Field>
            <Field label="Letter grade"><Input value={b.grade} maxLength={8} onChange={(e) => setBand(i, { grade: e.target.value })} /></Field>
            <Field label="Grade point"><Input type="number" step="any" value={b.points} onChange={(e) => setBand(i, { points: e.target.value })} /></Field>
            <Button type="button" size="icon" variant="ghost" className="text-destructive" aria-label={`Remove grade band ${i + 1}`} onClick={() => onChange({ bands: form.bands.filter((_, j) => j !== i) })}>
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          </div>
        ))}
      </Section>
      <Section title="Linked TTII course offerings">
        {offerings.length === 0 ? <p className="text-sm text-muted-foreground">No TTII-issued offerings.</p> : (
          <div className="grid gap-2 @md:grid-cols-2">
            {offerings.map((o) => (
              <label key={o.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.offeringIds.includes(o.id)}
                  onCheckedChange={(v) => onChange({ offeringIds: v === true ? [...form.offeringIds, o.id] : form.offeringIds.filter((x) => x !== o.id) })}
                />
                {o.title}
              </label>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
