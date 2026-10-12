// Pure helpers for the navbar profile area (Naji's admin shell).

export const MIN_PASSWORD_LENGTH = 8;

export const ROLE_LABELS: Readonly<Record<number, string>> = {
  1: 'Super Admin',
  2: 'Student',
  3: 'Instructor',
  4: 'Centre',
  7: 'Centre',
  8: 'Admin',
  9: 'Counsellor',
  10: 'Associate',
};

export function roleLabelOf(roleId: number): string {
  return ROLE_LABELS[roleId] ?? 'User';
}

/** Two-letter avatar initials; "AD" when there is no usable name. */
export function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0] ?? '')
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'AD'
  );
}

/** Client-side checks; the server re-checks that both are present and match. */
export function passwordProblem(next: string, confirm: string): string | null {
  if (next.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (next !== confirm) return "Passwords don't match.";
  return null;
}
