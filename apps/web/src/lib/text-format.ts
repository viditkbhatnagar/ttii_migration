// Naji 2026-05-07: text-formatting helpers used across forms so Name /
// Title style fields capture values consistently. The helper below
// returns the input with the first letter of each whitespace-separated
// word uppercased, leaving subsequent letters as the user typed them
// (so brand names like "iPhone" or "TTII" survive untouched if the
// caller passes them).

const SMALL_PARTICLES = new Set([
  'and', 'or', 'the', 'of', 'in', 'on', 'for',
]);

/**
 * Title-case a value: first letter of each word uppercased.
 * Particles (and / or / the / etc.) stay lowercase EXCEPT for the first
 * word so "Smith and Sons" reads as expected. Pass-through for empty
 * input. The function is destructive on the case it would otherwise
 * leave alone — call only from blur handlers, not on every keystroke,
 * so it doesn't fight the user mid-typing.
 */
export function titleCaseEachWord(value: string): string {
  if (!value) return value;
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed
    .split(/(\s+)/) // keep separators so we can rebuild with original spacing
    .map((part, idx) => {
      if (!part || /^\s+$/.test(part)) return part;
      const lower = part.toLowerCase();
      if (idx > 0 && SMALL_PARTICLES.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

/**
 * Returns a `onBlur` handler that title-cases the input value before
 * calling the supplied setter. Drop-in replacement for inputs that
 * should normalize on blur:
 *
 *   <Input value={name} onChange={(e) => setName(e.target.value)}
 *          onBlur={titleCaseOnBlur(setName)} />
 */
export function titleCaseOnBlur(setter: (value: string) => void): React.FocusEventHandler<HTMLInputElement> {
  return (event) => {
    const next = titleCaseEachWord(event.target.value);
    if (next !== event.target.value) setter(next);
  };
}
