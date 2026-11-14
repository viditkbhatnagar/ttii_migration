/**
 * Credential PDFs (Certificate, Marksheet, Provisional Certificate) — Credential Manager
 * (Naji 2026-11-14). A4, TTII brand (same look as affiliation-certificate-pdf.ts), optional
 * template background and signature images, QR to the public verification URL, "fields to print"
 * honoured, and a "DUPLICATE - issued on DD-MM-YYYY" mark on duplicate copies.
 *
 * pdfkit gotcha (application-pdf.ts drawFooter): absolutely positioned text near or below the
 * bottom margin keeps the wrapper active and spawns blank pages, so every such line passes
 * `lineBreak: false` and a `height`.
 */

import PDFDocument from 'pdfkit';

const COLOR_PRIMARY = '#8F2774';
const COLOR_ACCENT = '#F06543';
const COLOR_TEXT = '#1F2937';
const COLOR_MUTED = '#6B7280';
const COLOR_BORDER = '#E9D5E3';
const MARGIN = 40;

export interface PdfSubject {
  code: string; title: string; credits: number | null; internal: number | null; theory: number | null;
  practical: number | null; total: number; points: number; grade: string; result: string;
}
export interface PdfSignatory { name: string; designation: string; image: Buffer | null }

export interface CredentialPdfInput {
  docType: 'certificate' | 'marksheet' | 'provisional' | 'transcript';
  documentNo: string;
  verificationId: string;
  /** DD-MM-YYYY */
  issueDate: string;
  printedName: string;
  enrolmentNo: string;
  programme: string;
  level: string;
  durationText: string;
  creditsTotal: number | null;
  cgpa: string;
  grade: string;
  result: string;
  examSession: string;
  subjects: PdfSubject[];
  /** The PRINT_FIELDS to show; empty = the built-in default layout. */
  fields: string[];
  backgroundImage: Buffer | null;
  signatories: PdfSignatory[];
  qrPng: Buffer | null;
  publicUrl: string;
  templateLabel: string;
  /** "DUPLICATE - issued on DD-MM-YYYY" on duplicate copies. */
  copyLabel?: string;
}

type Doc = PDFKit.PDFDocument;

const TITLE: Record<CredentialPdfInput['docType'], string> = {
  certificate: 'Certificate', marksheet: 'Marksheet', provisional: 'Provisional Certificate', transcript: 'Consolidated Transcript',
};
const DEFAULT_FIELDS = ['Learner name', 'Enrolment no.', 'Programme title', 'CGPA', 'Grade', 'Exam month/year', 'Document no.', 'Issue date', 'QR', 'Signatories'];

function centred(doc: Doc, value: string, y: number, size: number, opts: { font?: string; color?: string; spacing?: number } = {}): void {
  doc.save();
  doc.font(opts.font ?? 'Helvetica').fontSize(size).fillColor(opts.color ?? COLOR_TEXT);
  doc.text(value, MARGIN + 20, y, { width: doc.page.width - MARGIN * 2 - 40, align: 'center', lineBreak: false, height: size + 6, ...(opts.spacing ? { characterSpacing: opts.spacing } : {}) });
  doc.restore();
}

