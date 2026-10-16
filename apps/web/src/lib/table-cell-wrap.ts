export interface TableCellLayout {
  /** White-space classes for the cell (merged before the page's own classes). */
  whitespace: string;
  /**
   * Classes for a box around the children, or null for none. Capped cells get
   * a `w-max max-w-full` box so long text wraps inside the cap.
   */
  contentClass: string | null;
}

/**
 * Layout for the shared table cells (TableCell / TableHead).
 *
 * Cells stay on one line by default, so IDs, dates, amounts and pills never
 * break. A cell that also gets a width cap (`max-w-*`) cannot stay on one
 * line: Chrome's table layout honours the cap even when the text is wider, so
 * the text paints over the next columns (TTII staff 2026-10-16: table text was
 * overwritten in almost every admin tab).
 *
 * Such a capped cell wraps its text instead, breaking an over-long word such
 * as an email at the edge. Its children go in a `w-max max-w-full` box: the
 * box asks the table for the full text width, which Chrome clamps to the cap
 * exactly as before, so every column keeps its current width and the text
 * wraps inside it (letting the text wrap freely would let the table squeeze
 * these columns to one word per line on smaller screens). The box follows the
 * cell's right or centre alignment.
 *
 * Left alone: a capped cell that asked for `truncate` (one line with an
 * ellipsis), and a cell with its own `whitespace-*` class, which wins.
 */
export function tableCellLayout(className?: string): TableCellLayout {
  const utilities = (className ?? '')
    .split(/\s+/)
    .filter(Boolean)
    // Strip variants (`sm:`, `[&:has(x)]:`) and the important marker (`!`).
    .map((token) => token.slice(token.lastIndexOf(':') + 1).replace(/^!|!$/g, ''));
  const capped = utilities.some((u) => u.startsWith('max-w-') && u !== 'max-w-none');
  const optedOut = utilities.some((u) => u === 'truncate' || u.startsWith('whitespace-'));
  if (!capped || optedOut) return { whitespace: 'whitespace-nowrap', contentClass: null };
  const align = utilities.filter((u) => ['text-left', 'text-right', 'text-end', 'text-center'].includes(u)).pop();
  const contentClass =
    align === 'text-right' || align === 'text-end'
      ? 'w-max max-w-full ml-auto'
      : align === 'text-center'
        ? 'w-max max-w-full mx-auto'
        : 'w-max max-w-full';
  return { whitespace: 'whitespace-normal break-words', contentClass };
}
