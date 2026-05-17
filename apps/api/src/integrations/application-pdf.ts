/**
 * Application PDF — server-side renderer for the "Student Enrollment
 * Application Form" PDF that admins currently email manually to each
 * approved student.
 *
 * Naji UAT 2026-05-15 (built) / 2026-05-17 (refined). Modelled on the
 * sample PDF Naji shared (TTI_Application_Abhaya_Babu__K_2026-02-11.pdf).
 * Output stays close to the original two-page layout:
 *   - Page 1: branded header band, Course Details (with photo on right),
 *     Personal Information, Contact Information.
 *   - Page 2 (or continued): Address rows, Qualification Details,
 *     Student Declaration bullets, Applicant signature block.
 *
 * Built on `pdfkit`. PDFKit ships only Helvetica out of the box; that
 * keeps the runtime footprint small and matches the sample's clean
 * sans look. The student photo and signature are fetched over HTTPS
 * (legacy host) OR decoded from data URLs and embedded; either may be
 * missing without breaking the layout.
 */

import PDFDocument from 'pdfkit';

import type { IntegrationLogger } from './contracts.js';

// ── Brand tokens (kept in sync with apps/web/src/app.css) ─────────
const COLOR_PRIMARY = '#8F2774'; // TTII purple — primary banner
const COLOR_ACCENT = '#F06543'; // TTII orange — section headers
const COLOR_TEXT_DARK = '#1F2937';
const COLOR_TEXT_MUTED = '#6B7280';
const COLOR_ROW_DIVIDER = '#E5E7EB';

const PAGE_MARGIN = 40;
const FOOTER_HEIGHT = 36; // reserved space at the bottom for the footer row

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
  /** Optional student photo URL (any valid HTTPS URL OR data URL). */
  photoUrl?: string | null;
  /** Optional signature image URL (HTTPS or data URL). */
  signatureUrl?: string | null;
}

interface FetchedAsset {
  buffer: Buffer;
}

/**
 * Resolve an image into a Buffer. Accepts:
 *   - data URLs ("data:image/png;base64,...") — decoded inline.
 *   - http(s) URLs — fetched.
 * Returns null on any failure so callers can render the slot blank.
 *
 * Naji UAT 2026-05-17 — signature was missing in the PDF because the
 * public form posts a base64 data URL, not a hosted URL; the previous
 * implementation went straight to fetch() and got nothing back.
 */
async function fetchImageBuffer(url: string | null | undefined): Promise<FetchedAsset | null> {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // data:image/<type>;base64,<payload>
  if (trimmed.startsWith('data:')) {
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx === -1) return null;
    const header = trimmed.slice(0, commaIdx);
    const body = trimmed.slice(commaIdx + 1);
    if (!/;base64$/i.test(header)) return null;
    try {
      return { buffer: Buffer.from(body, 'base64') };
    } catch {
      return null;
    }
  }

  try {
    const res = await fetch(trimmed);
    if (!res.ok) return null;
    const arr = new Uint8Array(await res.arrayBuffer());
    return { buffer: Buffer.from(arr) };
  } catch {
    return null;
  }
}

// Conditional page break. Adds a new page only when there is not enough
// vertical room for `requiredHeight` worth of content before the footer
// kicks in. Used to stop section headers / signature blocks from being
// stranded at the bottom of a page or leaving a half-empty trailer.
function ensureRoom(doc: PDFKit.PDFDocument, requiredHeight: number): void {
  const bottomCutoff = doc.page.height - PAGE_MARGIN - FOOTER_HEIGHT;
  if (doc.y + requiredHeight > bottomCutoff) {
    doc.addPage();
  }
}

function drawHeaderBanner(doc: PDFKit.PDFDocument): void {
  const x = PAGE_MARGIN;
  const y = PAGE_MARGIN;
  const w = doc.page.width - PAGE_MARGIN * 2;
  const bannerHeight = 78;

  // Single solid TTII purple band — cleaner than the previous 3-block
  // gradient. Naji UAT 2026-05-17.
  doc.save();
  doc.roundedRect(x, y, w, bannerHeight, 8).fill(COLOR_PRIMARY);
  doc.restore();

  // Right-side accent stripe to nod to the brand's purple→orange
  // identity without doing a full gradient.
  doc.save();
  doc.rect(x + w - 8, y, 8, bannerHeight).fill(COLOR_ACCENT);
  // Clip the right edge to keep the corner rounded — paint a tiny
  // square back over the bottom-right corner outside the rounded path.
  doc.restore();

  // Brand line (top, small, uppercase, white).
  doc.save();
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
  doc.text("TEACHERS' TRAINING INSTITUTE OF INDIA", x + 20, y + 16, {
    width: w - 40,
    align: 'center',
    characterSpacing: 1.5,
  });
  doc.restore();

  // Title (large, centered, white).
  doc.save();
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20);
  doc.text('Student Enrollment Application Form', x + 20, y + 32, {
    width: w - 40,
    align: 'center',
  });
  doc.restore();

  // Tagline (bottom, italic, soft white).
  doc.save();
  doc.fillColor('#FFFFFF').opacity(0.85).font('Helvetica-Oblique').fontSize(8);
  doc.text('Empower. Educate. Evolve.', x + 20, y + 60, {
    width: w - 40,
    align: 'center',
  });
  doc.opacity(1);
  doc.restore();
}

