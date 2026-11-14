import type { Prisma, PrismaClient } from '@prisma/client';

import {
  BATCH_TYPE_LABEL, isBatchType, isItemStatus, isOverdue, daysLate, nextStatuses, trackingLink,
  type BatchType,
} from './credential-delivery-model.js';
import {
  DEFAULT_DELIVERY_SETTINGS, parseConfigData,
  type CourierData, type DeliverySettingsData, type ItemStatus,
} from './credential-types.js';

// Credential Manager — Delivery reads: settings, couriers, and the item / batch
// rows of the Delivery Tracking page. All of it is scoped to documents whose
// offering has "Credential issued by TTII = Yes" (spec §0 item 3).

export type Db = PrismaClient | Prisma.TransactionClient;

export interface CourierOption { id: number; name: string; active: boolean; trackingUrlPattern: string }

export interface DeliveryItemRow {
  id: number;
  documentId: number;
  userId: number;
  documentNo: string;
  docType: string;
  learner: string;
  enrolmentNo: string;
  course: string;
  centreId: number | null;
  centre: string;
  batchId: number | null;
  batchNo: string;
  batchType: BatchType | null;
  awbNo: string;
  dispatchedAt: string | null;
  securitySerial: string;
  receiver: string;
  deliveredAt: string | null;
  remarks: string;
  hasProof: boolean;
  status: ItemStatus;
  documentStatus: string;
  overdue: boolean;
  daysLate: number;
  trackingUrl: string;
  nextStatuses: ItemStatus[];
  learnerAddress: string;
}

export interface DeliveryBatchRow {
  id: number;
  batchNo: string;
  type: BatchType;
  typeLabel: string;
  centreId: number | null;
  centre: string;
  address: string;
  courierId: number | null;
  courier: string;
  awbNo: string;
  packedBy: string;
  dispatchedAt: string | null;
  status: string;
  createdAt: string;
  receivedBy: string;
  acknowledgedAt: string | null;
  hasPackingList: boolean;
  itemCount: number;
  trackingUrl: string;
}

export interface BatchEventRow { at: string; user: string; action: string; before: string; after: string; reason: string }

export async function loadDeliverySettings(db: Db): Promise<DeliverySettingsData> {
  const row = await db.credential_config.findFirst({
    where: { category: 'delivery', deleted_at: null },
    orderBy: { id: 'desc' },
  });
  const parsed = parseConfigData<DeliverySettingsData>(row?.data, DEFAULT_DELIVERY_SETTINGS);
  return {
    overdueDays: Number.isInteger(parsed.overdueDays) && parsed.overdueDays >= 1 ? parsed.overdueDays : DEFAULT_DELIVERY_SETTINGS.overdueDays,
    readyDays: Number.isInteger(parsed.readyDays) && parsed.readyDays >= 1 ? parsed.readyDays : DEFAULT_DELIVERY_SETTINGS.readyDays,
    centreModes: parsed.centreModes ?? {},
  };
}

export async function loadCouriers(db: Db): Promise<CourierOption[]> {
  const rows = await db.credential_config.findMany({ where: { category: 'courier', deleted_at: null }, orderBy: { name: 'asc' } });
  return rows.map((r) => ({
    id: r.id, name: r.name, active: r.is_active,
    trackingUrlPattern: parseConfigData<CourierData>(r.data, { trackingUrlPattern: '' }).trackingUrlPattern ?? '',
  }));
}

/** Offering ids that TTII issues credentials for. */
export async function loadScopeOfferingIds(db: Db): Promise<Set<number>> {
  const rows = await db.credential_offering_settings.findMany({ where: { issued_by_ttii: true }, select: { offering_id: true } });
  return new Set(rows.map((r) => r.offering_id));
}

export async function userNames(db: Db, ids: ReadonlyArray<number | null | undefined>): Promise<Map<number, string>> {
  const unique = [...new Set(ids.filter((v): v is number => typeof v === 'number' && v > 0))];
  if (unique.length === 0) return new Map();
  const rows = await db.users.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
  return new Map(rows.map((r) => [r.id, r.name ?? `User ${r.id}`]));
}

export async function centreNames(db: Db, ids: ReadonlyArray<number | null | undefined>): Promise<Map<number, string>> {
  const unique = [...new Set(ids.filter((v): v is number => typeof v === 'number' && v > 0))];
  if (unique.length === 0) return new Map();
  const rows = await db.centres.findMany({ where: { id: { in: unique } }, select: { id: true, centre_name: true } });
  return new Map(rows.map((r) => [r.id, r.centre_name ?? `Centre ${r.id}`]));
}

