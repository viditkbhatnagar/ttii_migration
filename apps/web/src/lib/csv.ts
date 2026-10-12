// CSV export helpers shared by every admin list that offers "Export".

/**
 * One CSV cell. A value opening with = + - @ (or a tab/CR) is run as a formula
 * by Excel; a leading apostrophe keeps it text. Numbers are never prefixed.
 */
export function csvCell(value: string | number): string {
  let s = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Array<Array<string | number>>): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  // Byte-order mark so Excel opens the UTF-8 names correctly.
  const blob = new Blob([`${String.fromCharCode(0xfeff)}${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Revoked on the next tick: Safari cancels a download whose URL is revoked
  // synchronously after click().
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
