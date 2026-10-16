import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../src/components/ui/table';
import { tableCellLayout } from '../src/lib/table-cell-wrap';

// Guards the "text overwritten in almost every admin table" bug (TTII staff
// 2026-10-16): a capped cell (max-w-*) that is ALSO forced onto one line lets
// Chrome paint its text over the next columns.

const ONE_LINE = { whitespace: 'whitespace-nowrap', contentClass: null };
const WRAPS = { whitespace: 'whitespace-normal break-words', contentClass: 'w-max min-w-full max-w-full' };

describe('tableCellLayout', () => {
  test('keeps an uncapped cell on one line (IDs, dates, amounts, pills)', () => {
    expect(tableCellLayout()).toEqual(ONE_LINE);
    expect(tableCellLayout('')).toEqual(ONE_LINE);
    expect(tableCellLayout('text-right text-sm tabular-nums')).toEqual(ONE_LINE);
    expect(tableCellLayout('min-w-[120px] w-12')).toEqual(ONE_LINE);
  });

  test('wraps a capped cell inside its cap', () => {
    expect(tableCellLayout('max-w-[220px] text-sm')).toEqual(WRAPS);
    expect(tableCellLayout('max-w-xs text-sm text-muted-foreground')).toEqual(WRAPS);
    expect(tableCellLayout('text-sm sm:max-w-md')).toEqual(WRAPS);
    expect(tableCellLayout('!max-w-[180px] break-all')).toEqual(WRAPS);
  });

  test('leaves a capped cell that asked for truncate or its own white-space alone', () => {
    expect(tableCellLayout('max-w-[220px] truncate text-sm')).toEqual(ONE_LINE);
    expect(tableCellLayout('max-w-md whitespace-normal')).toEqual(ONE_LINE);
    expect(tableCellLayout('max-w-[200px] whitespace-nowrap')).toEqual(ONE_LINE);
  });

  test('does not treat max-w-none as a cap', () => {
    expect(tableCellLayout('max-w-none')).toEqual(ONE_LINE);
  });

  test('gives aligned capped cells the same full-width box (text-align then applies inside it)', () => {
    expect(tableCellLayout('max-w-[200px] text-right')).toEqual(WRAPS);
    expect(tableCellLayout('max-w-[200px] text-center')).toEqual(WRAPS);
  });
});

function renderCells(cellClass: string, headClass = 'text-xs'): string {
  return renderToString(
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className={headClass}>Course</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className={cellClass}>Pg Diploma in Montessori Teacher Training</TableCell>
        </TableRow>
      </TableBody>
    </Table>,
  );
}

function classOf(html: string, slot: string): string[] {
  const match = new RegExp(`data-slot="${slot}" class="([^"]*)"`).exec(html);
  return (match?.[1] ?? '').split(' ');
}

describe('TableCell / TableHead layout', () => {
  test('default cells and heads stay on one line with no inner box', () => {
    const html = renderCells('text-sm');
    expect(classOf(html, 'table-cell')).toContain('whitespace-nowrap');
    expect(classOf(html, 'table-head')).toContain('whitespace-nowrap');
    expect(html).not.toContain('table-cell-content');
  });

  test('a capped cell wraps inside a full-width-asking box instead of painting over the next column', () => {
    const html = renderCells('max-w-[220px] text-sm');
    const cell = classOf(html, 'table-cell');
    expect(cell).toContain('whitespace-normal');
    expect(cell).toContain('break-words');
    expect(cell).not.toContain('whitespace-nowrap');
    expect(classOf(html, 'table-cell-content')).toEqual(['w-max', 'min-w-full', 'max-w-full']);
    expect(html).toContain('<div data-slot="table-cell-content" class="w-max min-w-full max-w-full">Pg Diploma in Montessori Teacher Training</div>');
  });

  test('a capped head gets the same treatment', () => {
    const html = renderCells('text-sm', 'max-w-[120px] text-xs');
    expect(classOf(html, 'table-head')).toContain('whitespace-normal');
    expect(html).toContain('data-slot="table-cell-content"');
  });

  test('an explicit whitespace class on a capped cell still wins, unwrapped', () => {
    const html = renderCells('max-w-[220px] whitespace-normal');
    const cell = classOf(html, 'table-cell');
    expect(cell).toContain('whitespace-normal');
    expect(cell).not.toContain('whitespace-nowrap');
    expect(html).not.toContain('table-cell-content');
  });

  test('an explicit break-all on a capped cell replaces break-words', () => {
    const cell = classOf(renderCells('max-w-[180px] break-all'), 'table-cell');
    expect(cell).toContain('break-all');
    expect(cell).not.toContain('break-words');
  });
});
