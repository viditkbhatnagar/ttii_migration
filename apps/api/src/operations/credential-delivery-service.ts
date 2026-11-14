import { randomBytes } from 'node:crypto';

import type { Prisma } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import type { StorageProvider } from '../integrations/contracts.js';
import {
  BATCH_TYPE_LABEL, DELIVERED_STATUSES, ITEM_STATUS_LABEL, batchSequence, batchStatusAfterUpdate, formatBatchNo,
  isBatchType, isCredentialStorageKey, isItemStatus, validateAcknowledge, validateBatchCreate, validateDispatch,
  validateItemUpdate, type BatchItemFacts,
} from './credential-delivery-model.js';
import {
  buildBatchRows, buildItemRows, centreNames, courseTitles, enrolmentNumbers, loadBatchEvents, loadCouriers,
  loadDeliverySettings, loadItemContext, loadScopeOfferingIds, userNames,
  type Db, type DeliveryBatchRow, type DeliveryItemRow,
} from './credential-delivery-reads.js';
import { notifyCredential, notifyCredentialAdmins, CredentialNoticeFeed, type NoticeRow } from './credential-notifications.js';
import { renderPackingListPdf } from './credential-packing-list-pdf.js';
import { NOT_SET_UP_MESSAGE, isMissingTable, type ItemStatus } from './credential-types.js';

// Credential Manager — Delivery Tracking and the Centre Certificates page
// (spec §1.4, §1.10, §5). Every write claims its row with a status-guarded
// updateMany, so two clicks (or two admins) cannot both win, and writes an
// event row for the change. Refusals answer { status: 0, message }.

export interface Outcome<T = Record<string, unknown>> { status: 0 | 1; message: string; data?: T }

/** Thrown inside a transaction to roll it back with a user-facing reason. */
class Refusal extends Error {}

const ok = <T>(message: string, data?: T): Outcome<T> => (data === undefined ? { status: 1, message } : { status: 1, message, data });
const fail = (message: string): Outcome<never> => ({ status: 0, message });

const SERIAL_MAX = 60;
const SIGNED_URL_SECONDS = 300;
const BATCH_NO_RETRIES = 5;

export interface DeliveryServiceDeps {
  prisma?: Db & { $transaction: <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) => Promise<T> };
  storage?: StorageProvider | undefined;
  now?: () => Date;
  /**
   * The issue flow's duplicate-copy service, when it is wired in. Called after
   * the Duplicate event is recorded; without it only the event (and a new print
   * queue item) is written.
   */
  duplicateIssuer?: (documentId: number, reason: string, actorId: number | null) => Promise<void>;
}

type Tx = Prisma.TransactionClient;

function positive(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function safeSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '_').replace(/_+/g, '_').slice(0, 60) || 'file';
}

export class CredentialDeliveryService {
  private readonly prisma: NonNullable<DeliveryServiceDeps['prisma']>;
  private readonly storage: StorageProvider | undefined;
  private readonly now: () => Date;
  private readonly duplicateIssuer: DeliveryServiceDeps['duplicateIssuer'];

  constructor(deps: DeliveryServiceDeps = {}) {
    this.prisma = deps.prisma ?? (getPrismaClient() as NonNullable<DeliveryServiceDeps['prisma']>);
    this.storage = deps.storage;
    this.now = deps.now ?? (() => new Date());
    this.duplicateIssuer = deps.duplicateIssuer;
  }

  /** Wrap a write: a refusal or a missing table answers 200 { status: 0 }; anything else propagates. */
  private async guard<T>(fn: () => Promise<Outcome<T>>): Promise<Outcome<T>> {
    try {
      return await fn();
    } catch (error: unknown) {
      if (error instanceof Refusal) return fail(error.message);
      if (isMissingTable(error)) return fail(NOT_SET_UP_MESSAGE);
      throw error;
    }
  }

  // ── Reads ──────────────────────────────────────────────────────────────────

