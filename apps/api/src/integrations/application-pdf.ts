/**
 * Application PDF — server-side renderer for the "Student Enrollment
 * Application Form" PDF that admins currently email manually to each
 * approved student.
 *
 * Naji UAT 2026-05-15. Modelled on the sample PDF Naji shared
 * (TTI_Application_Abhaya_Babu__K_2026-02-11.pdf). Output stays close
 * to the original two-page layout:
 *   - Page 1: gradient-style banner, Course Details (with photo),
 *     Personal Information, Contact Information.
 *   - Page 2: Address rows, Qualification Details, Student Declaration
 *     bullets, Applicant signature block.
 *
 * Built on `pdfkit`. PDFKit ships only Helvetica out of the box; that
 * keeps the runtime footprint small and matches the sample's clean
 * sans look. The student photo and signature are fetched over HTTPS
 * (legacy host) and embedded; either may be missing without breaking
 * the layout.
 */

import PDFDocument from 'pdfkit';

import type { IntegrationLogger } from './contracts.js';

// ── Brand tokens (kept in sync with apps/web/src/app.css) ─────────
const COLOR_PRIMARY = '#8F2774'; // TTII purple
const COLOR_ACCENT = '#F06543'; // TTII orange (section headers)
const COLOR_HEADER_DARK = '#3B5BBE'; // banner left edge — login screen gradient start
const COLOR_TEXT_DARK = '#1F2937';
const COLOR_TEXT_MUTED = '#6B7280';
const COLOR_ROW_DIVIDER = '#E5E7EB';

const PAGE_MARGIN = 40;

export interface ApplicationPdfFieldRow {
  label: string;
  value: string;
}

export interface ApplicationPdfInput {
  /** Course title (e.g. "PG Diploma in Pre-Primary Teacher Training"). */
  courseTitle: string;
  /** Batch / offering label. */
  batch: string;
  enrollmentDate: string;
  modeOfStudy: string;
  preferredLanguage: string;
  /** Personal info block — rendered as a label/value table. */
  personal: ApplicationPdfFieldRow[];
  /** Contact info block. */
  contact: ApplicationPdfFieldRow[];
  /** Address rows shown right after Contact Information. */
  addresses: ApplicationPdfFieldRow[];
  /** Qualification rows. */
  qualification: ApplicationPdfFieldRow[];
  /** Bullet points for the Student Declaration section. */
  declaration: string[];
  /** "Submitted on …" footer line. */
  submittedOn: string;
  /** Optional student photo URL (any valid HTTPS URL). */
  photoUrl?: string | null;
  /** Optional signature image URL. */
  signatureUrl?: string | null;
}

interface FetchedAsset {
  buffer: Buffer;
}

async function fetchImageBuffer(url: string | null | undefined): Promise<FetchedAsset | null> {
  if (!url || typeof url !== 'string') return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arr = new Uint8Array(await res.arrayBuffer());
    return { buffer: Buffer.from(arr) };
  } catch {
    return null;
  }
}

function drawHeaderBanner(doc: PDFKit.PDFDocument): void {
  const width = doc.page.width;
  const bannerHeight = 70;
  const x = PAGE_MARGIN;
  const y = PAGE_MARGIN;
  const w = width - PAGE_MARGIN * 2;

  // Approximate the login-screen blue → purple → orange gradient with
  // three stacked rectangles. pdfkit's gradient API works but is
  // verbose; three blocks read as a single band at print resolution.
  const segments = [COLOR_HEADER_DARK, COLOR_PRIMARY, COLOR_ACCENT];
  const segW = w / segments.length;
  segments.forEach((color, idx) => {
    doc.save();
    doc.roundedRect(x + idx * segW, y, segW, bannerHeight, idx === 0 || idx === segments.length - 1 ? 8 : 0).fill(color);
    doc.restore();
  });

  // Title in white over the band.
  doc.save();
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20);
  doc.text("Student Enrollment Application Form", x, y + bannerHeight / 2 - 10, {
    width: w,
    align: 'center',
  });
  doc.restore();
}

function drawSectionHeader(doc: PDFKit.PDFDocument, title: string): void {
  const x = PAGE_MARGIN;
  const width = doc.page.width - PAGE_MARGIN * 2;
  const height = 26;
  const y = doc.y;
  doc.save();
  doc.roundedRect(x, y, width, height, 4).fill(COLOR_ACCENT);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11);
  doc.text(title.toUpperCase(), x + 12, y + 8, { width: width - 24 });
  doc.restore();
  doc.y = y + height + 8;
}

