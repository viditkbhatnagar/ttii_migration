import PDFDocument from 'pdfkit';

// Credential Manager — dispatch packing list (spec §5.3): title "TTII - Packing
// list", the batch facts, then one line per document. Same brand and pdfkit
// footer rule as affiliation-certificate-pdf.ts (lineBreak:false + height on
// anything placed near the bottom margin, or pdfkit spawns blank pages).

const COLOR_PRIMARY = '#8F2774';
const COLOR_ACCENT = '#F06543';
const COLOR_TEXT = '#1F2937';
const COLOR_MUTED = '#6B7280';
const MARGIN = 40;
const ROW_HEIGHT = 18;

export interface PackingListInput {
  batchNo: string;
  typeLabel: string;
  centre: string;
  address: string;
  awbNo: string;
  packedBy: string;
  items: ReadonlyArray<{ learner: string; enrolmentNo: string; documentNo: string; securitySerial: string }>;
}

export function renderPackingListPdf(input: PackingListInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const width = doc.page.width - MARGIN * 2;
    doc.roundedRect(MARGIN, MARGIN, width, 56, 8).fill(COLOR_PRIMARY);
    doc.rect(MARGIN + width - 8, MARGIN, 8, 56).fill(COLOR_ACCENT);
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#FFFFFF')
      .text('TTII - Packing list', MARGIN + 16, MARGIN + 12, { width: width - 40, lineBreak: false, height: 24 });
    doc.font('Helvetica').fontSize(11).fillColor('#FFFFFF')
      .text(input.batchNo, MARGIN + 16, MARGIN + 34, { width: width - 40, lineBreak: false, height: 16 });

    let y = MARGIN + 74;
    const fact = (label: string, value: string): void => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR_MUTED).text(label.toUpperCase(), MARGIN, y, { width: 90, lineBreak: false, height: 12 });
      doc.font('Helvetica').fontSize(10).fillColor(COLOR_TEXT);
      const text = value || '-';
      const height = Math.min(doc.heightOfString(text, { width: width - 100 }), 48);
      doc.text(text, MARGIN + 100, y, { width: width - 100, height, ellipsis: true });
      y += Math.max(height, 14) + 4;
    };
    fact('Type', input.typeLabel);
    fact('Centre', input.centre);
    fact('Address', input.address);
    fact('AWB', input.awbNo);
    fact('Packed by', input.packedBy);
    y += 8;

    const header = (): void => {
      doc.rect(MARGIN, y, width, ROW_HEIGHT).fill('#F3E8F0');
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR_PRIMARY);
      doc.text('Learner', MARGIN + 6, y + 5, { width: 150, lineBreak: false, height: 12 });
      doc.text('Enrolment no.', MARGIN + 160, y + 5, { width: 90, lineBreak: false, height: 12 });
      doc.text('Document no.', MARGIN + 255, y + 5, { width: 130, lineBreak: false, height: 12 });
      doc.text('Security serial', MARGIN + 390, y + 5, { width: width - 396, lineBreak: false, height: 12 });
      y += ROW_HEIGHT + 2;
    };
    header();
    for (const item of input.items) {
      if (y > doc.page.height - MARGIN - 40) {
        doc.addPage();
        y = MARGIN;
        header();
      }
      doc.font('Helvetica').fontSize(9).fillColor(COLOR_TEXT);
      doc.text(item.learner, MARGIN + 6, y + 3, { width: 150, lineBreak: false, height: 12, ellipsis: true });
      doc.text(item.enrolmentNo || '-', MARGIN + 160, y + 3, { width: 90, lineBreak: false, height: 12, ellipsis: true });
      doc.text(item.documentNo, MARGIN + 255, y + 3, { width: 130, lineBreak: false, height: 12, ellipsis: true });
      doc.fillColor(item.securitySerial ? COLOR_TEXT : COLOR_MUTED)
        .text(item.securitySerial || 'No security serial', MARGIN + 390, y + 3, { width: width - 396, lineBreak: false, height: 12, ellipsis: true });
      y += ROW_HEIGHT;
    }
    doc.font('Helvetica').fontSize(8).fillColor(COLOR_MUTED)
      .text(`${input.items.length} document${input.items.length === 1 ? '' : 's'}`, MARGIN, y + 10, { width, lineBreak: false, height: 12 });
    doc.end();
  });
}
