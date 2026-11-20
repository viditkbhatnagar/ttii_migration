/**
 * TTII's own certificate and marksheet designs (Naji, Illustrator, 2026-11-19).
 *
 * The artwork PDF is used AS IS, as vector: pdf-lib places the original page and the learner's
 * details are drawn on a transparent overlay page (pdfkit, General Sans, the font of the design)
 * that is laid over it. Nothing is rasterised, so the download prints at the quality of the
 * Illustrator file.
 *
 * Positions below are measured from Naji's filled samples and blank exports (A4, points from the
 * top-left). Artwork of another size (an export with bleed) is mapped through its trim box.
 *
 * pdfkit gotcha (application-pdf.ts): absolutely positioned text near the page bottom must not
 * wrap, so every line passes `lineBreak: false`.
 */

import PDFDocument from 'pdfkit';
import { PDFDocument as PdfLibDocument, PDFName } from 'pdf-lib';

import { stripPageText } from './pdf-text-strip.js';

export type DesignId = 'ttii-certificate' | 'ttii-marksheet-diploma' | 'ttii-marksheet-pg-diploma';
export const DESIGN_IDS: readonly DesignId[] = ['ttii-certificate', 'ttii-marksheet-diploma', 'ttii-marksheet-pg-diploma'];

/** Font files (General Sans), or standard PDF font names (tests; e.g. 'Helvetica'). */
export interface DesignFonts { medium: Buffer | string; semibold: Buffer | string }

export interface DesignSubject {
  code: string; title: string; credits: number | null; maxMarks: number | null; obtained: number | null; grade: string; points: number;
}

export interface DesignInput {
  docType: 'certificate' | 'marksheet' | 'provisional' | 'transcript';
  documentNo: string;
  /** DD-MM-YYYY */
  issueDate: string;
  printedName: string;
  enrolmentNo: string;
  programme: string;
  durationText: string;
  creditsTotal: number | null;
  cgpa: string;
  cgpaScale: number;
  grade: string;
  /** YYYY-MM */
  examSession: string;
  parentName: string;
  /** DD/MM/YYYY */
  dateOfBirth: string;
  centreCode: string;
  academicSession: string;
  subjects: DesignSubject[];
  qrPng: Buffer | null;
  signature: Buffer | null;
  copyLabel?: string;
}

const A4 = { w: 595.276, h: 841.89 };
const CX = A4.w / 2;
const INK = '#0B0B09';
const NAME_BLUE = '#2B7CB3';
const ACCENT = '#C2410C';
const RULE = '#3F3F3F';
const HEAD_FILL = '#E6E6E6';
const MEDIUM = 'GS-Medium';
const SEMIBOLD = 'GS-Semibold';
const MIN_SIZE = 6.5;

/** Text Naji's certificate artwork draws inline, centred for the empty line (redrawn with the value). */
export const CERTIFICATE_BAKED_TEXT = ['(Enrollment No.: )', 'the examination held in', 'Overall CGPA :', 'Grade :', 'Performance Level :'] as const;

/** The descriptor column of TTII's grading table (the back of the marksheet). */
const PERFORMANCE: Record<string, string> = {
  O: 'Outstanding', 'A+': 'Excellent', A: 'Excellent', 'B+': 'Good', B: 'Above Average', C: 'Satisfactory', F: 'Fail',
};
export function performanceLevel(grade: string): string {
  return PERFORMANCE[grade.trim().toUpperCase()] ?? '';
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** YYYY-MM -> "June 2025". */
export function monthYearLabel(session: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(session.trim());
  return m ? `${MONTHS[Number(m[2]) - 1] ?? ''} ${m[1]}`.trim() : session.trim();
}
/** DD-MM-YYYY -> "15 August 2025". */
export function longDate(dmy: string): string {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dmy.trim());
  return m ? `${Number(m[1])} ${MONTHS[Number(m[2]) - 1] ?? ''} ${m[3]}` : dmy.trim();
}

