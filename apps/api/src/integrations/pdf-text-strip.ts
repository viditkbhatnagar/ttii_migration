/**
 * Removes specific pieces of LIVE text from a PDF page's artwork (Credential Manager, Naji
 * 2026-11-19 templates).
 *
 * Naji's Illustrator certificate keeps some labels that sit IN a line with the learner's value,
 * centred for the empty line: "(Enrollment No.: )", "the examination held in" and the three pill
 * labels "Overall CGPA :", "Grade :", "Performance Level :". A value cannot be slotted into
 * centred artwork text, so the renderer removes those runs here and draws each whole line again,
 * centred, with its value. Everything else on the page (headings, seal, pattern, the pill
 * outlines) is untouched vector artwork.
 *
 * Only text-showing operators (Tj, TJ, ', ") whose decoded text equals a requested phrase
 * (whitespace ignored, consecutive runs joined) are dropped; positioning operators stay, so the
 * rest of the text block does not move. A phrase that is not on the page is simply not found,
 * which is the case for artwork exported without those labels.
 */

import { PDFArray, PDFDict, PDFName, PDFRawStream, PDFRef, PDFStream, decodePDFRawStream, type PDFDocument, type PDFObject } from 'pdf-lib';

interface FontCMap { bytes: 1 | 2; map: Map<number, string> }

interface ShowOp { start: number; end: number; text: string; replacement: string }

const WS = new Set([0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20]);
const DELIM = new Set([0x28, 0x29, 0x3c, 0x3e, 0x5b, 0x5d, 0x7b, 0x7d, 0x2f, 0x25]);
const squash = (s: string): string => s.replace(/\s+/g, '');

function utf16Hex(hex: string): string {
  let out = '';
  for (let i = 0; i + 4 <= hex.length; i += 4) out += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
  return out;
}

/** bfchar / bfrange of a ToUnicode CMap. */
export function parseToUnicode(cmap: string): FontCMap {
  const map = new Map<number, string>();
  let bytes: 1 | 2 = 1;
  const space = /begincodespacerange\s*<([0-9a-fA-F]+)>/.exec(cmap);
  if (space?.[1] && space[1].length >= 4) bytes = 2;
  for (const block of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const m of (block[1] ?? '').matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)) map.set(parseInt(m[1] ?? '0', 16), utf16Hex(m[2] ?? ''));
  }
  for (const block of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const m of (block[1] ?? '').matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<[0-9a-fA-F]*>|\[[^\]]*\])/g)) {
      const lo = parseInt(m[1] ?? '0', 16);
      const hi = parseInt(m[2] ?? '0', 16);
      const dst = m[3] ?? '';
      if (dst.startsWith('[')) {
        const items = [...dst.matchAll(/<([0-9a-fA-F]*)>/g)].map((x) => utf16Hex(x[1] ?? ''));
        items.forEach((u, i) => { if (lo + i <= hi) map.set(lo + i, u); });
      } else {
        const base = dst.slice(1, -1);
        const first = parseInt(base.slice(-4) || '0', 16);
        const prefix = utf16Hex(base.slice(0, -4));
        for (let c = lo; c <= hi && c - lo < 65536; c += 1) map.set(c, prefix + String.fromCharCode(first + (c - lo)));
      }
    }
  }
  return { bytes, map };
}

function streamBytes(doc: PDFDocument, obj: PDFObject | undefined): Uint8Array | null {
  const resolved = obj instanceof PDFRef ? doc.context.lookup(obj) : obj;
  if (resolved instanceof PDFRawStream) return decodePDFRawStream(resolved).decode();
  if (resolved instanceof PDFStream) return resolved.getContents();
  return null;
}

const latin1 = (bytes: Uint8Array): string => Buffer.from(bytes).toString('latin1');

/** Glyph names Illustrator writes in /Differences that are not a single letter or digit. */
const GLYPH_NAMES: Record<string, string> = {
  space: ' ', parenleft: '(', parenright: ')', colon: ':', semicolon: ';', period: '.', comma: ',',
  quotesingle: "'", quoteright: '’', quoteleft: '‘', quotedbl: '"', quotedblleft: '“', quotedblright: '”',
  hyphen: '-', endash: '–', emdash: '—', bullet: '•', slash: '/', ampersand: '&', plus: '+',
  fi: 'fi', fl: 'fl', ff: 'ff', ffi: 'ffi', ffl: 'ffl', at: '@', numbersign: '#', percent: '%', question: '?', exclam: '!',
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9',
};

export function glyphToText(name: string): string {
  if (/^[A-Za-z]$/.test(name)) return name;
  const uni = /^uni([0-9A-Fa-f]{4})$/.exec(name);
  if (uni?.[1]) return String.fromCharCode(parseInt(uni[1], 16));
  return GLYPH_NAMES[name] ?? '';
}

