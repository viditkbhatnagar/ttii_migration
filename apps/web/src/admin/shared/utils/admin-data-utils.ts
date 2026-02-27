export function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asString(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

export function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

export function asBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'on';
}

export function toRecords(value: unknown): Record<string, unknown>[] {
  return asArray(value)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null);
}

export function messageFromError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unexpected request failure.';
}

export function responseSuccess(payload: Record<string, unknown>): boolean {
  if (asBoolean(payload.success) || asBoolean(payload.status)) {
    return true;
  }
  const message = asString(payload.message).toLowerCase();
  return message.includes('success');
}

export function dateOnly(offset = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function firstValueByKey(rows: Record<string, unknown>[], key: string): string {
  const found = rows.find((entry) => asString(entry.key) === key);
  return asString(found?.value);
}

export function formatDate(value: unknown): string {
  const str = asString(value);
  if (!str) return '';
  try {
    const date = new Date(str);
    if (Number.isNaN(date.getTime())) return str;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return str;
  }
}

export function formatCurrency(value: unknown, currency = '₹'): string {
  const num = asNumber(value);
  return `${currency}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
