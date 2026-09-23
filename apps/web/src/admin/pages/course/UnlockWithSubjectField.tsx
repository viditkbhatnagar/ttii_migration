import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { asString } from '../../shared/utils/admin-data-utils.js';

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export interface UnlockWithSubjectFieldProps {
  /** Selected partner subject id, '' for none. */
  value: string;
  onChange: (value: string) => void;
  /** Subjects to offer (id + title rows). The subject being edited is excluded. */
  subjects: Record<string, unknown>[];
  /** The subject being edited, or '' when creating one. */
  ownSubjectId: string;
}

/**
 * "Unlocks together with" — Risha/Majida 2026-09-23. A subject that names a
 * partner opens for every student in a cohort covering that partner, so a
 * practical component ("5 Areas of Practical Work") can open with its theory
 * subject ("Montessori Methodology in Modern Education") without a separate
 * cohort or a sub-section. Only matters on Cohort Based offerings; Full and
 * Subject Based already open everything.
 */
export function UnlockWithSubjectField({ value, onChange, subjects, ownSubjectId }: UnlockWithSubjectFieldProps) {
  const options = useMemo(() => {
    const list = subjects
      .map((s) => ({ id: asString(s.id), title: asString(s.title) }))
      .filter((s) => s.id !== '' && s.id !== ownSubjectId)
      .sort((a, b) => a.title.localeCompare(b.title));
    // Keep a saved partner selectable even when it is outside this list (e.g. a
    // subject of another course), so opening and saving the form never clears it.
    if (value !== '' && !list.some((s) => s.id === value)) {
      list.unshift({ id: value, title: `Subject #${value} (deleted, or not in this course)` });
    }
    return list;
  }, [subjects, ownSubjectId, value]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor="unlock-with-subject">Unlocks together with</Label>
      <select
        id="unlock-with-subject"
        className={selectClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— None (unlocks only with its own cohort) —</option>
        {options.map((s) => (
          <option key={s.id} value={s.id}>{s.title || `Subject #${s.id}`}</option>
        ))}
      </select>
      <p className="text-xs text-slate-500">
        Students in a cohort for the chosen subject also get this subject unlocked, without a
        separate cohort. Use it for a practical or companion part of a subject.
      </p>
    </div>
  );
}
