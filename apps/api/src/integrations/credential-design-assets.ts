/**
 * Where TTII's credential designs live (Credential Manager, 2026-11-20).
 *
 *   <CREDENTIAL_ASSETS_DIR>/templates/certificate.pdf           every certificate
 *   <CREDENTIAL_ASSETS_DIR>/templates/marksheet-diploma.pdf     marksheets (default)
 *   <CREDENTIAL_ASSETS_DIR>/templates/marksheet-pg-diploma.pdf  marksheets of PG Diploma offerings
 *   <CREDENTIAL_ASSETS_DIR>/fonts/GeneralSans-{Medium,Semibold}.otf
 *
 * The files are NOT in git (the repository is public; the artwork is TTII's and General Sans is
 * licensed to TTII, not for redistribution). A missing file is not an error: the document falls
 * back to the built-in layout, as before.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { env } from '../env.js';
import type { DesignFonts, DesignId } from './credential-design-pdf.js';

const TEMPLATE_FILE: Record<DesignId, string> = {
  'ttii-certificate': 'templates/certificate.pdf',
  'ttii-marksheet-diploma': 'templates/marksheet-diploma.pdf',
  'ttii-marksheet-pg-diploma': 'templates/marksheet-pg-diploma.pdf',
};
const FONT_FILE = { medium: 'fonts/GeneralSans-Medium.otf', semibold: 'fonts/GeneralSans-Semibold.otf' } as const;

/** Which design prints a document: certificates share one; the marksheet differs for PG Diploma. */
export function designFor(docType: string, level: string | null | undefined): DesignId | null {
  if (docType === 'certificate') return 'ttii-certificate';
  if (docType === 'marksheet') return (level ?? '').trim().toLowerCase() === 'pg diploma' ? 'ttii-marksheet-pg-diploma' : 'ttii-marksheet-diploma';
  return null;
}

export interface CredentialDesignAssets {
  artwork(id: DesignId): Promise<Buffer | null>;
  fonts(): Promise<DesignFonts | null>;
}

/** Files under `dir`, read once per process (only successful reads are kept). */
export function fileDesignAssets(dir: string = env.CREDENTIAL_ASSETS_DIR): CredentialDesignAssets {
  const cache = new Map<string, Buffer>();
  const read = async (rel: string): Promise<Buffer | null> => {
    const hit = cache.get(rel);
    if (hit) return hit;
    try {
      const bytes = await readFile(path.join(dir, rel));
      cache.set(rel, bytes);
      return bytes;
    } catch {
      return null;
    }
  };
  return {
    artwork: (id) => read(TEMPLATE_FILE[id]),
    fonts: async () => {
      const [medium, semibold] = await Promise.all([read(FONT_FILE.medium), read(FONT_FILE.semibold)]);
      return medium && semibold ? { medium, semibold } : null;
    },
  };
}

const PDF_MAGIC = Buffer.from('%PDF-');
export function isPdf(bytes: Buffer | null | undefined): bytes is Buffer {
  return !!bytes && bytes.length > 5 && bytes.subarray(0, 5).equals(PDF_MAGIC);
}
