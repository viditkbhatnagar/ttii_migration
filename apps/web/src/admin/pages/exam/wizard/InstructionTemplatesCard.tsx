import { useEffect, useState } from 'react';
import { BookmarkPlus, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { titleCaseEachWord } from '@/lib/text-format';
import type { AdminPageProps } from '../../../routing/admin-routes.js';
import { asNumber, asString } from '../../../shared/utils/admin-data-utils.js';

interface InstructionTemplate { id: number; title: string; body: string }

export const TEXTAREA_CLASS = 'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/** Reusable instruction templates: pick one to fill the box, or save the current text as one. */
export function InstructionTemplatesCard({ api, authToken, instructions, onUse }: {
  api: AdminPageProps['api'];
  authToken: string;
  instructions: string;
  onUse: (body: string) => void;
}) {
  const [templates, setTemplates] = useState<InstructionTemplate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [tplTitle, setTplTitle] = useState('');
  const [tplBody, setTplBody] = useState('');
  const [saving, setSaving] = useState(false);

  const toTemplates = (rows: Record<string, unknown>[]) => rows.map((r) => ({ id: asNumber(r.id), title: asString(r.title), body: asString(r.body) }));

  useEffect(() => {
    let cancelled = false;
    void api.listExamInstructionTemplates(authToken)
      .then((rows) => { if (!cancelled) setTemplates(toTemplates(rows)); })
      .catch(() => { /* leave empty */ });
    return () => { cancelled = true; };
  }, [api, authToken]);

  const save = async () => {
    if (!tplTitle.trim()) { toast.error('Template title required.'); return; }
    setSaving(true);
    try {
      // The body box shows the current instructions until it is edited, so
      // save what is on screen (an untouched box used to save an empty body).
      await api.createExamInstructionTemplate(authToken, { title: tplTitle.trim(), body: tplBody || instructions });
      toast.success('Template saved.');
      setShowForm(false);
      setTplTitle('');
      setTplBody('');
      setTemplates(toTemplates(await api.listExamInstructionTemplates(authToken)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save template.');
    } finally { setSaving(false); }
  };

  return (
    <section className="rounded-xl border border-border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><FileText aria-hidden="true" className="size-4 text-primary" /> Reusable instruction templates</h3>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : <><BookmarkPlus aria-hidden="true" className="size-3.5" /> Save current as template</>}
        </Button>
      </div>
      {showForm ? (
        <div className="mb-3 grid grid-cols-1 gap-2 rounded-lg bg-muted/40 p-3">
          <Input aria-label="Template title" placeholder="Template title" value={tplTitle} onChange={(e) => setTplTitle(e.target.value)} onBlur={(e) => { const next = titleCaseEachWord(e.target.value); if (next !== e.target.value) setTplTitle(next); }} />
          <textarea aria-label="Template body" placeholder="Template body" value={tplBody || instructions} onChange={(e) => setTplBody(e.target.value)} rows={4} className={TEXTAREA_CLASS} />
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { void save(); }} disabled={saving}>{saving ? 'Saving…' : 'Save Template'}</Button>
          </div>
        </div>
      ) : null}
      {templates.length === 0 ? (
        <p className="text-xs text-muted-foreground">No templates yet. Save the current Instructions as a template to reuse later.</p>
      ) : (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <span className="truncate text-foreground">{t.title}</span>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onUse(t.body)}>Use</Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
