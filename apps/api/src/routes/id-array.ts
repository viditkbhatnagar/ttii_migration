// Ids out of a request payload (TTII 2026-10-16). The admin portal sends id
// lists as JSON NUMBERS ([174, 152]); older callers send numeric strings, a
// JSON-encoded array string, or "1,2". The route helper toStringArray only
// keeps strings, so a number array came back EMPTY: "/admin/re_exams/schedule"
// answered "Select at least one student." to every re-exam the portal sent,
// and supplementary exams would have done the same.
//
// Accepts numbers or digit-only strings; keeps positive safe integers; drops
// everything else (2.5, "12abc", -1, 0, null); dedupes, keeping first order.

function entries(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'number') return [value];
  if (typeof value !== 'string') return [];
  const text = value.trim();
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return text === '' ? [] : text.split(',');
}

function toId(entry: unknown): number | null {
  if (typeof entry === 'number') return Number.isSafeInteger(entry) && entry > 0 ? entry : null;
  if (typeof entry !== 'string' || !/^\d+$/.test(entry.trim())) return null;
  const n = Number(entry.trim());
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function toIdArray(value: unknown): number[] {
  const out: number[] = [];
  for (const entry of entries(value)) {
    const id = toId(entry);
    if (id !== null && !out.includes(id)) out.push(id);
  }
  return out;
}