/**
 * The programme title on two centred lines, as in the design: "DIPLOMA IN" /
 * "MONTESSORI TEACHER TRAINING" — split after the leading "... in" when there is one.
 */
export function programmeLines(title: string): string[] {
  const upper = title.trim().replace(/\s+/g, ' ').toUpperCase();
  if (!upper) return [];
  const m = /^((?:\S+\s+){0,3}?IN)\s+(.+)$/.exec(upper);
  return m?.[1] && m[2] ? [m[1], m[2]] : [upper];
}

type Doc = PDFKit.PDFDocument;
type Run = { text: string; font: typeof MEDIUM | typeof SEMIBOLD; color?: string };

function widthOf(doc: Doc, runs: Run[], size: number): number {
  return runs.reduce((w, r) => w + doc.font(r.font).fontSize(size).widthOfString(r.text), 0);
}

/** The size (<= `size`) at which the runs fit `maxWidth`. */
function fitSize(doc: Doc, runs: Run[], size: number, maxWidth: number): number {
  let s = size;
  while (s > MIN_SIZE && widthOf(doc, runs, s) > maxWidth) s -= 0.25;
  return s;
}

/** Runs on one baseline, starting at x (or centred on cx). */
function drawRuns(doc: Doc, runs: Run[], at: { x?: number; cx?: number; baseline: number; size: number; maxWidth: number }): void {
  const size = fitSize(doc, runs, at.size, at.maxWidth);
  let x = at.cx !== undefined ? at.cx - widthOf(doc, runs, size) / 2 : (at.x ?? 0);
  for (const r of runs) {
    if (!r.text) continue;
    doc.font(r.font).fontSize(size).fillColor(r.color ?? INK);
    doc.text(r.text, x, at.baseline, { lineBreak: false, baseline: 'alphabetic' });
    x += doc.widthOfString(r.text);
  }
}

function image(doc: Doc, png: Buffer | null, x: number, y: number, opts: { width?: number; height?: number; fit?: [number, number] }): void {
  if (!png) return;
  try { doc.image(png, x, y, opts); } catch { /* unreadable image: leave the space */ }
}

// ── Certificate ──────────────────────────────────────────────────────────────
function drawCertificate(doc: Doc, d: DesignInput): void {
  drawRuns(doc, [{ text: 'Certificate No.: ', font: SEMIBOLD }, { text: d.documentNo, font: MEDIUM }], { x: 37.5, baseline: 45.8, size: 10, maxWidth: 440 });
  image(doc, d.qrPng, 503.5, 39.5, { width: 49, height: 49 });

  drawRuns(doc, [{ text: d.printedName.toUpperCase(), font: SEMIBOLD, color: NAME_BLUE }], { cx: CX, baseline: 391, size: 22, maxWidth: 480 });
  drawRuns(doc, [
    { text: '(Enrollment No.: ', font: SEMIBOLD }, { text: d.enrolmentNo, font: MEDIUM }, { text: ')', font: MEDIUM },
  ], { cx: CX, baseline: 412.83, size: 13.6, maxWidth: 440 });

  const lines = programmeLines(d.programme);
  const baselines = lines.length === 1 ? [500.2] : [488.2, 512.2];
  lines.forEach((line, i) => drawRuns(doc, [{ text: line, font: SEMIBOLD }], { cx: CX, baseline: baselines[i] ?? 512.2, size: 21.5, maxWidth: 470 }));

  const held = monthYearLabel(d.examSession);
  drawRuns(doc, [{ text: held ? `the examination held in ${held}.` : 'the examination.', font: MEDIUM }], { cx: CX, baseline: 558.89, size: 12, maxWidth: 420 });

  const pills: Array<{ from: number; to: number; label: string; value: string }> = [
    { from: 120, to: 230, label: 'Overall CGPA : ', value: d.cgpa ? `${d.cgpa}/${d.cgpaScale}` : '' },
    { from: 240.5, to: 303.2, label: 'Grade : ', value: d.grade },
    { from: 313.8, to: 475, label: 'Performance Level : ', value: performanceLevel(d.grade) },
  ];
  for (const p of pills) {
    drawRuns(doc, [{ text: p.label, font: SEMIBOLD }, { text: p.value, font: MEDIUM }], { cx: (p.from + p.to) / 2, baseline: 592.45, size: 9.63, maxWidth: p.to - p.from - 10 });
  }

  drawRuns(doc, [{ text: 'Date of Issue: ', font: SEMIBOLD }, { text: longDate(d.issueDate), font: MEDIUM }], { x: 43.5, baseline: 797.9, size: 10, maxWidth: 175 });
  image(doc, d.signature, 425.5, 742, { fit: [123.5, 40] });
  if (d.copyLabel) drawRuns(doc, [{ text: d.copyLabel, font: SEMIBOLD, color: ACCENT }], { cx: CX, baseline: 826, size: 8, maxWidth: 400 });
}