export async function courseTitles(db: Db, ids: ReadonlyArray<number | null | undefined>): Promise<Map<number, string>> {
  const unique = [...new Set(ids.filter((v): v is number => typeof v === 'number' && v > 0))];
  if (unique.length === 0) return new Map();
  const rows = await db.course.findMany({ where: { id: { in: unique } }, select: { id: true, title: true } });
  return new Map(rows.map((r) => [r.id, r.title ?? `Course ${r.id}`]));
}

export async function enrolmentNumbers(db: Db, ids: readonly number[]): Promise<Map<number, string>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = await db.enrol.findMany({ where: { id: { in: unique } }, select: { id: true, enrollment_id: true } });
  return new Map(rows.map((r) => [r.id, r.enrollment_id ?? '']));
}

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

interface ItemRecord {
  id: number; document_id: number; enrol_id: number; batch_id: number | null; status: string;
  paper_serial: string | null; delivered_at: Date | null; received_by_name: string | null;
  proof_key: string | null; remarks: string | null;
}
interface DocRecord {
  id: number; user_id: number; offering_id: number | null; course_id: number | null; centre_id: number | null;
  doc_type: string; document_no: string; status: string; printed_name: string; enrol_id: number;
}
interface BatchRecord {
  id: number; batch_no: string; type: string; centre_id: number | null; address: string | null;
  courier_id: number | null; awb_no: string | null; status: string; packing_list_key: string | null;
  packed_by: number | null; dispatched_at: Date | null; acknowledged_at: Date | null; created_at: Date;
}

export interface ItemContext {
  items: ItemRecord[];
  docs: Map<number, DocRecord>;
  batches: Map<number, BatchRecord>;
  couriers: Map<number, CourierOption>;
}

/** Build the display rows for a set of item records (already filtered to scope). */
export async function buildItemRows(
  db: Db, items: readonly ItemRecord[], docs: Map<number, DocRecord>, batches: Map<number, BatchRecord>,
  couriers: Map<number, CourierOption>, now: Date, overdueDays: number,
): Promise<DeliveryItemRow[]> {
  const docList = [...docs.values()];
  const [courses, centres, enrolNos, states] = await Promise.all([
    courseTitles(db, docList.map((d) => d.course_id)),
    centreNames(db, docList.map((d) => d.centre_id)),
    enrolmentNumbers(db, docList.map((d) => d.enrol_id)),
    db.credential_learner_state.findMany({
      where: { enrol_id: { in: [...new Set(docList.map((d) => d.enrol_id))] } },
      select: { enrol_id: true, address: true },
    }),
  ]);
  const address = new Map(states.map((s) => [s.enrol_id, s.address ?? '']));
  const rows: DeliveryItemRow[] = [];
  for (const item of items) {
    const doc = docs.get(item.document_id);
    if (!doc || !isItemStatus(item.status)) continue;
    const batch = item.batch_id ? batches.get(item.batch_id) : undefined;
    const batchType = batch && isBatchType(batch.type) ? batch.type : null;
    const courier = batch?.courier_id ? couriers.get(batch.courier_id) : undefined;
    const dispatchedAt = batch?.dispatched_at ?? null;
    const overdue = isOverdue(dispatchedAt, item.status, now, overdueDays);
    rows.push({
      id: item.id, documentId: doc.id, userId: doc.user_id, documentNo: doc.document_no, docType: doc.doc_type,
      learner: doc.printed_name, enrolmentNo: enrolNos.get(doc.enrol_id) ?? '',
      course: doc.course_id ? courses.get(doc.course_id) ?? '' : '',
      centreId: doc.centre_id, centre: doc.centre_id ? centres.get(doc.centre_id) ?? '' : '',
      batchId: item.batch_id, batchNo: batch?.batch_no ?? '', batchType, awbNo: batch?.awb_no ?? '',
      dispatchedAt: iso(dispatchedAt), securitySerial: item.paper_serial ?? '', receiver: item.received_by_name ?? '',
      deliveredAt: iso(item.delivered_at), remarks: item.remarks ?? '', hasProof: Boolean(item.proof_key),
      status: item.status, documentStatus: doc.status, overdue,
      daysLate: dispatchedAt && overdue ? daysLate(dispatchedAt, now, overdueDays) : 0,
      trackingUrl: trackingLink(courier?.trackingUrlPattern, batch?.awb_no) ?? '',
      nextStatuses: doc.status === 'valid' ? nextStatuses(item.status, batchType) : [],
      learnerAddress: address.get(doc.enrol_id) ?? '',
    });
  }
  return rows;
}