function drawSectionHeader(doc: PDFKit.PDFDocument, title: string): void {
  const headerHeight = 26;
  // Naji UAT 2026-05-17 — section headers used to overflow the page
  // when the previous section ended near the bottom. Ensure at least
  // one full row + the header itself can render here.
  ensureRoom(doc, headerHeight + 40);
  const x = PAGE_MARGIN;
  const width = doc.page.width - PAGE_MARGIN * 2;
  const y = doc.y;
  doc.save();
  doc.roundedRect(x, y, width, headerHeight, 4).fill(COLOR_ACCENT);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11);
  doc.text(title.toUpperCase(), x + 12, y + 8, { width: width - 24 });
  doc.restore();
  doc.y = y + headerHeight + 8;
}

function drawFieldRows(
  doc: PDFKit.PDFDocument,
  rows: ApplicationPdfFieldRow[],
  options: { rightInsetWidth?: number } = {},
): void {
  // When a photo is rendered to the right (Course Details only) the
  // table width shrinks to `rightInsetWidth` so the photo doesn't
  // overlap. Other sections use the full page width.
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

    // Conditional page break BEFORE drawing the row.
    ensureRoom(doc, rowHeight);

    // Divider above each row (except the first which sits right under
    // the section header).
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
    // with the final page count (`Page X of Y`).
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
    doc.on('error', (err: unknown) => reject(err instanceof Error ? err : new Error(String(err))));
  });

  // ── Page 1 ─────────────────────────────────────────────────────
  drawHeaderBanner(doc);
  doc.y = PAGE_MARGIN + 88; // banner height + small gap

  // COURSE DETAILS — section header full-width, photo box drops in
  // BELOW the header so the table + photo share the same baseline.
  drawSectionHeader(doc, 'Course Details');
  const courseRowsTop = doc.y;
  const photoSize = 110;
  const photoX = doc.page.width - PAGE_MARGIN - photoSize;
  const photoY = courseRowsTop + 4;
  if (photo) {
    try {
      doc.save();
      doc.roundedRect(photoX, photoY, photoSize, photoSize, 6)
        .lineWidth(0.5)
        .strokeColor(COLOR_ROW_DIVIDER)
        .stroke();
      doc.roundedRect(photoX, photoY, photoSize, photoSize, 6).clip();
      doc.image(photo.buffer, photoX, photoY, {
        fit: [photoSize, photoSize],
        align: 'center',
        valign: 'center',
      });
      doc.restore();
    } catch (err) {
      logger?.warn('integration.pdf.photo_embed_failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  // Course rows occupy the left ~2/3 so the photo box doesn't overlap.
  const tableInsetWidth = photoX - PAGE_MARGIN - 20;
  const courseRows: ApplicationPdfFieldRow[] = [
    { label: 'Course:', value: input.courseTitle },
    { label: 'Batch:', value: input.batch },
    { label: 'Enrollment Date:', value: input.enrollmentDate },
    { label: 'Mode of Study:', value: input.modeOfStudy },
    { label: 'Preferred Language:', value: input.preferredLanguage },
  ];
  drawFieldRows(doc, courseRows, { rightInsetWidth: tableInsetWidth });
  // Make sure we sit below the photo bottom before the next section.
  if (doc.y < photoY + photoSize + 12) doc.y = photoY + photoSize + 12;

  drawSectionHeader(doc, 'Personal Information');
  drawFieldRows(doc, input.personal);

  drawSectionHeader(doc, 'Contact Information');
  drawFieldRows(doc, input.contact);

  // Address rows continue inline (they share the Contact section block
  // visually — no separate header). Naji UAT 2026-05-17 — removed the
  // unconditional addPage that was forcing extra blank pages.
  if (input.addresses.length > 0) {
    drawFieldRows(doc, input.addresses);
  }

  if (input.qualification.length > 0) {
    drawSectionHeader(doc, 'Qualification Details');
    drawFieldRows(doc, input.qualification);
  }

  // STUDENT DECLARATION — keep header + at least the first bullet on
  // the same page so it doesn't strand at the bottom.
  drawSectionHeader(doc, 'Student Declaration');
  doc.font('Helvetica').fontSize(10).fillColor(COLOR_TEXT_DARK);
  input.declaration.forEach((line) => {
    const bulletWidth = doc.page.width - PAGE_MARGIN * 2 - 18;
    const lineHeight = doc.heightOfString(line, { width: bulletWidth });
    ensureRoom(doc, lineHeight + 8);
    const startY = doc.y;
    doc.save();
    doc.fillColor(COLOR_ACCENT).font('Helvetica-Bold').fontSize(12);
    doc.text('•', PAGE_MARGIN + 4, startY);
    doc.restore();
    doc.fillColor(COLOR_TEXT_DARK).font('Helvetica').fontSize(10);
    doc.text(line, PAGE_MARGIN + 18, startY, { width: bulletWidth });
    doc.y += 4;
  });

  // APPLICANT SIGNATURE — keep the label + box together.
  ensureRoom(doc, 100);
  doc.y += 12;
  doc.save();
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR_TEXT_DARK);
  doc.text('APPLICANT SIGNATURE:', PAGE_MARGIN, doc.y);
  doc.restore();
  doc.y += 6;
  const sigBoxX = PAGE_MARGIN;
  const sigBoxY = doc.y;
  const sigBoxW = 240;
  const sigBoxH = 70;
  doc.save();
  doc.roundedRect(sigBoxX, sigBoxY, sigBoxW, sigBoxH, 4)
    .strokeColor(COLOR_ROW_DIVIDER)
    .lineWidth(0.5)
    .stroke();
  doc.restore();
  if (signature) {
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
  }
  doc.y = sigBoxY + sigBoxH + 4;
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
