import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

// TTII 2026-10-26 — two "boxes overlap / text not visible" reports in one
// morning had the same cause: a component that is EMBEDDED in a narrower box
// (the course player's middle column, a dialog) switched to a multi-column
// layout on the VIEWPORT (md:/lg:), so on a laptop its fixed-width columns
// squeezed the rest to nothing — the lesson quiz question rendered 0px wide,
// the live-session preview hid the date and title. These components must lay
// out by their OWN width (@container + @-variants). This guard fails if a
// viewport breakpoint creeps back into their column layouts.

const FILES = [
  '../src/student/components/ExamPlayer.tsx',
  '../src/student/components/FormalExamPlayer.tsx',
  '../src/instructor/pages/cohorts/InstructorScheduleClassModal.tsx',
];

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

describe('embedded multi-column layouts follow their container, not the viewport', () => {
  test.each(FILES)('%s has no viewport grid-column templates and declares a container', (rel) => {
    const src = read(rel);
    // A viewport variant (lg:grid-cols-[…]) — the lookbehind lets container variants (@2xl:…) through.
    expect(src).not.toMatch(/(?<![@\w-])(?:sm|md|lg|xl|2xl):grid-cols-\[/);
    expect(src).toMatch(/@container/);
  });

  test('the quiz header row and the live-session preview rows switch on container width', () => {
    expect(read(FILES[0] as string)).not.toMatch(/(?<![@\w-])md:flex-row\b/);
    expect(read(FILES[2] as string)).toMatch(/@2xl:grid-cols-\[/);
  });
});
