/* eslint-disable @typescript-eslint/require-await -- in-memory fakes mirror async Prisma */
// TTII's Illustrator certificate / marksheet designs (Naji, 2026-11-19/20): the artwork PDF is
// kept as vector and the learner's details are laid over it.
import PDFDocument from 'pdfkit';
import { PDFArray, PDFDocument as PdfLib, PDFName, degrees } from 'pdf-lib';
import type { PrismaClient } from '@prisma/client';
import { describe, expect, test } from 'vitest';

import { designFor, isPdf, type CredentialDesignAssets } from '../../src/integrations/credential-design-assets.js';
import {
  CERTIFICATE_BAKED_TEXT, artworkProblem, longDate, monthYearLabel, performanceLevel, programmeLines, renderDesignedCredential,
  type DesignFonts, type DesignInput,
} from '../../src/integrations/credential-design-pdf.js';
import { findShowOps, glyphToText, matchRuns, parseToUnicode, stripPageText } from '../../src/integrations/pdf-text-strip.js';
import { academicSessionLabel, dobLabel } from '../../src/operations/credential-lms-adapter.js';
import { CredentialIssueService } from '../../src/operations/credential-issue-service.js';
import type { CredentialSnapshot } from '../../src/operations/credential-issue-model.js';

const STANDARD: DesignFonts = { medium: 'Helvetica', semibold: 'Helvetica-Bold' };

/** A one-page A4 "artwork" with live text lines, like an Illustrator export. */
async function artwork(lines: Array<string | string[]>): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve) => { doc.on('data', (c: Buffer) => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); });
  doc.font('Helvetica').fontSize(12);
  lines.forEach((line, i) => {
    // An array is ONE visual line drawn as several runs (Illustrator splits on a font change).
    const runs = Array.isArray(line) ? line : [line];
    let x = 60;
    for (const run of runs) { doc.text(run, x, 80 + i * 30, { lineBreak: false }); x += doc.widthOfString(run); }
  });
  doc.end();
  return done;
}

async function pageTexts(pdf: Buffer | PdfLib): Promise<string[]> {
  const doc = pdf instanceof PdfLib ? pdf : await PdfLib.load(pdf);
  const page = doc.getPage(0);
  const fonts = new Map<string, ReturnType<typeof parseToUnicode>>();
  // pdfkit's standard fonts are WinAnsi: identity for ASCII.
  const ascii = { bytes: 1 as const, map: new Map(Array.from({ length: 224 }, (_, i) => [i + 32, String.fromCharCode(i + 32)] as const)) };
  for (const [name] of page.node.Resources()?.lookupMaybe(PDFName.of('Font'), (await import('pdf-lib')).PDFDict)?.entries() ?? []) fonts.set(name.asString().slice(1), ascii);
  const { decodePDFRawStream, PDFRawStream, PDFArray, PDFRef } = await import('pdf-lib');
  const contents = page.node.get(PDFName.of('Contents'));
  const resolved = contents instanceof PDFRef ? doc.context.lookup(contents) : contents;
  const parts = resolved instanceof PDFArray ? resolved.asArray() : [contents];
  const bytes = Buffer.concat(parts.map((p) => {
    const s = p instanceof PDFRef ? doc.context.lookup(p) : p;
    return Buffer.from(s instanceof PDFRawStream ? decodePDFRawStream(s).decode() : new Uint8Array());
  }));
  return findShowOps(bytes, fonts).map((o) => o.text);
}