// ── Marksheet ────────────────────────────────────────────────────────────────
interface FieldSpot { right: number; top: number; max: number }
interface MarksheetSpec {
  fields: Record<'programme' | 'duration' | 'credits' | 'name' | 'parent' | 'dob' | 'centre' | 'enrolment' | 'session' | 'exam', FieldSpot>;
  tableTop: number;
  tableBottom: number;
  controllerTop: number;
}

const DIPLOMA: MarksheetSpec = {
  fields: {
    programme: { right: 106.7, top: 263.7, max: 556 }, duration: { right: 90.1, top: 279.7, max: 166 }, credits: { right: 214.1, top: 279.7, max: 556 },
    name: { right: 147.5, top: 305.6, max: 556 }, parent: { right: 122.6, top: 321.8, max: 556 },
    dob: { right: 111.9, top: 338.1, max: 239 }, centre: { right: 112.9, top: 353.9, max: 239 },
    enrolment: { right: 324.3, top: 337.4, max: 556 }, session: { right: 346.6, top: 354.1, max: 556 },
    exam: { right: 113.5, top: 604.1, max: 400 },
  },
  tableTop: 383.6,
  tableBottom: 598.4,
  controllerTop: 731.4,
};
const PG_DIPLOMA: MarksheetSpec = {
  fields: {
    programme: { right: 106.7, top: 235.3, max: 556 }, duration: { right: 90.1, top: 251.4, max: 166 }, credits: { right: 214.1, top: 251.4, max: 556 },
    name: { right: 147.5, top: 277.3, max: 556 }, parent: { right: 122.6, top: 293.4, max: 556 },
    dob: { right: 111.9, top: 309.7, max: 239 }, centre: { right: 112.9, top: 325.5, max: 239 },
    enrolment: { right: 324.3, top: 309.1, max: 556 }, session: { right: 346.6, top: 325.8, max: 556 },
    exam: { right: 113.5, top: 667.1, max: 400 },
  },
  tableTop: 356.25,
  tableBottom: 661.5,
  controllerTop: 748.4,
};

/** Column boundaries of the subjects table (measured from the sample). */
const COLS = [40.5, 61.6, 121.6, 342.1, 380.75, 417.4, 468.4, 503.25, 556.5];
const HEADER = ['Sl.\nNo.', 'Subject\nCode', 'Subject Title', 'Credit', 'Max.\nMarks', 'Marks\nObtained', 'Grade', 'Grade\nPoint(GP)'];
const HEADER_H = 30.8;
const ROW_H = 22.9;
const fmt = (n: number | null): string => (n === null || !Number.isFinite(n) ? '' : String(Math.round(n * 100) / 100));

function cell(doc: Doc, text: string, col: number, top: number, height: number, opts: { font: typeof MEDIUM | typeof SEMIBOLD; size: number }): void {
  const left = COLS[col] ?? 0; const right = COLS[col + 1] ?? left;
  const lines = text.split('\n');
  const width = right - left - 4;
  const size = Math.min(opts.size, ...lines.map((l) => fitSize(doc, [{ text: l, font: opts.font }], opts.size, width)));
  const lineGap = size * 1.12;
  const first = top + height / 2 - ((lines.length - 1) * lineGap) / 2 + size * 0.36;
  lines.forEach((line, i) => {
    doc.font(opts.font).fontSize(size).fillColor(INK);
    const w = doc.widthOfString(line);
    doc.text(line, left + (right - left - w) / 2, first + i * lineGap, { lineBreak: false, baseline: 'alphabetic' });
  });
}

