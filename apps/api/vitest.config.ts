import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    dir: 'tests',
    // Prints one line per run when there is no database, so a skipped suite is
    // never mistaken for a missing one. Must not import from `vitest`.
    globalSetup: ['tests/global-setup.ts'],
  },
});