describe('design helpers', () => {
  test('the programme title splits after the leading "... in", as in the design', () => {
    expect(programmeLines('Diploma in Montessori Teacher Training')).toEqual(['DIPLOMA IN', 'MONTESSORI TEACHER TRAINING']);
    expect(programmeLines('PG Diploma in Montessori Teacher Training')).toEqual(['PG DIPLOMA IN', 'MONTESSORI TEACHER TRAINING']);
    expect(programmeLines('Certified Ai Ready Teacher')).toEqual(['CERTIFIED AI READY TEACHER']);
    expect(programmeLines('  ')).toEqual([]);
  });
  test('performance level follows the grading table on the back of the marksheet', () => {
    expect(performanceLevel('O')).toBe('Outstanding');
    expect(performanceLevel('A+')).toBe('Excellent');
    expect(performanceLevel('b')).toBe('Above Average');
    expect(performanceLevel('Z')).toBe('');
  });
  test('dates read the way the design prints them', () => {
    expect(monthYearLabel('2025-06')).toBe('June 2025');
    expect(longDate('15-08-2025')).toBe('15 August 2025');
    expect(dobLabel(new Date(Date.UTC(1999, 5, 22)))).toBe('22/06/1999');
    expect(dobLabel(new Date(Date.UTC(1800, 0, 1)))).toBe('');
    expect(dobLabel(null)).toBe('');
    expect(academicSessionLabel(new Date(Date.UTC(2024, 6, 1)), new Date(Date.UTC(2025, 5, 30)))).toBe('2024–2025');
    expect(academicSessionLabel(new Date(Date.UTC(2026, 10, 2)), new Date(Date.UTC(2026, 10, 30)))).toBe('2026');
    expect(academicSessionLabel(null, null)).toBe('');
  });
  test('certificates share one design; PG Diploma marksheets have their own', () => {
    expect(designFor('certificate', 'PG Diploma')).toBe('ttii-certificate');
    expect(designFor('marksheet', 'PG Diploma')).toBe('ttii-marksheet-pg-diploma');
    expect(designFor('marksheet', 'Diploma')).toBe('ttii-marksheet-diploma');
    expect(designFor('marksheet', null)).toBe('ttii-marksheet-diploma');
    expect(designFor('provisional', 'Diploma')).toBeNull();
  });
  test('isPdf sniffs the magic bytes', async () => {
    expect(isPdf(await artwork(['x']))).toBe(true);
    expect(isPdf(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0]))).toBe(false);
    expect(isPdf(null)).toBe(false);
  });
});

describe('removing baked label text from artwork', () => {
  test('ToUnicode bfchar and bfrange (incl. 2-byte codes) decode', () => {
    const cmap = parseToUnicode('begincodespacerange <0000> <FFFF> endcodespacerange\n2 beginbfchar <0003> <0020> <0004> <0028> endbfchar\n1 beginbfrange <0010> <0012> <0041> endbfrange');
    expect(cmap.bytes).toBe(2);
    expect([3, 4, 16, 17, 18].map((c) => cmap.map.get(c))).toEqual([' ', '(', 'A', 'B', 'C']);
  });
  test('Illustrator glyph names decode', () => {
    expect(['E', 'parenleft', 'colon', 'space', 'fi', 'uni2013', 'nonsense'].map(glyphToText)).toEqual(['E', '(', ':', ' ', 'fi', '–', '']);
  });
  test('a phrase split over consecutive runs is matched as a whole; whitespace is ignored', () => {
    const ops = ['(Enrollment No.: ', ')', 'Keep'].map((text, i) => ({ start: i, end: i + 1, text, replacement: '' }));
    expect(matchRuns(ops, ['(Enrollment No.: )']).map((o) => o.text)).toEqual(['(Enrollment No.: ', ')']);
    expect(matchRuns(ops, [')'])).toHaveLength(1);
    expect(matchRuns(ops, ['Nothing here'])).toHaveLength(0);
  });
  test('only the listed labels leave the page; the rest of the artwork text stays', async () => {
    const pdf = await PdfLib.load(await artwork([
      'This is to certify that', ['(Enrollment No.: ', ')'], 'the examination held in', 'Overall CGPA :', 'Grade :', 'Performance Level :', 'Controller of Examinations',
    ]));
    expect(stripPageText(pdf, 0, CERTIFICATE_BAKED_TEXT)).toBe(6); // 5 labels, one drawn as two runs
    const left = (await pageTexts(pdf)).map((t) => t.trim()).filter(Boolean);
    expect(left).toEqual(['This is to certify that', 'Controller of Examinations']);
  });
  test('an empty run before a label is not removed with it', async () => {
    const ops = [' ', 'Grade :', 'Keep'].map((text, i) => ({ start: i, end: i + 1, text, replacement: '' }));
    expect(matchRuns(ops, ['Grade :']).map((o) => o.text)).toEqual(['Grade :']);
  });
  test('artwork exported without those labels is left as it is', async () => {
    const pdf = await PdfLib.load(await artwork(['This is to certify that']));
    expect(stripPageText(pdf, 0, CERTIFICATE_BAKED_TEXT)).toBe(0);
  });
});