  async overview(): Promise<Outcome<DeliveryOverview>> {
    const empty: DeliveryOverview = {
      ready: true, items: [], batches: [], couriers: [], centres: [], settings: { overdueDays: 10, readyDays: 3 },
    };
    try {
      const now = this.now();
      const settings = await loadDeliverySettings(this.prisma);
      const ctx = await loadItemContext(this.prisma);
      const items = await buildItemRows(this.prisma, ctx.items, ctx.docs, ctx.batches, ctx.couriers, now, settings.overdueDays);
      const allBatches = await this.prisma.credential_dispatch_batches.findMany({ orderBy: { id: 'desc' } });
      const batches = await buildBatchRows(this.prisma, await this.scopedBatches(allBatches), ctx.couriers);
      const centreIds = [...new Set([...items.map((i) => i.centreId), ...batches.map((b) => b.centreId)])];
      const centreRows = await this.prisma.centres.findMany({
        where: { status: 1 }, select: { id: true, centre_name: true, address: true }, orderBy: { centre_name: 'asc' },
      });
      const known = await centreNames(this.prisma, centreIds);
      const centres = [
        ...centreRows.map((c) => ({ id: c.id, name: c.centre_name ?? `Centre ${c.id}`, address: c.address ?? '' })),
        ...[...known].filter(([id]) => !centreRows.some((c) => c.id === id)).map(([id, name]) => ({ id, name, address: '' })),
      ];
      return ok('success', {
        ready: true, items, batches, couriers: [...ctx.couriers.values()].map((c) => ({ id: c.id, name: c.name, active: c.active })),
        centres, settings: { overdueDays: settings.overdueDays, readyDays: settings.readyDays },
      });
    } catch (error: unknown) {
      if (isMissingTable(error)) return { status: 1, message: NOT_SET_UP_MESSAGE, data: { ...empty, ready: false } };
      throw error;
    }
  }

  /** Batches that hold at least one in-scope item (a batch with no items yet cannot exist). */
  private async scopedBatches(
    batches: Awaited<ReturnType<Db['credential_dispatch_batches']['findMany']>>,
  ): Promise<typeof batches> {
    if (batches.length === 0) return batches;
    const items = await this.prisma.credential_delivery_items.findMany({
      where: { batch_id: { in: batches.map((b) => b.id) } }, select: { batch_id: true, document_id: true },
    });
    const scope = await loadScopeOfferingIds(this.prisma);
    const docs = await this.prisma.credential_documents.findMany({
      where: { id: { in: [...new Set(items.map((i) => i.document_id))] } }, select: { id: true, offering_id: true },
    });
    const inScope = new Set(docs.filter((d) => d.offering_id !== null && scope.has(d.offering_id)).map((d) => d.id));
    const visible = new Set(items.filter((i) => inScope.has(i.document_id)).map((i) => i.batch_id));
    return batches.filter((b) => visible.has(b.id));
  }

  async batchDetail(batchId: number): Promise<Outcome<{ batch: DeliveryBatchRow; items: DeliveryItemRow[]; history: Awaited<ReturnType<typeof loadBatchEvents>> }>> {
    const row = await this.prisma.credential_dispatch_batches.findUnique({ where: { id: batchId } });
    if (!row) return fail('Batch not found.');
    const settings = await loadDeliverySettings(this.prisma);
    const ids = (await this.prisma.credential_delivery_items.findMany({ where: { batch_id: batchId }, select: { id: true } })).map((i) => i.id);
    const ctx = await loadItemContext(this.prisma, ids);
    const items = await buildItemRows(this.prisma, ctx.items, ctx.docs, ctx.batches, ctx.couriers, this.now(), settings.overdueDays);
    const [batch] = await buildBatchRows(this.prisma, [row], ctx.couriers);
    if (!batch) return fail('Batch not found.');
    return ok('success', { batch, items, history: await loadBatchEvents(this.prisma, batchId) });
  }

  /** A short-lived link to the batch's packing list. */
  async packingListUrl(batchId: number): Promise<Outcome<{ url: string }>> {
    const batch = await this.prisma.credential_dispatch_batches.findUnique({ where: { id: batchId } });
    if (!batch?.packing_list_key) return fail('The packing list has not been generated yet.');
    return this.signed(batch.packing_list_key, `${safeSegment(batch.batch_no)}-packing-list.pdf`);
  }

  async itemProofUrl(itemId: number, centreId: number | null = null): Promise<Outcome<{ url: string }>> {
    const item = await this.prisma.credential_delivery_items.findUnique({ where: { id: itemId } });
    if (!item?.proof_key) return fail('No proof was uploaded for this item.');
    if (centreId !== null && !(await this.documentBelongsToCentre(item.document_id, centreId))) return fail('Not found.');
    return this.signed(item.proof_key, 'proof');
  }

  /** The document PDF, for admin (centreId null) or scoped to one centre. */
  async documentFileUrl(documentId: number, centreId: number | null = null): Promise<Outcome<{ url: string }>> {
    const doc = await this.prisma.credential_documents.findUnique({ where: { id: documentId } });
    if (!doc) return fail('Document not found.');
    if (centreId !== null && doc.centre_id !== centreId) return fail('Document not found.');
    if (!doc.storage_key) return fail('The PDF is not available yet. Ask a Credential admin to regenerate it.');
    return this.signed(doc.storage_key, `${safeSegment(doc.document_no)}.pdf`);
  }