function drawTable(doc: Doc, spec: MarksheetSpec, d: DesignInput): void {
  const rows = d.subjects.length + 1;
  const rowH = Math.min(ROW_H, (spec.tableBottom - spec.tableTop - HEADER_H) / rows);
  const size = Math.min(9, Math.max(MIN_SIZE, rowH * 0.42));
  const left = COLS[0] as number; const right = COLS[COLS.length - 1] as number;
  const bottom = spec.tableTop + HEADER_H + rowH * rows;

  doc.save();
  doc.rect(left, spec.tableTop, right - left, bottom - spec.tableTop).fill('#FFFFFF');
  doc.rect(left, spec.tableTop, right - left, HEADER_H).fill(HEAD_FILL);
  doc.restore();

  HEADER.forEach((h, i) => cell(doc, h, i, spec.tableTop, HEADER_H, { font: SEMIBOLD, size: 8.5 }));
  d.subjects.forEach((s, i) => {
    const top = spec.tableTop + HEADER_H + rowH * i;
    const values = [String(i + 1), s.code, s.title, fmt(s.credits), fmt(s.maxMarks), fmt(s.obtained), s.grade, String(s.points)];
    values.forEach((v, c) => cell(doc, v, c, top, rowH, { font: c === 5 ? SEMIBOLD : MEDIUM, size }));
  });

  const totalTop = spec.tableTop + HEADER_H + rowH * d.subjects.length;
  const sum = (pick: (s: DesignSubject) => number | null): number | null =>
    d.subjects.length > 0 && d.subjects.every((s) => pick(s) !== null) ? d.subjects.reduce((t, s) => t + (pick(s) ?? 0), 0) : null;
  const totals = ['', '', 'TOTAL', fmt(d.creditsTotal ?? sum((s) => s.credits)), fmt(sum((s) => s.maxMarks)), fmt(sum((s) => s.obtained)), d.grade, d.cgpa];
  totals.forEach((v, c) => cell(doc, v, c, totalTop, rowH, { font: SEMIBOLD, size }));

  doc.save();
  doc.lineWidth(0.6).strokeColor(RULE);
  doc.rect(left, spec.tableTop, right - left, bottom - spec.tableTop).stroke();
  const ys = [spec.tableTop + HEADER_H, ...Array.from({ length: rows - 1 }, (_, i) => spec.tableTop + HEADER_H + rowH * (i + 1))];
  for (const y of ys) doc.moveTo(left, y).lineTo(right, y).stroke();
  for (const x of COLS.slice(1, -1)) doc.moveTo(x, spec.tableTop).lineTo(x, bottom).stroke();
  doc.restore();
}

function drawMarksheet(doc: Doc, d: DesignInput, spec: MarksheetSpec): void {
  drawRuns(doc, [{ text: 'Mark Sheet No.: ', font: SEMIBOLD }, { text: d.documentNo, font: MEDIUM }], { x: 38.5, baseline: 38.5, size: 10, maxWidth: 450 });
  image(doc, d.qrPng, 515, 29.2, { width: 48.5, height: 48.5 });

  const f = spec.fields;
  const value = (spot: FieldSpot, text: string): void => {
    if (text) drawRuns(doc, [{ text, font: MEDIUM }], { x: spot.right + 4, baseline: spot.top + 11.1, size: 11, maxWidth: spot.max - spot.right - 4 });
  };
  value(f.programme, d.programme);
  value(f.duration, d.durationText);
  value(f.credits, d.creditsTotal === null ? '' : fmt(d.creditsTotal));
  value(f.name, d.printedName);
  value(f.parent, d.parentName);
  value(f.dob, d.dateOfBirth);
  value(f.centre, d.centreCode);
  value(f.enrolment, d.enrolmentNo);
  value(f.session, d.academicSession);
  value(f.exam, monthYearLabel(d.examSession));

  drawTable(doc, spec, d);
  image(doc, d.signature, 418.7, spec.controllerTop - 44, { fit: [123.5, 40] });
  if (d.copyLabel) drawRuns(doc, [{ text: d.copyLabel, font: SEMIBOLD, color: ACCENT }], { cx: CX, baseline: 826, size: 8, maxWidth: 400 });
}

