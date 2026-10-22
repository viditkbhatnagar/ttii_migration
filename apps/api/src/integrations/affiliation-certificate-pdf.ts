/**
 * Affiliation Certificate PDF — Centres v2 (Naji 2026-10-22).
 *
 * One A4 page, the wording of Naji's certificate preview ("This is to certify
 * that {centre} … is an affiliated centre of TTII."), in the same brand as the
 * Student Enrollment Application PDF (application-pdf.ts): the TTII purple
 * banner with the orange accent stripe, Helvetica, the muted footer line.
 *
 * pdfkit gotcha (application-pdf.ts drawFooter): text placed near or below the
 * bottom margin keeps the line wrapper active and spawns blank pages, so every
 * absolutely-positioned line here passes `lineBreak: false` and a `height`.
 */

import PDFDocument from 'pdfkit';

const COLOR_PRIMARY = '#8F2774';
const COLOR_ACCENT = '#F06543';
const COLOR_TEXT_DARK = '#1F2937';
const COLOR_TEXT_MUTED = '#6B7280';
const COLOR_BORDER = '#E9D5E3';

const MARGIN = 40;

export interface AffiliationCertificatePdfInput {
  certificateNo: string;
  centreName: string;
  /** "District, State" (or whatever of it is known). */
  location: string;
  centreCode: string;
  /** Already formatted, e.g. "22 Oct 2026". */
  validFrom: string;
  validTo: string;
  agreementNo: string;
  issuedOn: string;
}

type Doc = PDFKit.PDFDocument;

function line(doc: Doc, value: string, y: number, opts: { size: number; font?: string; color?: string; height?: number; spacing?: number }): void {
  const width = doc.page.width - MARGIN * 2 - 60;
  doc.save();
  doc.font(opts.font ?? 'Helvetica').fontSize(opts.size).fillColor(opts.color ?? COLOR_TEXT_DARK);
  doc.text(value, MARGIN + 30, y, {
    width,
    align: 'center',
    lineBreak: false,
    height: opts.height ?? opts.size + 6,
    ...(opts.spacing ? { characterSpacing: opts.spacing } : {}),
  });
  doc.restore();
}

/** A wrapped, centred block (the centre name can be long); returns the y below it. */
function block(doc: Doc, value: string, y: number, size: number): number {
  const width = doc.page.width - MARGIN * 2 - 80;
  doc.save();
  doc.font('Helvetica-Bold').fontSize(size).fillColor(COLOR_PRIMARY);
  const height = Math.min(doc.heightOfString(value, { width, align: 'center' }), size * 3.6);
  doc.text(value, MARGIN + 40, y, { width, align: 'center', height, ellipsis: true });
  doc.restore();
  return y + height;
}

function drawFrame(doc: Doc): void {
  const w = doc.page.width;
  const h = doc.page.height;
  doc.save();
  doc.lineWidth(3).strokeColor(COLOR_PRIMARY).rect(MARGIN / 2, MARGIN / 2, w - MARGIN, h - MARGIN).stroke();
  doc.lineWidth(0.8).strokeColor(COLOR_BORDER).rect(MARGIN / 2 + 7, MARGIN / 2 + 7, w - MARGIN - 14, h - MARGIN - 14).stroke();
  doc.restore();
}

function drawBanner(doc: Doc): number {
  const x = MARGIN;
  const y = MARGIN;
  const w = doc.page.width - MARGIN * 2;
  const height = 78;
  doc.save();
  doc.roundedRect(x, y, w, height, 8).fill(COLOR_PRIMARY);
  doc.rect(x + w - 8, y, 8, height).fill(COLOR_ACCENT);
  doc.restore();
  doc.save();
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
  doc.text("TEACHERS' TRAINING INSTITUTE OF INDIA", x + 20, y + 16, { width: w - 40, align: 'center', characterSpacing: 1.5, lineBreak: false, height: 12 });
  doc.font('Helvetica-Bold').fontSize(22);
  doc.text('Affiliation Certificate', x + 20, y + 32, { width: w - 40, align: 'center', lineBreak: false, height: 28 });
  doc.opacity(0.85).font('Helvetica-Oblique').fontSize(8);
  doc.text('Empower. Educate. Evolve.', x + 20, y + 60, { width: w - 40, align: 'center', lineBreak: false, height: 12 });
  doc.opacity(1);
  doc.restore();
  return y + height;
}

function drawSeal(doc: Doc, cx: number, cy: number): void {
  doc.save();
  doc.circle(cx, cy, 30).lineWidth(2).strokeColor(COLOR_PRIMARY).stroke();
  doc.circle(cx, cy, 24).lineWidth(0.8).strokeColor(COLOR_ACCENT).stroke();
  doc.font('Helvetica-Bold').fontSize(14).fillColor(COLOR_PRIMARY);
  doc.text('TTII', cx - 30, cy - 7, { width: 60, align: 'center', lineBreak: false, height: 16 });
  doc.restore();
}

export async function renderAffiliationCertificatePdf(input: AffiliationCertificatePdfInput): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: MARGIN,
    info: { Title: `Affiliation Certificate ${input.certificateNo}`, Author: "Teachers' Training Institute of India" },
  });
  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err: unknown) => reject(err instanceof Error ? err : new Error(String(err))));
  });

  drawFrame(doc);
  const bannerBottom = drawBanner(doc);
  const centreX = doc.page.width / 2;
  drawSeal(doc, centreX, bannerBottom + 70);

  let y = bannerBottom + 130;
  line(doc, 'TTII', y, { size: 13, font: 'Helvetica-Bold', color: COLOR_TEXT_DARK, spacing: 2 });
  y += 22;
  line(doc, 'AFFILIATION CERTIFICATE', y, { size: 10, color: COLOR_TEXT_MUTED, spacing: 2 });
  y += 60;
  line(doc, 'This is to certify that', y, { size: 12, color: COLOR_TEXT_MUTED });
  y += 30;
  y = block(doc, input.centreName, y, 26) + 12;
  if (input.location) {
    line(doc, input.location, y, { size: 12, color: COLOR_TEXT_MUTED });
    y += 26;
  }
  line(doc, `Centre Code: ${input.centreCode}`, y, { size: 12, font: 'Helvetica-Bold' });
  y += 36;
  line(doc, 'is an affiliated centre of TTII.', y, { size: 15 });

  const footerTop = doc.page.height - MARGIN - 150;
  doc.save();
  doc.strokeColor(COLOR_BORDER).lineWidth(0.8).moveTo(MARGIN + 60, footerTop).lineTo(doc.page.width - MARGIN - 60, footerTop).stroke();
  doc.restore();
  line(doc, `Certificate Number: ${input.certificateNo}`, footerTop + 18, { size: 10, color: COLOR_TEXT_MUTED });
  line(doc, `Valid ${input.validFrom} – ${input.validTo}`, footerTop + 36, { size: 10, color: COLOR_TEXT_MUTED });
  line(doc, `Agreement ${input.agreementNo}`, footerTop + 54, { size: 10, color: COLOR_TEXT_MUTED });
  line(doc, `Issued on ${input.issuedOn}`, footerTop + 72, { size: 9, color: COLOR_TEXT_MUTED });
  line(doc, "Teachers' Training Institute of India · teachersindia.in", footerTop + 110, { size: 8, color: COLOR_TEXT_MUTED });

  doc.end();
  return finished;
}
