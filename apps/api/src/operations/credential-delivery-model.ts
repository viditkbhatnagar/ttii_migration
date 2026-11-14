import type { ItemStatus } from './credential-types.js';

// Credential Manager — Delivery rules (spec §5). Pure functions only: the
// service owns the database, this file owns the rules so they can be tested
// without one.

export const BATCH_TYPES = ['to_centre', 'to_learner', 'office_collection'] as const;
export type BatchType = typeof BATCH_TYPES[number];
export const BATCH_TYPE_LABEL: Record<BatchType, string> = {
  to_centre: 'To centre',
  to_learner: 'To learner',
  office_collection: 'Office collection',
};
export type BatchStatus = 'packed' | 'dispatched' | 'in_progress' | 'delivered';

export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  print_queued: 'Print queued',
  printed: 'Printed',
  packed: 'Packed',
  dispatched: 'Dispatched',
  in_transit: 'In transit',
  delivered: 'Delivered',
  collected: 'Collected',
  handed_over: 'Handed over',
  returned: 'Returned',
  address_issue: 'Address issue',
  lost: 'Lost',
};

export const DELIVERED_STATUSES: readonly ItemStatus[] = ['delivered', 'collected', 'handed_over'];
/** Nothing more happens to a parcel in these states (an overdue flag never applies). */
export const FINISHED_STATUSES: readonly ItemStatus[] = ['delivered', 'collected', 'handed_over', 'returned', 'lost'];
export const AWAITING_PRINT_STATUSES: readonly ItemStatus[] = ['print_queued', 'printed', 'packed'];
export const IN_TRANSIT_STATUSES: readonly ItemStatus[] = ['dispatched', 'in_transit'];

/** The tabs of the Delivery Tracking items table (spec §1.4). */
export const ITEM_TABS = {
  print: ['print_queued', 'printed'],
  transit: ['packed', 'dispatched', 'in_transit', 'address_issue'],
  delivered: ['delivered', 'collected', 'handed_over'],
  returned: ['returned', 'lost'],
} as const satisfies Record<string, readonly ItemStatus[]>;
export type ItemTab = keyof typeof ITEM_TABS;

export const DEFAULT_OVERDUE_DAYS = 10;
export const DEFAULT_READY_DAYS = 3;
const DAY_MS = 86_400_000;

/** The transition table of spec §5.4, before the batch-type filters. */
export const TRANSITIONS: Record<ItemStatus, readonly ItemStatus[]> = {
  print_queued: [],
  printed: [],
  packed: [],
  dispatched: ['in_transit', 'delivered', 'collected', 'returned', 'address_issue', 'lost'],
  in_transit: ['delivered', 'returned', 'address_issue', 'lost'],
  delivered: ['handed_over'],
  collected: [],
  handed_over: [],
  returned: ['in_transit', 'lost'],
  address_issue: ['in_transit', 'returned', 'lost'],
  lost: [],
};

/** What "Update delivery" may offer for an item, given the type of its batch. */
export function nextStatuses(status: ItemStatus, batchType: BatchType | null): ItemStatus[] {
  if (!batchType) return [];
  return TRANSITIONS[status].filter((next) => {
    if (next === 'collected') return batchType === 'office_collection';
    if (next === 'handed_over') return batchType === 'to_centre';
    if (batchType === 'office_collection') return next !== 'in_transit' && next !== 'delivered';
    return true;
  });
}

export function needsReceiverAndProof(next: ItemStatus): boolean {
  return next === 'collected' || next === 'handed_over';
}

export function needsRemarks(next: ItemStatus): boolean {
  return next === 'returned' || next === 'address_issue' || next === 'lost';
}

export interface ItemUpdateInput {
  from: ItemStatus;
  to: ItemStatus;
  batchType: BatchType | null;
  receiverName: string;
  proofKey: string | null;
  remarks: string;
}