/** A simple font without ToUnicode: WinAnsi (≈ latin1) for the base, /Differences glyph names on top. */
function encodingCMap(doc: PDFDocument, font: PDFDict): FontCMap {
  const map = new Map<number, string>();
  for (let c = 32; c < 256; c += 1) map.set(c, String.fromCharCode(c));
  const raw = font.get(PDFName.of('Encoding'));
  const enc = raw instanceof PDFRef ? doc.context.lookup(raw) : raw;
  const diffs = enc instanceof PDFDict ? enc.lookupMaybe(PDFName.of('Differences'), PDFArray) : undefined;
  let code = 0;
  for (const item of diffs?.asArray() ?? []) {
    const s = item.toString();
    if (/^\d+$/.test(s)) { code = Number(s); continue; }
    if (s.startsWith('/')) { map.set(code, glyphToText(s.slice(1))); code += 1; }
  }
  return { bytes: 1, map };
}

function fontCMaps(doc: PDFDocument, resources: PDFDict | undefined): Map<string, FontCMap> {
  const out = new Map<string, FontCMap>();
  const fonts = resources?.lookupMaybe(PDFName.of('Font'), PDFDict);
  if (!fonts) return out;
  for (const [name, ref] of fonts.entries()) {
    const font = doc.context.lookup(ref);
    if (!(font instanceof PDFDict)) continue;
    const bytes = streamBytes(doc, font.get(PDFName.of('ToUnicode')));
    const key = name.asString().replace(/^\//, '');
    if (bytes) out.set(key, parseToUnicode(latin1(bytes)));
    else if (font.get(PDFName.of('Subtype'))?.toString() !== '/Type0') out.set(key, encodingCMap(doc, font));
  }
  return out;
}

/** Bytes of a literal string body (without the outer parentheses). */
function literalBytes(src: Uint8Array, from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i < to; i += 1) {
    const c = src[i] as number;
    if (c !== 0x5c) { out.push(c); continue; }
    i += 1;
    const n = src[i] as number;
    if (n >= 0x30 && n <= 0x37) {
      let v = n - 0x30; let k = 1;
      while (k < 3 && (src[i + 1] as number) >= 0x30 && (src[i + 1] as number) <= 0x37) { i += 1; v = v * 8 + ((src[i] as number) - 0x30); k += 1; }
      out.push(v & 0xff);
    } else if (n === 0x6e) out.push(0x0a);
    else if (n === 0x72) out.push(0x0d);
    else if (n === 0x74) out.push(0x09);
    else if (n === 0x62) out.push(0x08);
    else if (n === 0x66) out.push(0x0c);
    else if (n === 0x0d) { if (src[i + 1] === 0x0a) i += 1; } // line continuation
    else if (n === 0x0a) { /* line continuation */ }
    else out.push(n);
  }
  return out;
}

function decodeCodes(codes: number[], cmap: FontCMap | undefined): string {
  if (!cmap) return '';
  let out = '';
  for (let i = 0; i < codes.length; i += cmap.bytes) {
    const code = cmap.bytes === 2 ? ((codes[i] ?? 0) << 8) | (codes[i + 1] ?? 0) : (codes[i] ?? 0);
    out += cmap.map.get(code) ?? '';
  }
  return out;
}

/**
 * Tokenises a content stream just far enough to find the text-showing operators, their operand
 * byte ranges and the text they draw.
 */