function drawFieldRows(
  doc: PDFKit.PDFDocument,
  rows: ApplicationPdfFieldRow[],
  options: { rightInsetX?: number; rightInsetWidth?: number } = {},
): void {
  // When a photo is rendered to the right (Course Details only) the
  // table needs to stop at `rightInsetX` so the photo doesn't get
  // overlapped. Other sections use the full width.
  const x = PAGE_MARGIN;
  const fullWidth = doc.page.width - PAGE_MARGIN * 2;
  const tableWidth = options.rightInsetWidth ?? fullWidth;
  const labelWidth = 170;
  const valueWidth = tableWidth - labelWidth - 8;
  const rowPadding = 8;

  doc.font('Helvetica').fontSize(10);
  rows.forEach((row, idx) => {
    const labelHeight = doc.heightOfString(row.label, { width: labelWidth });
    const valueHeight = doc.heightOfString(row.value || '-', { width: valueWidth });
    const rowHeight = Math.max(labelHeight, valueHeight) + rowPadding * 2;

    if (doc.y + rowHeight > doc.page.height - PAGE_MARGIN - 40) {
      doc.addPage();
    }

    // Divider above each row (except the first which sits right under
    // the section header). The sample uses faint borders, not heavy
    // separators.
    if (idx > 0) {
      doc.save();
      doc
        .moveTo(x, doc.y)
        .lineTo(x + tableWidth, doc.y)
        .strokeColor(COLOR_ROW_DIVIDER)
        .lineWidth(0.5)
        .stroke();
      doc.restore();
    }

    const cellTop = doc.y + rowPadding;
    doc.save();
    doc.fillColor(COLOR_TEXT_MUTED).font('Helvetica').fontSize(10);
    doc.text(row.label, x + 4, cellTop, { width: labelWidth });
    doc.restore();

    doc.save();
    doc.fillColor(COLOR_TEXT_DARK).font('Helvetica').fontSize(10);
    doc.text(row.value || '-', x + labelWidth + 8, cellTop, { width: valueWidth });
    doc.restore();

    doc.y = cellTop + Math.max(labelHeight, valueHeight) + rowPadding;
  });

  // Bottom divider.
  doc.save();
  doc
    .moveTo(x, doc.y)
    .lineTo(x + tableWidth, doc.y)
    .strokeColor(COLOR_ROW_DIVIDER)
    .lineWidth(0.5)
    .stroke();
  doc.restore();
  doc.y += 6;
}

function drawFooter(doc: PDFKit.PDFDocument, submittedOn: string, pageNumber: number, totalPages: number): void {
  const y = doc.page.height - 30;
  const x = PAGE_MARGIN;
  const width = doc.page.width - PAGE_MARGIN * 2;
  doc.save();
  doc.strokeColor(COLOR_ROW_DIVIDER).lineWidth(0.5);
  doc.moveTo(x, y - 8).lineTo(x + width, y - 8).stroke();
  doc.fillColor(COLOR_TEXT_MUTED).font('Helvetica').fontSize(8);
  doc.text(`Submitted on: ${submittedOn}`, x, y, { width: width / 3 });
  doc.text("Teachers' Training Institute of India", x + width / 3, y, {
    width: width / 3,
    align: 'center',
  });
  doc.text(`Page ${pageNumber} of ${totalPages}`, x + (width * 2) / 3, y, {
    width: width / 3,
    align: 'right',
  });
  doc.restore();
}

/**
 * Render the application PDF and resolve a Buffer containing the file
 * bytes. The function never throws on missing student photo /
 * signature — those slots are skipped silently. Missing fields render
 * as `-`.
 */