/** An error message for an invalid delivery update, or null. */
export function validateItemUpdate(input: ItemUpdateInput): string | null {
  if (!nextStatuses(input.from, input.batchType).includes(input.to)) {
    return `A ${ITEM_STATUS_LABEL[input.from].toLowerCase()} copy cannot move to ${ITEM_STATUS_LABEL[input.to].toLowerCase()}.`;
  }
  if (needsReceiverAndProof(input.to)) {
    if (!input.receiverName.trim()) return 'Receiver name is required.';
    if (!input.proofKey) return 'Upload an ID photo or signed acknowledgement.';
  }
  if (needsRemarks(input.to) && !input.remarks.trim()) return 'Add the remarks or exception reason.';
  return null;
}

/** Overdue = dispatched, not finished, and MORE than `overdueDays` days ago (10 days exactly is not overdue). */
export function isOverdue(
  dispatchedAt: Date | null | undefined,
  status: ItemStatus,
  now: Date,
  overdueDays: number,
): boolean {
  if (!dispatchedAt || FINISHED_STATUSES.includes(status)) return false;
  return now.getTime() - dispatchedAt.getTime() > overdueDays * DAY_MS;
}

/** Whole days past the overdue limit (0 while within it). */
export function daysLate(dispatchedAt: Date, now: Date, overdueDays: number): number {
  const days = Math.floor((now.getTime() - dispatchedAt.getTime()) / DAY_MS);
  return Math.max(0, days - overdueDays);
}

/**
 * The courier's tracking link: https only, the pattern must contain {AWB} (any
 * case) and carry no credentials. The AWB is URI-encoded. Anything else: no link.
 */