  private async signed(key: string, fileName: string): Promise<Outcome<{ url: string }>> {
    if (!this.storage) return fail('File storage is not configured on this server.');
    const url = await this.storage.createSignedDownloadUrl({ key, expiresInSeconds: SIGNED_URL_SECONDS, fileName });
    return ok('success', { url });
  }

  private async documentBelongsToCentre(documentId: number, centreId: number): Promise<boolean> {
    const doc = await this.prisma.credential_documents.findUnique({ where: { id: documentId }, select: { centre_id: true } });
    return doc?.centre_id === centreId;
  }

  // ── Print ──────────────────────────────────────────────────────────────────

  /** Print & record: Print queued -> Printed, optional unique security paper serial, an Original Print event on each document. */
  async printItems(actor: number | null, itemIds: readonly number[], serials: Record<string, string>): Promise<Outcome> {
    return this.guard(async () => {
      const ids = [...new Set(itemIds.map(positive).filter(Boolean))];
      if (ids.length === 0) return fail('Select at least one document to print.');
      const ctx = await loadItemContext(this.prisma, ids);
      if (ctx.items.length !== ids.length) return fail('A selected document could not be found.');
      for (const item of ctx.items) {
        const doc = ctx.docs.get(item.document_id);
        if (item.status !== 'print_queued' || doc?.status !== 'valid') return fail('Only valid documents in the print queue can be printed.');
      }
      const chosen = new Map<number, string>();
      for (const id of ids) {
        const serial = (serials[String(id)] ?? '').trim();
        if (serial.length > SERIAL_MAX) return fail(`A security serial can be at most ${SERIAL_MAX} characters.`);
        if (serial) chosen.set(id, serial);
      }
      const values = [...chosen.values()];
      if (new Set(values.map((v) => v.toLowerCase())).size !== values.length) return fail('Security serials must be unique.');
      if (values.length) {
        const taken = await this.prisma.credential_delivery_items.findMany({
          where: { paper_serial: { in: values } }, select: { id: true, paper_serial: true },
        });
        if (taken.some((t) => !chosen.has(t.id) || chosen.get(t.id) !== t.paper_serial)) return fail('A security serial is already used by another document.');
      }
      const at = this.now();
      try {
        await this.prisma.$transaction(async (tx) => {
          for (const item of ctx.items) {
            const serial = chosen.get(item.id) ?? null;
            const claimed = await tx.credential_delivery_items.updateMany({
              where: { id: item.id, status: 'print_queued' }, data: { status: 'printed', paper_serial: serial, updated_at: at },
            });
            if (claimed.count !== 1) throw new Refusal('A document was already printed by someone else. Refresh and try again.');
            await tx.credential_delivery_events.create({
              data: { entity_type: 'item', entity_id: item.id, action: 'Print', before_status: 'print_queued', after_status: 'printed', reason: serial ? `Security serial ${serial}` : null, actor_user_id: actor, created_at: at },
            });
            await tx.credential_document_events.create({
              data: { document_id: item.document_id, action: 'Print', copy_type: 'original', reason: serial ? `Security serial ${serial}` : null, before_status: 'valid', after_status: 'valid', actor_user_id: actor, created_at: at },
            });
          }
        });
      } catch (error: unknown) {
        if ((error as { code?: string } | null)?.code === 'P2002') return fail('A security serial is already used by another document.');
        throw error;
      }
      return ok('Print recorded.');
    });
  }

  // ── Dispatch batches ───────────────────────────────────────────────────────