function monthYear(session: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(session);
  if (!m) return session;
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${names[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

function drawFrame(doc: Doc): void {
  const w = doc.page.width; const h = doc.page.height;
  doc.save();
  doc.lineWidth(3).strokeColor(COLOR_PRIMARY).rect(MARGIN / 2, MARGIN / 2, w - MARGIN, h - MARGIN).stroke();
  doc.lineWidth(0.8).strokeColor(COLOR_BORDER).rect(MARGIN / 2 + 7, MARGIN / 2 + 7, w - MARGIN - 14, h - MARGIN - 14).stroke();
  doc.restore();
}

function drawBanner(doc: Doc, title: string, hasBackground: boolean): number {
  const x = MARGIN; const y = MARGIN; const w = doc.page.width - MARGIN * 2; const height = 70;
  if (!hasBackground) {
    doc.save();
    doc.roundedRect(x, y, w, height, 8).fill(COLOR_PRIMARY);
    doc.rect(x + w - 8, y, 8, height).fill(COLOR_ACCENT);
    doc.restore();
  }
  doc.save();
  doc.fillColor(hasBackground ? COLOR_PRIMARY : '#FFFFFF').font('Helvetica-Bold').fontSize(8);
  doc.text("TEACHERS' TRAINING INSTITUTE OF INDIA", x + 20, y + 14, { width: w - 40, align: 'center', characterSpacing: 1.5, lineBreak: false, height: 12 });
  doc.font('Helvetica-Bold').fontSize(22);
  doc.text(title, x + 20, y + 30, { width: w - 40, align: 'center', lineBreak: false, height: 28 });
  doc.restore();
  return y + height;
}

function detailLines(doc: Doc, input: CredentialPdfInput, fields: string[], startY: number): number {
  const pairs: Array<[string, string]> = [];
  const has = (f: string): boolean => fields.includes(f);
  if (has('Enrolment no.')) pairs.push(['Enrolment no.', input.enrolmentNo]);
  if (has('Level') && input.level) pairs.push(['Level', input.level]);
  if (has('Duration') && input.durationText) pairs.push(['Duration', input.durationText]);
  if (has('Credits') && input.creditsTotal !== null) pairs.push(['Credits', String(input.creditsTotal)]);
  if (has('CGPA') && input.cgpa) pairs.push(['CGPA', input.cgpa]);
  if (has('Grade') && input.grade) pairs.push(['Grade', input.grade]);
  if (has('Exam month/year') && input.examSession) pairs.push(['Exam month/year', monthYear(input.examSession)]);
  if (input.docType === 'marksheet' && input.result) pairs.push(['Result', input.result]);
  if (has('Document no.')) pairs.push(['Document no.', input.documentNo]);
  if (has('Issue date')) pairs.push(['Issue date', input.issueDate]);
  let y = startY;
  const colW = (doc.page.width - MARGIN * 2 - 80) / 2;
  pairs.forEach(([label, value], i) => {
    const x = MARGIN + 40 + (i % 2) * colW;
    if (i % 2 === 0 && i > 0) y += 34;
    doc.save();
    doc.font('Helvetica').fontSize(8).fillColor(COLOR_MUTED).text(label.toUpperCase(), x, y, { width: colW - 10, lineBreak: false, height: 10, characterSpacing: 0.6 });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR_TEXT).text(value, x, y + 11, { width: colW - 10, lineBreak: false, height: 14, ellipsis: true });
    doc.restore();
  });
  return pairs.length > 0 ? y + 40 : y;
}

function drawSubjects(doc: Doc, subjects: PdfSubject[], startY: number): number {
  const showInternal = subjects.some((s) => s.internal !== null);
  const showPractical = subjects.some((s) => s.practical !== null);
  const showCredits = subjects.some((s) => s.credits !== null);
  const cols: Array<{ h: string; w: number; v: (s: PdfSubject) => string; align?: 'left' | 'right' }> = [
    { h: 'Code', w: 52, v: (s) => s.code || '-' },
    { h: 'Subject', w: 0, v: (s) => s.title },
    ...(showCredits ? [{ h: 'Credits', w: 40, v: (s: PdfSubject) => String(s.credits ?? '-') }] : []),
    ...(showInternal ? [{ h: 'Internal', w: 42, v: (s: PdfSubject) => String(s.internal ?? '-') }] : []),
    { h: 'Theory', w: 42, v: (s) => String(s.theory ?? '-') },
    ...(showPractical ? [{ h: 'Practical', w: 46, v: (s: PdfSubject) => String(s.practical ?? '-') }] : []),
    { h: 'Total', w: 40, v: (s) => String(s.total) },
    { h: 'Points', w: 38, v: (s) => String(s.points) },
    { h: 'Grade', w: 36, v: (s) => s.grade },
    { h: 'Result', w: 38, v: (s) => s.result },
  ];
  const full = doc.page.width - MARGIN * 2 - 40;
  const fixed = cols.reduce((sum, c) => sum + c.w, 0);
  const widths = cols.map((c) => (c.w === 0 ? full - fixed : c.w));
  const draw = (cells: string[], y: number, header: boolean): void => {
    let x = MARGIN + 20;
    cells.forEach((cell, i) => {
      doc.save();
      doc.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(header ? COLOR_PRIMARY : COLOR_TEXT);
      doc.text(cell, x + 2, y, { width: (widths[i] ?? 40) - 4, lineBreak: false, height: 11, ellipsis: true });
      doc.restore();
      x += widths[i] ?? 40;
    });
    doc.save();
    doc.strokeColor(COLOR_BORDER).lineWidth(0.5).moveTo(MARGIN + 20, y + 12).lineTo(MARGIN + 20 + full, y + 12).stroke();
    doc.restore();
  };
  let y = startY;
  draw(cols.map((c) => c.h), y, true);
  y += 15;
  for (const s of subjects) {
    draw(cols.map((c) => c.v(s)), y, false);
    y += 15;
  }
  return y + 4;
}

export async function renderCredentialPdf(input: CredentialPdfInput): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, info: { Title: `${TITLE[input.docType]} ${input.documentNo}`, Author: "Teachers' Training Institute of India" } });
  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (e: unknown) => reject(e instanceof Error ? e : new Error(String(e))));
  });
  const fields = input.fields.length > 0 ? input.fields : DEFAULT_FIELDS;
  const has = (f: string): boolean => fields.includes(f);

  if (input.backgroundImage) {
    try { doc.image(input.backgroundImage, 0, 0, { width: doc.page.width, height: doc.page.height }); } catch { /* unreadable image: plain layout */ }
  }
  drawFrame(doc);
  let y = drawBanner(doc, TITLE[input.docType], input.backgroundImage !== null) + 28;
  centred(doc, 'This is to certify that', y, 11, { color: COLOR_MUTED });
  y += 26;
  if (has('Learner name')) {
    doc.save();
    doc.font('Helvetica-Bold').fontSize(24).fillColor(COLOR_PRIMARY);
    const h = Math.min(doc.heightOfString(input.printedName, { width: doc.page.width - MARGIN * 2 - 80, align: 'center' }), 64);
    doc.text(input.printedName, MARGIN + 40, y, { width: doc.page.width - MARGIN * 2 - 80, align: 'center', height: h, ellipsis: true });
    doc.restore();
    y += h + 10;
  }
  if (has('Programme title')) {
    centred(doc, input.docType === 'marksheet' ? 'has the following results in' : 'has successfully completed', y, 11, { color: COLOR_MUTED });
    y += 22;
    doc.save();
    doc.font('Helvetica-Bold').fontSize(15).fillColor(COLOR_TEXT);
    const h = Math.min(doc.heightOfString(input.programme, { width: doc.page.width - MARGIN * 2 - 80, align: 'center' }), 48);
    doc.text(input.programme, MARGIN + 40, y, { width: doc.page.width - MARGIN * 2 - 80, align: 'center', height: h, ellipsis: true });
    doc.restore();
    y += h + 18;
  }
  y = detailLines(doc, input, fields, y);
  if (input.docType === 'marksheet' && input.subjects.length > 0) y = drawSubjects(doc, input.subjects, y + 4);

  const footerTop = doc.page.height - MARGIN - 132;
  doc.save();
  doc.strokeColor(COLOR_BORDER).lineWidth(0.8).moveTo(MARGIN + 30, footerTop).lineTo(doc.page.width - MARGIN - 30, footerTop).stroke();
  doc.restore();
  if (has('QR') && input.qrPng) {
    try { doc.image(input.qrPng, MARGIN + 30, footerTop + 12, { width: 72, height: 72 }); } catch { /* skip */ }
    doc.save();
    doc.font('Helvetica').fontSize(7).fillColor(COLOR_MUTED);
    doc.text('Scan to verify', MARGIN + 30, footerTop + 86, { width: 72, align: 'center', lineBreak: false, height: 9 });
    doc.text(input.verificationId, MARGIN + 20, footerTop + 97, { width: 92, align: 'center', lineBreak: false, height: 9 });
    doc.restore();
  }
  if (has('Signatories')) {
    const sigs = input.signatories.slice(0, 3);
    const slot = 150;
    sigs.forEach((s, i) => {
      const x = doc.page.width - MARGIN - 30 - slot * (sigs.length - i);
      if (s.image) { try { doc.image(s.image, x + 20, footerTop + 12, { fit: [110, 40] }); } catch { /* skip */ } }
      doc.save();
      doc.strokeColor(COLOR_MUTED).lineWidth(0.5).moveTo(x + 10, footerTop + 56).lineTo(x + slot - 10, footerTop + 56).stroke();
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR_TEXT).text(s.name, x, footerTop + 60, { width: slot, align: 'center', lineBreak: false, height: 12, ellipsis: true });
      doc.font('Helvetica').fontSize(8).fillColor(COLOR_MUTED).text(s.designation, x, footerTop + 73, { width: slot, align: 'center', lineBreak: false, height: 11, ellipsis: true });
      doc.restore();
    });
  }
  if (input.copyLabel) centred(doc, input.copyLabel, footerTop + 104, 9, { font: 'Helvetica-Bold', color: COLOR_ACCENT });
  centred(doc, `Verify at ${input.publicUrl}  ·  ${input.templateLabel}`, footerTop + 116, 7, { color: COLOR_MUTED });

  doc.end();
  return finished;
}
