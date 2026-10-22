import { istDayOf, matchesQuery } from '../kit/format.js';

// Centre portal → Resources view model (Naji's centre login design,
// 2026-10-22). Real data: the centre's own folders and files from
// GET /centre/resources/index. The design's "type" chips (Brochure, Flyer …)
// become the centre's top-level folders — the category is the folder TTII filed
// the file under; the design's per-course tag has no column and is not shown.

export interface ResourceFolder { id: string; name: string }
export interface ResourceFile {
  id: string;
  name: string;
  /** Upper-case format, from the stored type or the file name ("PDF"). */
  format: string;
  sizeBytes: number;
  /** http(s) link the browser may follow; '' when the stored path is not one. */
  href: string;
  /** IST day the file was added (YYYY-MM-DD). */
  addedYmd: string;
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

/** "2.4 MB" / "318 KB" / "—" when the size is unknown. */
export function fileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** The extension of a file name or path, upper-cased, without query string ("a/b.pdf?x=1" → "PDF"). */
export function formatOf(nameOrPath: string): string {
  const clean = nameOrPath.split(/[?#]/)[0] ?? '';
  const m = /\.([A-Za-z0-9]{1,5})$/.exec(clean);
  return m ? (m[1] ?? '').toUpperCase() : '';
}

/** Links the browser may follow: http(s), or a site-relative path. */
export function safeResourceHref(value: unknown): string {
  const url = str(value);
  return /^https?:\/\//i.test(url) || /^\/[^/]/.test(url) ? url : '';
}

export type FileKind = 'image' | 'archive' | 'document';
export function kindOf(format: string): FileKind {
  if (['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'SVG'].includes(format)) return 'image';
  if (['ZIP', 'RAR', '7Z'].includes(format)) return 'archive';
  return 'document';
}

export interface ResourceListing {
  folderName: string;
  folders: ResourceFolder[];
  files: ResourceFile[];
}

export function toResourceListing(data: Record<string, unknown>): ResourceListing {
  const folders = (Array.isArray(data.folders) ? data.folders : []).map(rec).map((f) => ({ id: str(f.id), name: str(f.name) })).filter((f) => f.id && f.name);
  const files = (Array.isArray(data.files) ? data.files : []).map(rec).map((f) => {
    const name = str(f.name);
    const stored = str(f.type).replace(/^\./, '').toUpperCase();
    return {
      id: str(f.id),
      name,
      format: (/^[A-Z0-9]{1,5}$/.test(stored) ? stored : '') || formatOf(name) || formatOf(str(f.path)),
      sizeBytes: Number(f.size) > 0 ? Number(f.size) : 0,
      href: safeResourceHref(f.path),
      addedYmd: istDayOf(str(f.created_at)),
    };
  }).filter((f) => f.id);
  return { folderName: str(rec(data.current_folder).name), folders, files };
}

export function filterFiles(files: ResourceFile[], query: string): ResourceFile[] {
  return files.filter((f) => matchesQuery(query, [f.name, f.format]));
}

export function filterFolders(folders: ResourceFolder[], query: string): ResourceFolder[] {
  return folders.filter((f) => matchesQuery(query, [f.name]));
}

/** A file name for the file row: the typed name, else the last part of the path. */
export function displayName(name: string, fallbackPath: string): string {
  return name || decodeURIComponent((fallbackPath.split(/[?#]/)[0] ?? '').split('/').pop() ?? '') || 'File';
}