  async createBatch(actor: number | null, input: {
    itemIds: readonly number[]; type: string; centreId: number; address: string; courierId: number; awbNo: string;
  }): Promise<Outcome<{ id: number; batchNo: string }>> {
    return this.guard(async () => {
      const ids = [...new Set(input.itemIds.map(positive).filter(Boolean))];
      const ctx = await loadItemContext(this.prisma, ids);
      if (ctx.items.length !== ids.length) return fail('A selected document could not be found.');
      const courier = input.courierId ? (await loadCouriers(this.prisma)).find((c) => c.id === input.courierId) : undefined;
      const facts: BatchItemFacts[] = ctx.items.flatMap((i) => {
        const doc = ctx.docs.get(i.document_id);
        return doc && isItemStatus(i.status)
          ? [{ id: i.id, status: i.status, batchId: i.batch_id, documentValid: doc.status === 'valid', centreId: doc.centre_id, userId: doc.user_id }]
          : [];
      });
      const problem = validateBatchCreate(facts, {
        type: input.type, centreId: input.centreId || null, address: input.address, awbNo: input.awbNo, courierActive: Boolean(courier?.active),
      });
      if (problem) return fail(problem);
      if (!isBatchType(input.type)) return fail('Choose the dispatch type.');
      const type = input.type;
      const enrols = new Set(ctx.items.map((i) => i.enrol_id));
      const office = type === 'office_collection';
      const at = this.now();

      for (let attempt = 0; attempt < BATCH_NO_RETRIES; attempt += 1) {
        try {
          const created = await this.prisma.$transaction(async (tx) => {
            const last = await tx.credential_dispatch_batches.findFirst({ orderBy: { id: 'desc' }, select: { batch_no: true } });
            const numbers = await tx.credential_dispatch_batches.count();
            const batchNo = formatBatchNo(Math.max(batchSequence(last?.batch_no), numbers) + 1 + attempt);
            const batch = await tx.credential_dispatch_batches.create({
              data: {
                batch_no: batchNo, type, centre_id: type === 'to_centre' ? input.centreId : null,
                enrol_id: type === 'to_learner' && enrols.size === 1 ? [...enrols][0] ?? null : null,
                address: office ? null : input.address.trim(), courier_id: office ? null : courier?.id ?? null,
                awb_no: office ? null : input.awbNo.trim(), status: 'packed', packed_by: actor, created_at: at,
              },
            });
            const claimed = await tx.credential_delivery_items.updateMany({
              where: { id: { in: ids }, status: 'printed', batch_id: null }, data: { status: 'packed', batch_id: batch.id, updated_at: at },
            });
            if (claimed.count !== ids.length) throw new Refusal('A document was already packed by someone else. Refresh and try again.');
            await tx.credential_delivery_events.create({
              data: { entity_type: 'batch', entity_id: batch.id, action: 'Packed', before_status: null, after_status: 'packed', reason: `${BATCH_TYPE_LABEL[type]}, ${ids.length} document(s)`, actor_user_id: actor, created_at: at },
            });
            for (const id of ids) {
              await tx.credential_delivery_events.create({
                data: { entity_type: 'item', entity_id: id, action: 'Pack', before_status: 'printed', after_status: 'packed', reason: batchNo, actor_user_id: actor, created_at: at },
              });
            }
            return batch;
          });
          return ok('Batch packed; review before dispatch.', { id: created.id, batchNo: created.batch_no });
        } catch (error: unknown) {
          if ((error as { code?: string } | null)?.code === 'P2002' && attempt < BATCH_NO_RETRIES - 1) continue;
          throw error;
        }
      }
      return fail('Could not allocate a batch number. Please try again.');
    });
  }

  /** Generate (or regenerate, while still packed) the packing list PDF and store it privately. */
  async generatePackingList(actor: number | null, batchId: number): Promise<Outcome> {
    return this.guard(async () => {
      if (!this.storage) return fail('File storage is not configured on this server.');
      const batch = await this.prisma.credential_dispatch_batches.findUnique({ where: { id: batchId } });
      if (!batch) return fail('Batch not found.');
      if (batch.status !== 'packed') return fail('The packing list can only be generated while the batch is packed.');
      const rows = await this.itemRowsOfBatch(batchId);
      if (rows.length === 0) return fail('This batch has no documents.');
      const [centres, people] = await Promise.all([centreNames(this.prisma, [batch.centre_id]), userNames(this.prisma, [actor, batch.packed_by])]);
      const items = await this.prisma.credential_delivery_items.findMany({ where: { batch_id: batchId }, select: { id: true, paper_serial: true } });
      const serial = new Map(items.map((i) => [i.id, i.paper_serial ?? '']));
      const type = isBatchType(batch.type) ? batch.type : 'office_collection';
      const pdf = await renderPackingListPdf({
        batchNo: batch.batch_no, typeLabel: BATCH_TYPE_LABEL[type], centre: batch.centre_id ? centres.get(batch.centre_id) ?? '' : '',
        address: batch.address ?? '', awbNo: batch.awb_no ?? '', packedBy: batch.packed_by ? people.get(batch.packed_by) ?? '' : '',
        items: rows.map((r) => ({ learner: r.learner, enrolmentNo: r.enrolmentNo, documentNo: r.documentNo, securitySerial: serial.get(r.id) ?? '' })),
      });
      const key = `credentials/packing-lists/${safeSegment(batch.batch_no)}-${randomBytes(16).toString('hex')}.pdf`;
      await this.storage.uploadObject({ key, body: pdf, contentType: 'application/pdf' });
      const at = this.now();
      await this.prisma.credential_dispatch_batches.update({ where: { id: batchId }, data: { packing_list_key: key, updated_at: at } });
      await this.prisma.credential_delivery_events.create({
        data: { entity_type: 'batch', entity_id: batchId, action: 'Packing list generated', before_status: 'packed', after_status: 'packed', reason: null, actor_user_id: actor, created_at: at },
      });
      return ok('Packing list generated.');
    });
  }