/** The transparent page of learner details for one design. */
export async function renderDesignOverlay(design: DesignId, input: DesignInput, fonts: DesignFonts): Promise<Buffer> {
  const doc = new PDFDocument({ size: [A4.w, A4.h], margin: 0 });
  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (e: unknown) => reject(e instanceof Error ? e : new Error(String(e))));
  });
  doc.registerFont(MEDIUM, fonts.medium);
  doc.registerFont(SEMIBOLD, fonts.semibold);
  if (design === 'ttii-certificate') drawCertificate(doc, input);
  else drawMarksheet(doc, input, design === 'ttii-marksheet-pg-diploma' ? PG_DIPLOMA : DIPLOMA);
  doc.end();
  return finished;
}

/**
 * Why this artwork cannot carry the overlay (the positions are A4 portrait), or null. Checked at
 * upload (Settings > Templates) and again at render, where a failure falls back to the built-in layout.
 */
export function artworkProblem(pdf: PdfLibDocument): string | null {
  if (pdf.getPageCount() < 1) return 'The PDF has no pages.';
  const page = pdf.getPage(0);
  if (page.getRotation().angle % 360 !== 0) return 'The first page is rotated. Export it as an upright A4 page.';
  const { width, height } = page.getTrimBox();
  if (!(width > 0) || !(height > 0) || Math.abs(height / width - A4.h / A4.w) > 0.01) return 'The first page must be A4 portrait (210 x 297 mm).';
  return null;
}

/** Scripts, form fields, links and attachments do not belong on an issued credential. */
function removeActiveContent(pdf: PdfLibDocument): void {
  for (const key of ['OpenAction', 'AA', 'Names', 'AcroForm', 'URI', 'JavaScript']) pdf.catalog.delete(PDFName.of(key));
  for (const page of pdf.getPages()) {
    page.node.delete(PDFName.of('Annots'));
    page.node.delete(PDFName.of('AA'));
  }
}

/** The artwork with the learner's details laid over its first page. Later pages (a back) are kept as they are. */
export async function renderDesignedCredential(design: DesignId, artwork: Buffer, input: DesignInput, fonts: DesignFonts, title: string): Promise<Buffer> {
  const pdf = await PdfLibDocument.load(artwork, { updateMetadata: false });
  const problem = artworkProblem(pdf);
  if (problem) throw new Error(problem);
  if (design === 'ttii-certificate') {
    // Not stripping (an unusual content stream) still prints the design; the labels overprint.
    try { stripPageText(pdf, 0, CERTIFICATE_BAKED_TEXT); } catch { /* keep the artwork as it is */ }
  }
  removeActiveContent(pdf);
  const overlayBytes = await renderDesignOverlay(design, input, fonts);
  const [overlay] = await pdf.embedPdf(overlayBytes, [0]);
  const page = pdf.getPage(0);
  const trim = page.getTrimBox();
  const scale = trim.width / A4.w;
  if (overlay) page.drawPage(overlay, { x: trim.x, y: trim.y + trim.height - A4.h * scale, width: A4.w * scale, height: A4.h * scale });
  pdf.setTitle(title);
  pdf.setAuthor("Teachers' Training Institute of India");
  pdf.setCreator('TTII LMS Credential Manager');
  pdf.setProducer('TTII LMS');
  // No embedded XMP from Illustrator should claim the old title.
  pdf.catalog.delete(PDFName.of('Metadata'));
  pdf.setSubject(title);
  return Buffer.from(await pdf.save());
}
