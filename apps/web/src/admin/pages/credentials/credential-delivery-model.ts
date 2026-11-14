// Credential Manager (delivery / scans / dashboard / reports): the shapes the
// API returns plus the display helpers every one of those pages shares.

export type ItemStatus =
  | 'print_queued' | 'printed' | 'packed' | 'dispatched' | 'in_transit' | 'delivered'
  | 'collected' | 'handed_over' | 'returned' | 'address_issue' | 'lost';
export type BatchType = 'to_centre' | 'to_learner' | 'office_collection';

export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  print_queued: 'Print queued', printed: 'Printed', packed: 'Packed', dispatched: 'Dispatched', in_transit: 'In transit',
  delivered: 'Delivered', collected: 'Collected', handed_over: 'Handed over', returned: 'Returned', address_issue: 'Address issue', lost: 'Lost',
};
export const BATCH_TYPE_LABEL: Record<BatchType, string> = { to_centre: 'To centre', to_learner: 'To learner', office_collection: 'Office collection' };
export const DOC_TYPE_LABEL: Record<string, string> = {
  certificate: 'Certificate', marksheet: 'Marksheet', provisional: 'Provisional Certificate', transcript: 'Consolidated Transcript',
};

export const ITEM_TABS = {
  print: ['print_queued', 'printed'],
  transit: ['packed', 'dispatched', 'in_transit', 'address_issue'],
  delivered: ['delivered', 'collected', 'handed_over'],
  returned: ['returned', 'lost'],
} as const satisfies Record<string, readonly ItemStatus[]>;
export type ItemTab = keyof typeof ITEM_TABS;

export interface DeliveryItem {
  id: number; documentId: number; userId: number; documentNo: string; docType: string; learner: string; enrolmentNo: string;
  course: string; centreId: number | null; centre: string; batchId: number | null; batchNo: string; batchType: BatchType | null;
  awbNo: string; dispatchedAt: string | null; securitySerial: string; receiver: string; deliveredAt: string | null; remarks: string;
  hasProof: boolean; status: ItemStatus; documentStatus: string; overdue: boolean; daysLate: number; trackingUrl: string;
  nextStatuses: ItemStatus[]; learnerAddress: string;
}
export interface DeliveryBatch {
  id: number; batchNo: string; type: BatchType; typeLabel: string; centreId: number | null; centre: string; address: string;
  courierId: number | null; courier: string; awbNo: string; packedBy: string; dispatchedAt: string | null; status: string;
  createdAt: string; receivedBy: string; acknowledgedAt: string | null; hasPackingList: boolean; itemCount: number; trackingUrl: string;
}
export interface DeliveryOverview {
  ready: boolean; message: string; items: DeliveryItem[]; batches: DeliveryBatch[];
  couriers: Array<{ id: number; name: string; active: boolean }>;
  centres: Array<{ id: number; name: string; address: string }>;
  settings: { overdueDays: number; readyDays: number };
}
export interface BatchDetail { batch: DeliveryBatch; items: DeliveryItem[]; history: Array<{ at: string; user: string; action: string; before: string; after: string; reason: string }> }

export interface ScanRow {
  id: number; at: string; verificationId: string; documentId: number | null; learner: string; docType: string; documentNo: string;
  course: string; city: string; country: string; device: string; method: string; status: string;
}
export interface AlertRow {
  id: number; type: string; details: string; createdAt: string; documentId: number | null; documentNo: string;
  reviewedBy: string; reviewedAt: string | null; note: string; reviewStatus: 'open' | 'reviewed';
}
export interface ScansOverview {
  ready: boolean; message: string; scans: ScanRow[]; alerts: AlertRow[]; counts: { all: number; openAlerts: number; notFound: number };
}

export interface NoticeRow { id: number; title: string; body: string; audience: string; link: string; read: boolean; at: string; emailStatus: string }
export interface NoticeFeed { rows: NoticeRow[]; unread: number }

