import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Input } from '@/components/ui/input';
import { Field, Section, ToggleField, selectClass, thisYear } from './editor-ui.js';
import {
  BINARY_COMPONENTS, COMPONENT_TYPES, RULE_PRESETS, newComponent, presetComponents,
  type FormComponent, type OfferingOption, type SettingForm,
} from './settings-model.js';

export function RuleEditorFields({ form, onChange, offerings, isNewVersion }: {
  form: SettingForm; onChange: (patch: Partial<SettingForm>) => void; offerings: OfferingOption[]; isNewVersion: boolean;
}) {
  const setComponent = (index: number, patch: Partial<FormComponent>) =>
    onChange({ components: form.components.map((c, i) => (i === index ? { ...c, ...patch } : c)) });

  return (
    <>
      <div className="grid gap-4 @xl:grid-cols-2">
        <Field label="Course offering" htmlFor="rule-offering">
          <select id="rule-offering" className={selectClass} value={form.offeringId} onChange={(e) => onChange({ offeringId: e.target.value })}>
            <option value="">Select TTII course offering</option>
            {offerings.map((o) => <option key={o.id} value={o.id}>{o.title}{o.course ? ` - ${o.course}` : ''}</option>)}
          </select>
        </Field>
        <Field label="Rule type" htmlFor="rule-type">
          <select
            id="rule-type" className={selectClass} value={form.ruleType}
            onChange={(e) => onChange({ ruleType: e.target.value, components: presetComponents(e.target.value), autoIssue: e.target.value === 'Self-paced auto-issue' })}
          >
            {RULE_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Effective from">
          <DmyDateInput value={form.effectiveFrom} onChange={(v) => onChange({ effectiveFrom: v })} minYear={2020} maxYear={thisYear + 5} />
        </Field>
        <Field label="Re-attempt handling" htmlFor="rule-reattempt">
          <select id="rule-reattempt" className={selectClass} value={form.reattempt} onChange={(e) => onChange({ reattempt: e.target.value === 'Latest' ? 'Latest' : 'Best' })}>
            <option value="Best">Best attempt</option>
            <option value="Latest">Latest attempt</option>
          </select>
        </Field>
      </div>
      <ToggleField label="Auto-issue" checked={form.autoIssue} onChange={(v) => onChange({ autoIssue: v })} />
      {isNewVersion ? <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">A new version will be created. The previous version remains unchanged.</p> : null}

      <Section
        title="Completion components"
        action={<Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => onChange({ components: [...form.components, newComponent()] })}><Plus aria-hidden="true" className="size-4" /> Add component</Button>}
      >
        {form.components.length === 0 ? <p className="text-sm text-muted-foreground">No components yet.</p> : null}
        {form.components.map((c, i) => {
          const binary = BINARY_COMPONENTS.includes(c.componentType);
          return (
            <div key={i} className="@container space-y-3 rounded-lg border border-border p-3">
              <div className="grid gap-3 @xl:grid-cols-3">
                <Field label="Component type">
                  <select className={selectClass} value={c.componentType} onChange={(e) => setComponent(i, { componentType: e.target.value })}>
                    {COMPONENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Subject code (optional)">
                  <Input value={c.subject} maxLength={60} onChange={(e) => setComponent(i, { subject: e.target.value })} />
                </Field>
                {binary ? null : (
                  <Field label="Minimum value (%)">
                    <Input type="number" min={0} max={100} value={c.minimum} onChange={(e) => setComponent(i, { minimum: e.target.value })} />
                  </Field>
                )}
              </div>
              {c.componentType === 'Assignments' ? (
                <div className="grid gap-3 @xl:grid-cols-3">
                  <Field label="Assignments required">
                    <select className={selectClass} value={c.coverage} onChange={(e) => setComponent(i, { coverage: e.target.value === 'Count' ? 'Count' : 'All' })}>
                      <option value="All">All</option><option value="Count">Count</option>
                    </select>
                  </Field>
                  {c.coverage === 'Count' ? (
                    <Field label="Assignment count"><Input type="number" min={1} step={1} value={c.count} onChange={(e) => setComponent(i, { count: e.target.value })} /></Field>
                  ) : null}
                  <Field label="Minimum applies to">
                    <select className={selectClass} value={c.thresholdMode} onChange={(e) => setComponent(i, { thresholdMode: e.target.value === 'Each' ? 'Each' : 'Overall' })}>
                      <option value="Each">Each</option><option value="Overall">Overall</option>
                    </select>
                  </Field>
                </div>
              ) : null}
              {c.componentType === 'Exams' ? (
                <div className="grid gap-3 @xl:grid-cols-3">
                  <Field label="Exam requirement">
                    <select className={selectClass} value={c.examRequirement} onChange={(e) => setComponent(i, { examRequirement: e.target.value as FormComponent['examRequirement'] })}>
                      <option value="All">All</option><option value="Per subject">Per subject</option><option value="Overall">Overall</option>
                    </select>
                  </Field>
                  <Field label="Theory minimum (%)"><Input type="number" min={0} max={100} value={c.theory} onChange={(e) => setComponent(i, { theory: e.target.value })} /></Field>
                  <Field label="Practical minimum (%)"><Input type="number" min={0} max={100} value={c.practical} onChange={(e) => setComponent(i, { practical: e.target.value })} /></Field>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <ToggleField label="Mandatory" checked={c.mandatory} onChange={(v) => setComponent(i, { mandatory: v })} />
                <Button type="button" size="sm" variant="ghost" className="gap-1 text-destructive" aria-label={`Remove component ${i + 1}`} onClick={() => onChange({ components: form.components.filter((_, j) => j !== i) })}>
                  <Trash2 aria-hidden="true" className="size-4" /> Remove
                </Button>
              </div>
            </div>
          );
        })}
      </Section>
    </>
  );
}
