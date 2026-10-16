export interface TableCellLayout {
  /** White-space classes for the cell (merged before the page's own classes). */
  whitespace: string;
  /** Classes for a box around the children, or null to pass them through untouched. */
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
 * as an email at the edge. Its children go in a `w-max min-w-full max-w-full`
 * box. When the table sizes its columns, the box asks for the full one-line
 * width (percentage min/max widths do not count there), which the cap clamps
 * exactly as before, so every column keeps its current width. Letting the
 * text wrap freely would let the table squeeze these columns to one word per
 * line on smaller screens. Once the column is sized, the box is exactly as wide
 * as the cell, so text wraps inside the cap, text alignment applies as usual,
 * and `w-full` / `flex-1` children still fill the cell. Buttons and links in
 * the box are held to its width by app.css.
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
  return { whitespace: 'whitespace-normal break-words', contentClass: 'w-max min-w-full max-w-full' };
}