  private async itemRowsOfBatch(batchId: number): Promise<DeliveryItemRow[]> {
    const ids = (await this.prisma.credential_delivery_items.findMany({ where: { batch_id: batchId }, select: { id: true } })).map((i) => i.id);
    if (ids.length === 0) return [];
    const ctx = await loadItemContext(this.prisma, ids);
    return buildItemRows(this.prisma, ctx.items, ctx.docs, ctx.batches, ctx.couriers, this.now(), 10_000);
  }

  async dispatchBatch(actor: number | null, batchId: number): Promise<Outcome> {
    return this.guard(async () => {
      const batch = await this.prisma.credential_dispatch_batches.findUnique({ where: { id: batchId } });
      if (!batch) return fail('Batch not found.');
      const itemRows = await this.prisma.credential_delivery_items.findMany({ where: { batch_id: batchId } });
      const docs = await this.prisma.credential_documents.findMany({
        where: { id: { in: itemRows.map((i) => i.document_id) } }, select: { id: true, status: true, user_id: true },
      });
      const validDoc = new Map(docs.map((d) => [d.id, d]));
      const problem = validateDispatch({
        status: batch.status === 'packed' ? 'packed' : 'dispatched',
        hasPackingList: Boolean(batch.packing_list_key),
        items: itemRows.flatMap((i) => (isItemStatus(i.status) ? [{ status: i.status, documentValid: validDoc.get(i.document_id)?.status === 'valid' }] : [])),
      });
      if (problem) return fail(problem);
      const at = this.now();
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.credential_dispatch_batches.updateMany({
          where: { id: batchId, status: 'packed', dispatched_at: null }, data: { status: 'dispatched', dispatched_at: at, updated_at: at },
        });
        if (claimed.count !== 1) throw new Refusal('This batch was already dispatched.');
        await tx.credential_delivery_items.updateMany({ where: { batch_id: batchId, status: 'packed' }, data: { status: 'dispatched', updated_at: at } });
        await tx.credential_delivery_events.create({
          data: { entity_type: 'batch', entity_id: batchId, action: 'Dispatched', before_status: 'packed', after_status: 'dispatched', reason: null, actor_user_id: actor, created_at: at },
        });
        for (const item of itemRows) {
          await tx.credential_delivery_events.create({
            data: { entity_type: 'item', entity_id: item.id, action: 'Dispatch', before_status: 'packed', after_status: 'dispatched', reason: batch.batch_no, actor_user_id: actor, created_at: at },
          });
        }
      });
      await this.notifyDispatched(batchId, itemRows.map((i) => ({ id: i.id, documentId: i.document_id })), validDoc);
      return ok('Batch dispatched.');
    });
  }

  private async notifyDispatched(
    batchId: number, items: ReadonlyArray<{ id: number; documentId: number }>, docs: Map<number, { user_id: number }>,
  ): Promise<void> {
    const detail = await this.batchDetail(batchId);
    const link = detail.data?.batch.trackingUrl ?? '';
    const batchNo = detail.data?.batch.batchNo ?? '';
    for (const item of items) {
      const doc = docs.get(item.documentId);
      if (!doc) continue;
      await notifyCredential({
        key: `dispatched:${item.id}`, audience: 'learner', recipientUserId: doc.user_id, title: 'Document dispatched',
        body: `Your document was dispatched in batch ${batchNo}.`, link,
      }, this.prisma);
    }
    const centreId = detail.data?.batch.centreId;
    if (centreId) {
      await notifyCredential({
        key: `batch-dispatched:${batchId}`, audience: 'centre', centreId, title: 'Parcel dispatched to your centre',
        body: `Batch ${batchNo} was dispatched. Acknowledge it when it arrives.`, link: '/centre/certificates',
      }, this.prisma);
    }
  }

  // ── Item updates ───────────────────────────────────────────────────────────

  async updateItem(actor: number | null, itemId: number, input: {
    status: string; receiverName: string; proofKey: string | null; remarks: string;
  }, scope: { centreId: number | null } = { centreId: null }): Promise<Outcome> {
    return this.guard(async () => {
      const item = await this.prisma.credential_delivery_items.findUnique({ where: { id: itemId } });
      if (!item || !isItemStatus(item.status)) return fail('Delivery item not found.');
      const doc = await this.prisma.credential_documents.findUnique({ where: { id: item.document_id } });
      if (!doc) return fail('Delivery item not found.');
      if (scope.centreId !== null && doc.centre_id !== scope.centreId) return fail('Delivery item not found.');
      if (doc.status !== 'valid') return fail('Only valid documents can be updated.');
      const batch = item.batch_id ? await this.prisma.credential_dispatch_batches.findUnique({ where: { id: item.batch_id } }) : null;
      if (!isItemStatus(input.status)) return fail('Choose a valid status.');
      const next = input.status;
      const batchType = batch && isBatchType(batch.type) ? batch.type : null;
      if (input.proofKey && !isCredentialStorageKey(input.proofKey, 'delivery-proof')) return fail('The proof file is not valid. Upload it again.');
      if (scope.centreId !== null) {
        // Centre self-service: only Handed over, only for an acknowledged to-centre parcel of its own centre.
        if (next !== 'handed_over' || batchType !== 'to_centre' || !batch?.acknowledged_at) {
          return fail('Acknowledge the parcel before handing a document over.');
        }
      }
      const problem = validateItemUpdate({
        from: item.status, to: next, batchType, receiverName: input.receiverName, proofKey: input.proofKey, remarks: input.remarks,
      });
      if (problem) return fail(problem);
      const at = this.now();
      const finished = DELIVERED_STATUSES.includes(next);
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.credential_delivery_items.updateMany({
          where: { id: itemId, status: item.status },
          data: {
            status: next, updated_at: at,
            ...(finished ? { delivered_at: at } : {}),
            ...(input.receiverName.trim() ? { received_by_name: input.receiverName.trim().slice(0, 200) } : {}),
            ...(input.proofKey ? { proof_key: input.proofKey } : {}),
            ...(input.remarks.trim() ? { remarks: input.remarks.trim() } : {}),
          },
        });
        if (claimed.count !== 1) throw new Refusal('This item was updated by someone else. Refresh and try again.');
        await tx.credential_delivery_events.create({
          data: {
            entity_type: 'item', entity_id: itemId, action: scope.centreId !== null ? 'Handover' : 'Update delivery',
            before_status: item.status, after_status: next,
            reason: [input.receiverName.trim() && `Receiver: ${input.receiverName.trim()}`, input.remarks.trim()].filter(Boolean).join(' - ') || null,
            actor_user_id: actor, created_at: at,
          },
        });
        if (item.batch_id) await this.refreshBatchStatus(tx, item.batch_id, at);
      });
      if (finished) {
        await notifyCredential({
          key: `delivered:${itemId}`, audience: 'learner', recipientUserId: doc.user_id, title: 'Document delivered',
          body: `Your ${doc.doc_type} ${doc.document_no} was ${ITEM_STATUS_LABEL[next].toLowerCase()}.`,
        }, this.prisma);
      }
      return ok('Delivery updated.');
    });
  }

  private async refreshBatchStatus(tx: Tx, batchId: number, at: Date): Promise<void> {
    const rows = await tx.credential_delivery_items.findMany({ where: { batch_id: batchId }, select: { status: true } });
    const statuses = rows.map((r) => r.status).filter(isItemStatus);
    await tx.credential_dispatch_batches.updateMany({
      where: { id: batchId, status: { in: ['dispatched', 'in_progress', 'delivered'] } },
      data: { status: batchStatusAfterUpdate(statuses), updated_at: at },
    });
  }

  /** Lost -> Duplicate: record the Duplicate event and queue a fresh copy for printing. */
  async duplicateLostItem(actor: number | null, itemId: number, reason: string): Promise<Outcome> {
    return this.guard(async () => {
      if (!reason.trim()) return fail('Duplicate reason is required.');
      const item = await this.prisma.credential_delivery_items.findUnique({ where: { id: itemId } });
      if (!item || item.status !== 'lost') return fail('Only a lost copy can be duplicated.');
      const doc = await this.prisma.credential_documents.findUnique({ where: { id: item.document_id } });
      if (!doc || doc.status !== 'valid') return fail('Only valid documents can be duplicated.');
      const later = await this.prisma.credential_delivery_items.findFirst({ where: { document_id: doc.id, id: { gt: item.id } } });
      if (later) return fail('A duplicate copy is already in the print queue.');
      const at = this.now();
      await this.prisma.$transaction(async (tx) => {
        await tx.credential_document_events.create({
          data: { document_id: doc.id, action: 'Duplicate', copy_type: 'duplicate', reason: reason.trim(), before_status: 'valid', after_status: 'valid', actor_user_id: actor, created_at: at },
        });
        const created = await tx.credential_delivery_items.create({
          data: { document_id: doc.id, enrol_id: doc.enrol_id, status: 'print_queued', created_at: at },
        });
        await tx.credential_delivery_events.create({
          data: { entity_type: 'item', entity_id: item.id, action: 'Duplicate', before_status: 'lost', after_status: 'lost', reason: `${reason.trim()} (new item ${created.id})`, actor_user_id: actor, created_at: at },
        });
      });
      if (this.duplicateIssuer) await this.duplicateIssuer(doc.id, reason.trim(), actor);
      await notifyCredentialAdmins({ key: `duplicate:${item.id}`, title: 'Credential duplicate', body: `${doc.document_no}: a duplicate copy was queued for printing.`, link: '/admin/credentials/delivery' }, this.prisma);
      await notifyCredential({ key: `duplicate:${item.id}`, audience: 'learner', recipientUserId: doc.user_id, title: 'Credential duplicate', body: 'A duplicate copy of your document is being prepared.' }, this.prisma);
      return ok('Duplicate copy queued for printing.');
    });
  }

  // ── Centre Certificates ────────────────────────────────────────────────────

  /** The caller's own centre (users.centre_id); never a client-supplied id. */
  async callerCentre(userId: number): Promise<number | null> {
    const user = await this.prisma.users.findFirst({ where: { id: userId, deleted_at: null }, select: { centre_id: true, role_id: true } });
    if (!user || user.role_id !== 7) return null;
    return positive(user.centre_id) || null;
  }

  async centreOverview(userId: number): Promise<Outcome<CentreCertificates>> {
    const centreId = await this.callerCentre(userId);
    if (!centreId) return fail('Your centre could not be found.');
    try {
      const scope = await loadScopeOfferingIds(this.prisma);
      const docs = (await this.prisma.credential_documents.findMany({ where: { centre_id: centreId }, orderBy: { id: 'desc' } }))
        .filter((d) => d.offering_id !== null && scope.has(d.offering_id) && d.status !== 'superseded');
      const docIds = docs.map((d) => d.id);
      const items = docIds.length ? await this.prisma.credential_delivery_items.findMany({ where: { document_id: { in: docIds } }, orderBy: { id: 'desc' } }) : [];
      const batchIds = [...new Set(items.map((i) => i.batch_id).filter((v): v is number => v !== null))];
      const batchRows = batchIds.length ? await this.prisma.credential_dispatch_batches.findMany({ where: { id: { in: batchIds } } }) : [];
      const [courses, enrolNos, couriers, settings] = await Promise.all([
        courseTitles(this.prisma, docs.map((d) => d.course_id)), enrolmentNumbers(this.prisma, docs.map((d) => d.enrol_id)),
        loadCouriers(this.prisma).then((c) => new Map(c.map((x) => [x.id, x]))), loadDeliverySettings(this.prisma),
      ]);
      const ctxItems = await buildItemRows(
        this.prisma, items, new Map(docs.map((d) => [d.id, d])), new Map(batchRows.map((b) => [b.id, b])), couriers, this.now(), settings.overdueDays,
      );
      const toCentre = batchRows.filter((b) => b.type === 'to_centre' && b.centre_id === centreId && b.dispatched_at !== null);
      const parcels = await buildBatchRows(this.prisma, toCentre, couriers);
      const latest = new Map<number, DeliveryItemRow>();
      for (const row of ctxItems) if (!latest.has(row.documentId)) latest.set(row.documentId, row);
      const feed = await new CredentialNoticeFeed(this.prisma).centreFeed(centreId);
      const names = await centreNames(this.prisma, [centreId]);
      return ok('success', {
        ready: true, centre: names.get(centreId) ?? '',
        documents: docs.map((d) => ({
          id: d.id, documentNo: d.document_no, docType: d.doc_type, learner: d.printed_name, enrolmentNo: enrolNos.get(d.enrol_id) ?? '',
          course: d.course_id ? courses.get(d.course_id) ?? '' : '', issueDate: d.issue_date.toISOString().slice(0, 10), status: d.status,
          physicalStatus: latest.get(d.id)?.status ?? '', canDownload: Boolean(d.storage_key) && d.status === 'valid',
        })),
        parcels,
        handovers: ctxItems.filter((i) => i.batchType === 'to_centre' && (i.status === 'delivered' || i.status === 'handed_over')).map((i) => ({
          id: i.id, learner: i.learner, documentNo: i.documentNo, course: i.course, batchNo: i.batchNo, status: i.status,
          receiver: i.receiver, deliveredAt: i.deliveredAt, hasProof: i.hasProof,
          canHandOver: i.status === 'delivered' && Boolean(toCentre.find((b) => b.id === i.batchId)?.acknowledged_at),
        })),
        notices: feed,
      });
    } catch (error: unknown) {
      if (isMissingTable(error)) return { status: 1, message: NOT_SET_UP_MESSAGE, data: { ready: false, centre: '', documents: [], parcels: [], handovers: [], notices: [] } };
      throw error;
    }
  }

  /** Centre acknowledges its own dispatched To-centre parcel. */
  async acknowledgeParcel(userId: number, batchId: number, receiverName: string): Promise<Outcome> {
    return this.guard(async () => {
      const centreId = await this.callerCentre(userId);
      const batch = await this.prisma.credential_dispatch_batches.findUnique({ where: { id: batchId } });
      if (!batch || !centreId || batch.centre_id !== centreId) return fail('Parcel not found.');
      const items = await this.prisma.credential_delivery_items.findMany({ where: { batch_id: batchId } });
      const problem = validateAcknowledge({
        batchType: batch.type, batchCentreId: batch.centre_id, callerCentreId: centreId, acknowledgedAt: batch.acknowledged_at,
        dispatchedAt: batch.dispatched_at, receiverName, itemStatuses: items.map((i) => i.status).filter(isItemStatus),
      });
      if (problem) return fail(problem);
      const at = this.now();
      const receivable = items.filter((i) => ['dispatched', 'in_transit', 'delivered'].includes(i.status));
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.credential_dispatch_batches.updateMany({
          where: { id: batchId, acknowledged_at: null }, data: { acknowledged_at: at, acknowledged_by: userId, updated_at: at },
        });
        if (claimed.count !== 1) throw new Refusal('This parcel was already acknowledged.');
        await tx.credential_delivery_items.updateMany({
          where: { batch_id: batchId, status: { in: ['dispatched', 'in_transit'] } }, data: { status: 'delivered', delivered_at: at, updated_at: at },
        });
        await tx.credential_delivery_events.create({
          data: { entity_type: 'batch', entity_id: batchId, action: 'Acknowledged', before_status: batch.status, after_status: 'delivered', reason: receiverName.trim().slice(0, 200), actor_user_id: userId, created_at: at },
        });
        for (const item of receivable.filter((i) => i.status !== 'delivered')) {
          await tx.credential_delivery_events.create({
            data: { entity_type: 'item', entity_id: item.id, action: 'Parcel received by centre', before_status: item.status, after_status: 'delivered', reason: receiverName.trim(), actor_user_id: userId, created_at: at },
          });
        }
        await this.refreshBatchStatus(tx, batchId, at);
      });
      const docs = await this.prisma.credential_documents.findMany({ where: { id: { in: receivable.map((i) => i.document_id) } }, select: { id: true, user_id: true } });
      for (const doc of docs) {
        await notifyCredential({ key: `centre-received:${batchId}:${doc.id}`, audience: 'learner', recipientUserId: doc.user_id, title: 'Parcel received by centre', body: 'Your document reached your centre.' }, this.prisma);
      }
      return ok('Receipt recorded.');
    });
  }

  /** Centre hands a document to the learner: own centre, acknowledged parcel, receiver + proof. */
  async handOver(userId: number, itemId: number, receiverName: string, proofKey: string | null): Promise<Outcome> {
    const centreId = await this.callerCentre(userId);
    if (!centreId) return fail('Your centre could not be found.');
    return this.updateItem(userId, itemId, { status: 'handed_over', receiverName, proofKey, remarks: '' }, { centreId });
  }
}

export interface DeliveryOverview {
  ready: boolean;
  items: DeliveryItemRow[];
  batches: DeliveryBatchRow[];
  couriers: Array<{ id: number; name: string; active: boolean }>;
  centres: Array<{ id: number; name: string; address: string }>;
  settings: { overdueDays: number; readyDays: number };
}

export interface CentreCertificates {
  ready: boolean;
  centre: string;
  documents: Array<{
    id: number; documentNo: string; docType: string; learner: string; enrolmentNo: string; course: string;
    issueDate: string; status: string; physicalStatus: string; canDownload: boolean;
  }>;
  parcels: DeliveryBatchRow[];
  handovers: Array<{
    id: number; learner: string; documentNo: string; course: string; batchNo: string; status: ItemStatus;
    receiver: string; deliveredAt: string | null; hasProof: boolean; canHandOver: boolean;
  }>;
  notices: NoticeRow[];
}