export interface KpiTable { columns: Array<{ key: string; label: string }>; rows: Array<Record<string, string | number>> }
export interface DashboardKpi {
  key: 'ready' | 'issued' | 'awaiting' | 'dispatched' | 'alerts'; title: string; value: number | null; trendPct: number; trendGood: boolean;
  overdue?: number; tone: 'neutral' | 'danger'; table: KpiTable;
}
export interface DashboardData {
  ready: boolean; message: string; kpis: DashboardKpi[]; readyConnected: boolean;
  issuedByMonth: Array<{ month: string; count: number }>; issuanceByCourse: Array<{ course: string; count: number }>;
  deliveryStatus: Array<{ label: string; count: number }>;
  needsAttention: Array<{ enrolmentNo: string; learner: string; course: string; centre: string; daysWaiting: number; late: boolean }>;
  recentActivity: Array<{ learner: string; action: string; user: string; at: string }>;
  overdueParcels: Array<{ batchNo: string; daysLate: number; learner: string; courier: string }>;
  openAlerts: Array<{ id: number; type: string; details: string; createdAt: string }>;
  settings: { overdueDays: number; readyDays: number };
}

export interface ReportData {
  ready: boolean; message: string; key: string; title: string; columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string | number>>; hasDate: boolean; chart: { group: string; points: Array<{ label: string; value: number }> } | null; note: string;
}

export interface CentreCertificatesData {
  ready: boolean; message: string; centre: string;
  documents: Array<{
    id: number; documentNo: string; docType: string; learner: string; enrolmentNo: string; course: string; issueDate: string;
    status: string; physicalStatus: string; canDownload: boolean;
  }>;
  parcels: DeliveryBatch[];
  handovers: Array<{
    id: number; learner: string; documentNo: string; course: string; batchNo: string; status: ItemStatus; receiver: string;
    deliveredAt: string | null; hasProof: boolean; canHandOver: boolean;
  }>;
  notices: NoticeRow[];
}

export interface CredResult<T = Record<string, unknown>> { ok: boolean; message: string; data: T }

// ── Display helpers ─────────────────────────────────────────────────────────

const IST_OFFSET_MS = 330 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** DD-MM-YYYY of a YYYY-MM-DD (or longer ISO) value, read from its digits; '' when none. */
export function dmyDash(value: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

/** DD-MM-YYYY, h:mm AM of a stored instant, as India time. */
export function dmyDashTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  const d = new Date(ms + IST_OFFSET_MS);
  const h = d.getUTCHours();
  const date = `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;
  return `${date}, ${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** An ISO date or instant for a table cell: date-only stays a date, an instant shows IST time. */
export function dmyAny(value: string | null | undefined): string {
  if (!value) return '';
  return value.length > 10 ? dmyDashTime(value) : dmyDash(value);
}

/** "2026-07" -> "Jul 2026". */
export function monthName(key: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  return m ? `${MONTHS[Number(m[2]) - 1] ?? ''} ${m[1]}` : key;
}

export function docTypeLabel(type: string): string {
  return DOC_TYPE_LABEL[type] ?? type;
}

export type PillTone = 'primary' | 'emerald' | 'rose' | 'amber' | 'blue' | 'slate';

export function itemStatusTone(status: ItemStatus): PillTone {
  switch (status) {
    case 'delivered': case 'collected': case 'handed_over': return 'emerald';
    case 'returned': case 'lost': case 'address_issue': return 'rose';
    case 'dispatched': case 'in_transit': return 'blue';
    case 'packed': case 'printed': return 'amber';
    default: return 'slate';
  }
}

export function scanStatusTone(status: string): PillTone {
  if (status === 'valid') return 'emerald';
  if (status === 'not_found') return 'slate';
  return 'rose';
}

export const SCAN_STATUS_LABEL: Record<string, string> = { valid: 'Valid', revoked: 'Revoked', superseded: 'Superseded', not_found: 'Not found' };
export const ALERT_TYPE_LABEL: Record<string, string> = {
  revoked_scan: 'Revoked scan', superseded_scan: 'Superseded scan', multiple_countries: 'Multiple countries', not_found_attempts: 'Not-found attempts',
};

/** Whole-number trend text: "+12%" / "-20%" / "0%". */
export function trendText(pct: number): string {
  return `${pct > 0 ? '+' : ''}${pct}%`;
}