const designInput: DesignInput = {
  docType: 'certificate', documentNo: 'TTII/CERT/2026/000001', issueDate: '20-11-2026', printedName: 'Anjali K Menon', enrolmentNo: 'TIDMTT26100244',
  programme: 'Diploma in Montessori Teacher Training', durationText: '6 Months', creditsTotal: null, cgpa: '8.50', cgpaScale: 10, grade: 'A+', examSession: '2026-10',
  parentName: 'K Menon', dateOfBirth: '01/02/2000', centreCode: 'TTC0001', academicSession: '2026',
  subjects: [{ code: '', title: 'Child Psychology', credits: null, maxMarks: 70, obtained: 62, grade: 'A+', points: 9 }],
  qrPng: null, signature: null,
};

describe('artwork checks', () => {
  test('only an upright A4 first page can carry the overlay', async () => {
    const make = async (size: [number, number], rotate = 0) => { const d = await PdfLib.create(); const p = d.addPage(size); if (rotate) p.setRotation(degrees(rotate)); return d; };
    expect(artworkProblem(await make([595.28, 841.89]))).toBeNull();
    expect(artworkProblem(await make([612, 792]))).toMatch(/A4 portrait/);
    expect(artworkProblem(await make([841.89, 595.28]))).toMatch(/A4 portrait/);
    expect(artworkProblem(await make([595.28, 841.89], 90))).toMatch(/rotated/);
    expect(artworkProblem(await PdfLib.create())).toMatch(/no pages/);
  });
  test('scripts, links and form fields of the artwork are not carried into the credential', async () => {
    const art = await PdfLib.load(await artwork(['x']));
    art.catalog.set(PDFName.of('OpenAction'), art.context.obj({ S: 'JavaScript', JS: 'app.alert(1)' }));
    art.getPage(0).node.set(PDFName.of('Annots'), art.context.obj([art.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [0, 0, 10, 10] })]));
    const out = await PdfLib.load(await renderDesignedCredential('ttii-certificate', Buffer.from(await art.save()), designInput, STANDARD, 'C'), { updateMetadata: false });
    expect(out.catalog.get(PDFName.of('OpenAction'))).toBeUndefined();
    const annots = out.getPage(0).node.lookupMaybe(PDFName.of('Annots'), PDFArray);
    expect(annots?.size() ?? 0).toBe(0); // pdf-lib may write an empty array back
  });
});

describe('rendering on the artwork', () => {
  test('the certificate keeps the artwork page (vector) and lays the details over it', async () => {
    const art = await artwork(['This is to certify that', ['(Enrollment No.: ', ')'], 'Controller of Examinations']);
    const out = await renderDesignedCredential('ttii-certificate', art, designInput, STANDARD, 'Certificate TTII/CERT/2026/000001');
    const doc = await PdfLib.load(out, { updateMetadata: false });
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getSize()).toEqual({ width: 595.28, height: 841.89 });
    expect(doc.getTitle()).toBe('Certificate TTII/CERT/2026/000001');
    expect(doc.getProducer()).toBe('TTII LMS');
    const texts = (await pageTexts(doc)).map((t) => t.trim()).filter(Boolean);
    expect(texts).toEqual(['This is to certify that', 'Controller of Examinations']); // the label is redrawn on the overlay
    const xobjects = doc.getPage(0).node.Resources()?.lookupMaybe(PDFName.of('XObject'), (await import('pdf-lib')).PDFDict);
    expect(xobjects?.keys().length).toBeGreaterThan(0); // the overlay page
  });
  test('a marksheet (any number of subjects) renders, and a back page is kept', async () => {
    const art = await PdfLib.load(await artwork(['Programme:']));
    art.addPage([595.28, 841.89]);
    const many = Array.from({ length: 14 }, (_, i) => ({ ...designInput.subjects[0], title: `Subject ${i + 1}` })) as DesignInput['subjects'];
    const out = await renderDesignedCredential('ttii-marksheet-pg-diploma', Buffer.from(await art.save()), { ...designInput, docType: 'marksheet', subjects: many }, STANDARD, 'Marksheet');
    expect((await PdfLib.load(out)).getPageCount()).toBe(2);
  });
});