export function findShowOps(src: Uint8Array, cmaps: Map<string, FontCMap>): ShowOp[] {
  const ops: ShowOp[] = [];
  let font = '';
  let operandStart = 0;
  let operands: Array<{ kind: 'str'; codes: number[] } | { kind: 'name'; value: string } | { kind: 'other' }> = [];
  let arrayDepth = 0;
  let i = 0;
  const n = src.length;
  const skipWs = (): void => { while (i < n && WS.has(src[i] as number)) i += 1; };
  while (i < n) {
    skipWs();
    if (i >= n) break;
    if (operands.length === 0 && arrayDepth === 0) operandStart = i;
    const c = src[i] as number;
    if (c === 0x25) { while (i < n && src[i] !== 0x0a && src[i] !== 0x0d) i += 1; continue; } // comment
    if (c === 0x28) { // ( literal )
      let depth = 1; const from = i + 1; i += 1;
      while (i < n && depth > 0) {
        if (src[i] === 0x5c) { i += 2; continue; }
        if (src[i] === 0x28) depth += 1; else if (src[i] === 0x29) depth -= 1;
        i += 1;
      }
      operands.push({ kind: 'str', codes: literalBytes(src, from, i - 1) });
      continue;
    }
    if (c === 0x3c && src[i + 1] === 0x3c) { // << dict >> (inline, e.g. BDC properties)
      let depth = 0;
      while (i < n) {
        if (src[i] === 0x3c && src[i + 1] === 0x3c) { depth += 1; i += 2; continue; }
        if (src[i] === 0x3e && src[i + 1] === 0x3e) { depth -= 1; i += 2; if (depth === 0) break; continue; }
        i += 1;
      }
      operands.push({ kind: 'other' });
      continue;
    }
    if (c === 0x3c) { // <hex>
      const from = i + 1; while (i < n && src[i] !== 0x3e) i += 1;
      const hex = latin1(src.subarray(from, i)).replace(/\s+/g, '');
      i += 1;
      const codes: number[] = [];
      for (let k = 0; k < hex.length; k += 2) codes.push(parseInt(hex.slice(k, k + 2).padEnd(2, '0'), 16));
      operands.push({ kind: 'str', codes });
      continue;
    }
    if (c === 0x5b) { arrayDepth += 1; i += 1; continue; }
    if (c === 0x5d) { arrayDepth = Math.max(0, arrayDepth - 1); i += 1; continue; }
    if (c === 0x2f) { // /Name
      const from = i + 1; i += 1;
      while (i < n && !WS.has(src[i] as number) && !DELIM.has(src[i] as number)) i += 1;
      operands.push({ kind: 'name', value: latin1(src.subarray(from, i)) });
      continue;
    }
    // number or operator
    const from = i;
    while (i < n && !WS.has(src[i] as number) && !DELIM.has(src[i] as number)) i += 1;
    if (i === from) { i += 1; continue; }
    const word = latin1(src.subarray(from, i));
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word)) { operands.push({ kind: 'other' }); continue; }
    if (arrayDepth > 0) { operands.push({ kind: 'other' }); continue; }
    if (word === 'BI') { // inline image: skip to EI
      const ei = latin1(src.subarray(i)).search(/\sEI(\s|$)/);
      i = ei < 0 ? n : i + ei + 3;
      operands = [];
      continue;
    }
    if (word === 'Tf') {
      const name = operands.find((o): o is { kind: 'name'; value: string } => o.kind === 'name');
      if (name) font = name.value;
    } else if (word === 'Tj' || word === 'TJ' || word === "'" || word === '"') {
      const codes = operands.flatMap((o) => (o.kind === 'str' ? o.codes : []));
      ops.push({
        start: operandStart, end: i,
        text: decodeCodes(codes, cmaps.get(font)),
        // ' and " also move to the next line: keep that move when the text goes.
        replacement: word === 'Tj' || word === 'TJ' ? '' : 'T*',
      });
    }
    operands = [];
  }
  return ops;
}

/** Runs i..j (at most `span` consecutive) whose joined text equals one of the phrases. */
export function matchRuns(ops: ShowOp[], phrases: readonly string[], span = 6): ShowOp[] {
  const wanted = new Set(phrases.map(squash).filter(Boolean));
  const hit = new Set<ShowOp>();
  for (let i = 0; i < ops.length; i += 1) {
    // A run that decodes to nothing (spaces, an unmapped glyph, an icon) never starts a match,
    // so it is not removed along with the label that follows it.
    if (squash(ops[i]?.text ?? '') === '') continue;
    let joined = '';
    for (let j = i; j < Math.min(ops.length, i + span); j += 1) {
      joined += squash(ops[j]?.text ?? '');
      if (wanted.has(joined)) { for (let k = i; k <= j; k += 1) hit.add(ops[k] as ShowOp); break; }
      if (joined.length > 80) break;
    }
  }
  return ops.filter((o) => hit.has(o));
}

/** Removes the phrases from page `pageIndex`; returns how many text runs were removed. */
export function stripPageText(doc: PDFDocument, pageIndex: number, phrases: readonly string[]): number {
  const page = doc.getPage(pageIndex);
  const contents = page.node.get(PDFName.of('Contents'));
  const resolved = contents instanceof PDFRef ? doc.context.lookup(contents) : contents;
  const parts = resolved instanceof PDFArray ? resolved.asArray() : [contents];
  const chunks = parts.map((p) => streamBytes(doc, p)).filter((b): b is Uint8Array => b !== null);
  if (chunks.length === 0) return 0;
  const src = Buffer.concat(chunks.flatMap((b) => [Buffer.from(b), Buffer.from('\n')]));
  const resources = page.node.Resources();
  const remove = matchRuns(findShowOps(src, fontCMaps(doc, resources)), phrases);
  if (remove.length === 0) return 0;
  const out: Buffer[] = [];
  let at = 0;
  for (const op of [...remove].sort((a, b) => a.start - b.start)) {
    out.push(src.subarray(at, op.start), Buffer.from(` ${op.replacement} `));
    at = op.end;
  }
  out.push(src.subarray(at));
  const stream = doc.context.flateStream(Buffer.concat(out));
  page.node.set(PDFName.of('Contents'), doc.context.register(stream));
  return remove.length;
}