export async function renderApplicationPdf(
  input: ApplicationPdfInput,
  logger?: IntegrationLogger,
): Promise<Buffer> {
  const [photo, signature] = await Promise.all([
    fetchImageBuffer(input.photoUrl),
    fetchImageBuffer(input.signatureUrl),
  ]);

  const doc = new PDFDocument({
    size: 'A4',
    margin: PAGE_MARGIN,
    // bufferPages: true lets us go back at the end and stamp footers
    // with the final page count (`Page X of Y`). Without it pdfkit
    // flushes each page as soon as the next addPage() is called.
    bufferPages: true,
    info: {
      Title: 'Student Enrollment Application Form',
      Author: "Teachers' Training Institute of India",
    },
  });

  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));
  });

  // ── Page 1 ─────────────────────────────────────────────────────
  drawHeaderBanner(doc);
  doc.y = PAGE_MARGIN + 80;

  // COURSE DETAILS — with photo on the right.
  drawSectionHeader(doc, 'Course Details');
  const courseDetailsTop = doc.y;
  const photoX = doc.page.width - PAGE_MARGIN - 120;
  const photoY = courseDetailsTop;
  const photoSize = 110;
  if (photo) {
    try {
      doc.save();
      doc.roundedRect(photoX, photoY, photoSize, photoSize, 6).clip();
      doc.image(photo.buffer, photoX, photoY, { width: photoSize, height: photoSize });
      doc.restore();
    } catch (err) {
      logger?.warn('integration.pdf.photo_embed_failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  // Course rows occupy the left ~2/3 so the photo box doesn't overlap.
  const courseRows: ApplicationPdfFieldRow[] = [
    { label: 'Course:', value: input.courseTitle },
    { label: 'Batch:', value: input.batch },
    { label: 'Enrollment Date:', value: input.enrollmentDate },
    { label: 'Mode of Study:', value: input.modeOfStudy },
    { label: 'Preferred Language:', value: input.preferredLanguage },
  ];
  drawFieldRows(doc, courseRows, {
    rightInsetX: photoX,
    rightInsetWidth: photoX - PAGE_MARGIN - 20,
  });
  // Make sure we sit below the photo bottom for the next section.
  if (doc.y < photoY + photoSize + 12) doc.y = photoY + photoSize + 12;

  drawSectionHeader(doc, 'Personal Information');
  drawFieldRows(doc, input.personal);

  drawSectionHeader(doc, 'Contact Information');
  drawFieldRows(doc, input.contact);

  // Address rows continue on the next page if space is tight; pdfkit
  // auto-breaks via drawFieldRows.
  if (input.addresses.length > 0) {
    drawFieldRows(doc, input.addresses);
  }

  // ── Page 2 ─────────────────────────────────────────────────────
  if (doc.y > doc.page.height - 250) doc.addPage();

  if (input.qualification.length > 0) {
    drawSectionHeader(doc, 'Qualification Details');
    drawFieldRows(doc, input.qualification);
  }

  // STUDENT DECLARATION.
  drawSectionHeader(doc, 'Student Declaration');
  doc.font('Helvetica').fontSize(10).fillColor(COLOR_TEXT_DARK);
  input.declaration.forEach((line) => {
    const startY = doc.y;
    doc.save();
    doc.fillColor(COLOR_ACCENT).font('Helvetica-Bold').fontSize(12);
    doc.text('•', PAGE_MARGIN + 4, startY);
    doc.restore();
    doc.fillColor(COLOR_TEXT_DARK).font('Helvetica').fontSize(10);
    doc.text(line, PAGE_MARGIN + 18, startY, {
      width: doc.page.width - PAGE_MARGIN * 2 - 18,
    });
    doc.y += 4;
  });

  // APPLICANT SIGNATURE — gives the form its official feel.
  doc.y += 12;
  doc.save();
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR_TEXT_DARK);
  doc.text('APPLICANT SIGNATURE:', PAGE_MARGIN, doc.y);
  doc.restore();
  doc.y += 6;
  if (signature) {
    try {
      // Bounded box so a tall signature scan still fits cleanly.
      const sigBoxX = PAGE_MARGIN;
      const sigBoxY = doc.y;
      const sigBoxW = 220;
      const sigBoxH = 70;
      doc.save();
      doc.roundedRect(sigBoxX, sigBoxY, sigBoxW, sigBoxH, 4).strokeColor(COLOR_ROW_DIVIDER).lineWidth(0.5).stroke();
      doc.restore();
      try {
        doc.image(signature.buffer, sigBoxX + 6, sigBoxY + 6, {
          fit: [sigBoxW - 12, sigBoxH - 12],
          align: 'center',
          valign: 'center',
        });
      } catch (err) {
        logger?.warn('integration.pdf.signature_embed_failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
      doc.y = sigBoxY + sigBoxH + 4;
    } catch {
      /* swallow — fall through to text-only signature */
    }
  }
  doc.font('Helvetica-Oblique').fontSize(9).fillColor(COLOR_TEXT_MUTED);
  doc.text('Digitally Signed', PAGE_MARGIN, doc.y);

  // ── Footers ────────────────────────────────────────────────────
  // PDFKit pages are zero-indexed via `doc.bufferedPageRange()`.
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    drawFooter(doc, input.submittedOn, i + 1, range.count);
  }

  doc.end();
  return finished;
}