/** Every in-scope item with its document, batch and courier. */
export async function loadItemContext(db: Db, itemIds?: readonly number[]): Promise<ItemContext> {
  const scope = await loadScopeOfferingIds(db);
  const items = await db.credential_delivery_items.findMany({
    ...(itemIds ? { where: { id: { in: [...itemIds] } } } : {}),
    orderBy: { id: 'desc' },
  });
  const docIds = [...new Set(items.map((i) => i.document_id))];
  const docRows = docIds.length
    ? await db.credential_documents.findMany({ where: { id: { in: docIds } } })
    : [];
  const docs = new Map(docRows.filter((d) => d.offering_id !== null && scope.has(d.offering_id)).map((d) => [d.id, d]));
  const batchIds = [...new Set(items.map((i) => i.batch_id).filter((v): v is number => v !== null))];
  const batchRows = batchIds.length ? await db.credential_dispatch_batches.findMany({ where: { id: { in: batchIds } } }) : [];
  const couriers = new Map((await loadCouriers(db)).map((c) => [c.id, c]));
  return { items: items.filter((i) => docs.has(i.document_id)), docs, batches: new Map(batchRows.map((b) => [b.id, b])), couriers };
}

export async function buildBatchRows(db: Db, batches: readonly BatchRecord[], couriers: Map<number, CourierOption>): Promise<DeliveryBatchRow[]> {
  if (batches.length === 0) return [];
  const ids = batches.map((b) => b.id);
  const [centres, people, counts, acks] = await Promise.all([
    centreNames(db, batches.map((b) => b.centre_id)),
    userNames(db, batches.map((b) => b.packed_by)),
    db.credential_delivery_items.findMany({ where: { batch_id: { in: ids } }, select: { batch_id: true } }),
    db.credential_delivery_events.findMany({
      where: { entity_type: 'batch', entity_id: { in: ids }, action: 'Acknowledged' },
      orderBy: { id: 'asc' },
    }),
  ]);
  const itemCount = new Map<number, number>();
  for (const c of counts) if (c.batch_id !== null) itemCount.set(c.batch_id, (itemCount.get(c.batch_id) ?? 0) + 1);
  const receivedBy = new Map(acks.map((e) => [e.entity_id, e.reason ?? '']));
  return batches.map((b) => {
    const courier = b.courier_id ? couriers.get(b.courier_id) : undefined;
    const type: BatchType = isBatchType(b.type) ? b.type : 'office_collection';
    return {
      id: b.id, batchNo: b.batch_no, type, typeLabel: BATCH_TYPE_LABEL[type],
      centreId: b.centre_id, centre: b.centre_id ? centres.get(b.centre_id) ?? '' : '',
      address: b.address ?? '', courierId: b.courier_id, courier: courier?.name ?? '', awbNo: b.awb_no ?? '',
      packedBy: b.packed_by ? people.get(b.packed_by) ?? '' : '', dispatchedAt: iso(b.dispatched_at),
      status: b.status, createdAt: b.created_at.toISOString(), receivedBy: receivedBy.get(b.id) ?? '',
      acknowledgedAt: iso(b.acknowledged_at), hasPackingList: Boolean(b.packing_list_key), itemCount: itemCount.get(b.id) ?? 0,
      trackingUrl: trackingLink(courier?.trackingUrlPattern, b.awb_no) ?? '',
    };
  });
}

export async function loadBatchEvents(db: Db, batchId: number): Promise<BatchEventRow[]> {
  const itemIds = (await db.credential_delivery_items.findMany({ where: { batch_id: batchId }, select: { id: true } })).map((i) => i.id);
  const events = await db.credential_delivery_events.findMany({
    where: { OR: [{ entity_type: 'batch', entity_id: batchId }, ...(itemIds.length ? [{ entity_type: 'item', entity_id: { in: itemIds } }] : [])] },
    orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
  });
  const people = await userNames(db, events.map((e) => e.actor_user_id));
  return events.map((e) => ({
    at: e.created_at.toISOString(), user: e.actor_user_id ? people.get(e.actor_user_id) ?? '' : 'System',
    action: e.entity_type === 'item' ? `${e.action} (item ${e.entity_id})` : e.action,
    before: e.before_status ?? '', after: e.after_status ?? '', reason: e.reason ?? '',
  }));
}