// ── The issue service picks the design ──────────────────────────────────────
const snapshot = (layout: CredentialSnapshot['layout']): CredentialSnapshot => ({
  learner: 'Anjali Menon', printedName: 'Anjali K Menon', enrolmentNo: 'TIDMTT26100244', programme: 'Diploma in Montessori Teacher Training', batch: 'B', centre: 'C',
  level: 'Diploma', durationText: '6 Months', creditsTotal: null, cgpa: '8.50', grade: 'A+', result: 'Pass', examSession: '2026-10', completionDate: '2026-11-01',
  subjects: [{ code: '', title: 'Child Psychology', credits: null, internal: null, theory: 88.6, practical: null, total: 88.6, points: 9, grade: 'A+', result: 'Pass', maxMarks: 70, obtained: 62 }],
  gradingName: 'TTII 10-point scale', ruleVersion: 1, template: { id: null, name: 'TTII layout', version: null, docType: 'certificate' }, signatoryIds: [],
  issueDate: '2026-11-20', generatedAt: '2026-11-20T00:00:00Z', parentName: 'K Menon', dateOfBirth: '01/02/2000', centreCode: 'TTC0001', academicSession: '2026', cgpaScale: 10,
  ...(layout ? { layout } : {}),
});

function service(snap: CredentialSnapshot, assets: CredentialDesignAssets, storage?: { downloadObject: (key: string) => Promise<Buffer> }) {
  const doc = {
    id: 7, doc_type: 'certificate', document_no: 'TTII/CERT/2026/000001', verification_id: 'ABCD2345', issue_date: new Date(Date.UTC(2026, 10, 20)),
    printed_name: 'Anjali K Menon', snapshot: JSON.stringify(snap),
  };
  const prisma = { credential_documents: { findUnique: async () => doc } } as unknown as PrismaClient;
  return new CredentialIssueService(prisma, { assets, origin: 'https://learn.example.test', ...(storage ? { storage: storage as never } : {}) });
}
const layout = { fields: [], backgroundKey: null, signatories: [], design: 'ttii-certificate' as const };

describe('the issue service prints the TTII design', () => {
  test('with the artwork and fonts on disk the document is the design', async () => {
    const art = await artwork(['This is to certify that']);
    const pdf = await service(snapshot(layout), { artwork: async () => art, fonts: async () => STANDARD }).renderPdf(7);
    expect((await PdfLib.load(pdf as Buffer, { updateMetadata: false })).getProducer()).toBe('TTII LMS');
  });
  test('an uploaded PDF background is the artwork', async () => {
    const uploaded = await artwork(['Uploaded artwork']);
    let defaultUsed = false;
    const svc = service(snapshot({ ...layout, backgroundKey: 'credential-settings/background-x.pdf' }),
      { artwork: async () => { defaultUsed = true; return null; }, fonts: async () => STANDARD },
      { downloadObject: async () => uploaded });
    const pdf = await svc.renderPdf(7);
    expect((await PdfLib.load(pdf as Buffer, { updateMetadata: false })).getProducer()).toBe('TTII LMS');
    expect(defaultUsed).toBe(false);
  });
  test('the template has its own artwork but storage cannot return it: no substitute design is stored', async () => {
    const art = await artwork(['x']);
    const svc = service(snapshot({ ...layout, backgroundKey: 'credential-settings/background-x.pdf' }),
      { artwork: async () => art, fonts: async () => STANDARD },
      { downloadObject: async () => { throw new Error('storage down'); } });
    expect(await svc.renderPdf(7)).toBeNull();
  });
  test('no artwork, no fonts, a PNG background or an old snapshot: the built-in layout', async () => {
    const art = await artwork(['x']);
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6300010000000500010d0a2db40000000049454e44ae426082', 'hex');
    const cases = [
      service(snapshot(layout), { artwork: async () => null, fonts: async () => STANDARD }),
      service(snapshot(layout), { artwork: async () => art, fonts: async () => null }),
      service(snapshot({ ...layout, backgroundKey: 'credential-settings/background-x.png' }), { artwork: async () => art, fonts: async () => STANDARD }, { downloadObject: async () => png }),
      service(snapshot({ fields: [], backgroundKey: null, signatories: [] }), { artwork: async () => art, fonts: async () => STANDARD }),
    ];
    for (const svc of cases) {
      const pdf = await svc.renderPdf(7);
      expect((await PdfLib.load(pdf as Buffer, { updateMetadata: false })).getProducer()).not.toBe('TTII LMS');
    }
  });
});