export function trackingLink(pattern: string | null | undefined, awb: string | null | undefined): string | undefined {
  if (!pattern || !awb || !/\{awb\}/i.test(pattern)) return undefined;
  try {
    const url = new URL(pattern.replace(/\{awb\}/gi, encodeURIComponent(awb.trim())));
    if (url.protocol !== 'https:' || url.username || url.password) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

/** Day-count settings are whole numbers 1-365. */
export function validDayCount(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 365;
}

export interface BatchItemFacts {
  id: number;
  status: ItemStatus;
  batchId: number | null;
  documentValid: boolean;
  centreId: number | null;
  userId: number;
}

export interface BatchCreateInput {
  type: string;
  centreId: number | null;
  address: string;
  awbNo: string;
  courierActive: boolean;
}

export function isBatchType(value: string): value is BatchType {
  return (BATCH_TYPES as readonly string[]).includes(value);
}

/** Dispatch batch rules (spec §5.3). Returns an error message or null. */
export function validateBatchCreate(items: readonly BatchItemFacts[], input: BatchCreateInput): string | null {
  if (items.length === 0) return 'Select at least one printed document.';
  if (items.some((i) => i.status !== 'printed' || i.batchId !== null)) {
    return 'Only Printed documents that are not in a batch can be packed.';
  }
  if (items.some((i) => !i.documentValid)) return 'Only valid documents can be dispatched.';
  if (!isBatchType(input.type)) return 'Choose the dispatch type.';
  if (input.type === 'to_centre') {
    if (!input.centreId) return 'Select the centre.';
    if (items.some((i) => i.centreId !== input.centreId)) return 'Every document must belong to the selected centre.';
  }
  if (input.type === 'to_learner' && new Set(items.map((i) => i.userId)).size > 1) {
    return 'A To learner batch can only hold one learner\'s documents.';
  }
  if (input.type !== 'office_collection') {
    if (!input.address.trim() || !input.awbNo.trim() || !input.courierActive) {
      return 'Address, active courier and AWB are required.';
    }
  }
  return null;
}

export interface DispatchFacts {
  status: BatchStatus;
  hasPackingList: boolean;
  items: ReadonlyArray<{ status: ItemStatus; documentValid: boolean }>;
}

/** Mark Dispatched rules (spec §5.3). */
export function validateDispatch(batch: DispatchFacts): string | null {
  if (batch.status !== 'packed') return 'Only a packed batch can be dispatched.';
  if (!batch.hasPackingList) return 'Generate the packing list before dispatching.';
  if (batch.items.length === 0 || batch.items.some((i) => i.status !== 'packed')) {
    return 'Every document in the batch must still be packed.';
  }
  if (batch.items.some((i) => !i.documentValid)) return 'A document in this batch is no longer valid.';
  return null;
}

/** Batch status after an item update: delivered when every item is delivered, else in progress. */
export function batchStatusAfterUpdate(itemStatuses: readonly ItemStatus[]): BatchStatus {
  return itemStatuses.length > 0 && itemStatuses.every((s) => DELIVERED_STATUSES.includes(s)) ? 'delivered' : 'in_progress';
}

export interface AcknowledgeFacts {
  batchType: string;
  batchCentreId: number | null;
  callerCentreId: number | null;
  acknowledgedAt: Date | null;
  dispatchedAt: Date | null;
  receiverName: string;
  itemStatuses: readonly ItemStatus[];
}

/** Centre parcel acknowledgement (spec §5.3). */
export function validateAcknowledge(f: AcknowledgeFacts): string | null {
  if (f.batchType !== 'to_centre') return 'Only parcels sent to a centre can be acknowledged.';
  if (!f.callerCentreId || f.batchCentreId !== f.callerCentreId) return 'This parcel does not belong to your centre.';
  if (!f.receiverName.trim()) return 'Receiver name is required.';
  if (f.acknowledgedAt) return 'This parcel was already acknowledged.';
  if (!f.dispatchedAt) return 'This parcel has not been dispatched yet.';
  const receivable: ItemStatus[] = ['dispatched', 'in_transit', 'delivered'];
  if (!f.itemStatuses.some((s) => receivable.includes(s))) return 'No document in this parcel can be received.';
  return null;
}

export function formatBatchNo(sequence: number): string {
  return `TTII/DISPATCH/${String(sequence).padStart(4, '0')}`;
}

/** The sequence in a batch number, or 0. */
export function batchSequence(batchNo: string | null | undefined): number {
  const match = /^TTII\/DISPATCH\/(\d+)$/.exec(batchNo ?? '');
  return match ? Number(match[1]) : 0;
}

export function isItemStatus(value: string): value is ItemStatus {
  return Object.prototype.hasOwnProperty.call(ITEM_STATUS_LABEL, value);
}

/** A proof/packing key must live under the credentials folder and never climb out of it. */
export function isCredentialStorageKey(key: string, folder: string): boolean {
  return key.startsWith(`credentials/${folder}/`) && !key.includes('..') && key.length <= 500;
}

// ── Dashboard helpers (spec §1.1) ────────────────────────────────────────────

/** Month-on-month change in whole percent: 0/0 is 0, growth from zero is 100. */
export function trendPercent(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

/** A trend is good when flat, or when its direction matches `goodUp`. */
export function isGoodTrend(pct: number, goodUp: boolean): boolean {
  return pct === 0 || (pct > 0) === goodUp;
}

/** "Ready" items waiting longer than the reminder setting are flagged. */
export function isReadyLate(daysWaiting: number, reminderDays: number): boolean {
  return daysWaiting > reminderDays;
}

const IST_OFFSET_MS = 330 * 60 * 1000;

/** YYYY-MM of an instant in IST, shifted by whole months. */
export function istMonthKey(now: Date, offsetMonths = 0): string {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() + offsetMonths, 1)).toISOString().slice(0, 7);
}

/** YYYY-MM of an instant, in IST. */
export function istMonthOf(instant: Date): string {
  return new Date(instant.getTime() + IST_OFFSET_MS).toISOString().slice(0, 7);
}

/** YYYY-MM of a date-only value (a @db.Date arrives as UTC midnight). */
export function monthOfDateOnly(date: Date): string {
  return date.toISOString().slice(0, 7);
}

/** The last `count` month keys, oldest first. */
export function lastMonthKeys(now: Date, count = 12): string[] {
  return Array.from({ length: count }, (_, i) => istMonthKey(now, i - (count - 1)));
}

/** IST calendar day (YYYY-MM-DD) of an instant. */
export function istDayOf(instant: Date): string {
  return new Date(instant.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}
