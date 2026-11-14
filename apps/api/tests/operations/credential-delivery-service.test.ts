import { beforeEach, describe, expect, test } from 'vitest';

import type { StorageProvider } from '../../src/integrations/contracts.js';
import { CredentialDeliveryService } from '../../src/operations/credential-delivery-service.js';
import { notifyCredential } from '../../src/operations/credential-notifications.js';
import { CredentialScansService } from '../../src/operations/credential-scans-service.js';
import { makeFakeDb } from './credential-fake-db.js';

const NOW = new Date('2026-11-14T10:00:00Z');
const PROOF = 'credentials/delivery-proof/aa-proof.pdf';

function setup() {
  const db = makeFakeDb();
  const uploads: string[] = [];
  const storage = {
    name: 'fake',
    uploadObject: (i: { key: string }) => { uploads.push(i.key); return Promise.resolve({ key: i.key, provider: 'fake', location: i.key }); },
    createSignedDownloadUrl: (i: { key: string }) => Promise.resolve(`https://signed.example/${i.key}`),
  } as unknown as StorageProvider;
  db.credential_offering_settings.seed({ offering_id: 1, issued_by_ttii: true, default_delivery_mode: 'via_centre' });
  db.credential_config.seed({ id: 1, category: 'courier', name: 'BlueDart', is_active: true, deleted_at: null, data: JSON.stringify({ trackingUrlPattern: 'https://track.example/{AWB}' }) });
  db.credential_config.seed({ id: 2, category: 'courier', name: 'Retired', is_active: false, deleted_at: null, data: '{}' });
  db.centres.seed({ id: 5, centre_name: 'Kochi Centre', address: 'Kochi', status: 1 });
  db.centres.seed({ id: 6, centre_name: 'Other Centre', address: 'Pune', status: 1 });
  db.users.seed({ id: 500, role_id: 7, centre_id: '5', name: 'Kochi login', deleted_at: null });
  db.users.seed({ id: 600, role_id: 7, centre_id: '6', name: 'Pune login', deleted_at: null });
  db.users.seed({ id: 2, role_id: 2, centre_id: '5', name: 'A learner', deleted_at: null });
  const doc = (id: number, user: number, centre: number, status = 'valid') => db.credential_documents.seed({
    id, enrol_id: id + 10, user_id: user, offering_id: 1, course_id: null, centre_id: centre, doc_type: 'certificate', version: 1,
    document_no: `TTII/CERT/2026/00000${id}`, verification_id: `TTII-V${id}`, status, issue_date: new Date('2026-11-01T00:00:00Z'),
    printed_name: `Learner ${id}`, snapshot: '{}', storage_key: `credentials/certificate/d${id}.pdf`, created_at: NOW,
  });
  doc(1, 101, 5); doc(2, 102, 5); doc(3, 103, 6); doc(4, 104, 5, 'revoked');
  for (const id of [1, 2, 3, 4]) db.credential_delivery_items.seed({ id, document_id: id, enrol_id: id + 10, status: 'print_queued', batch_id: null, paper_serial: null });
  const service = new CredentialDeliveryService({ prisma: db as never, storage, now: () => NOW });
  return { db, service, uploads };
}

async function packedBatch(s: ReturnType<typeof setup>, ids = [1, 2], extra: Partial<{ type: string; centreId: number }> = {}) {
  await s.service.printItems(9, ids, {});
  const made = await s.service.createBatch(9, { itemIds: ids, type: 'to_centre', centreId: 5, address: 'Kochi', courierId: 1, awbNo: 'AWB1', ...extra });
  expect(made.message).toBe('Batch packed; review before dispatch.');
  return made.data?.id ?? 0;
}

describe('print and record', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => { s = setup(); });

  test('moves items to Printed, stores unique serials and logs an Original Print document event', async () => {
    const r = await s.service.printItems(9, [1, 2], { '1': 'SEC-001', '2': ' ' });
    expect(r.status).toBe(1);
    const items = s.db.credential_delivery_items.rows;
    expect(items.slice(0, 2).map((i) => i.status)).toEqual(['printed', 'printed']);
    expect(items[0]?.paper_serial).toBe('SEC-001');
    expect(items[1]?.paper_serial).toBeNull();
    const events = s.db.credential_document_events.rows;
    expect(events).toHaveLength(2);
    expect(events.find((e) => e.document_id === 1)).toMatchObject({ action: 'Print', copy_type: 'original' });
    expect(s.db.credential_delivery_events.rows.filter((e) => e.action === 'Print')).toHaveLength(2);
  });

  test('refuses duplicate serials, reused serials, revoked documents and items not in the queue', async () => {
    expect((await s.service.printItems(9, [1, 2], { '1': 'X', '2': 'x' })).message).toMatch(/unique/);
    await s.service.printItems(9, [1], { '1': 'TAKEN' });
    expect((await s.service.printItems(9, [2], { '2': 'TAKEN' })).message).toMatch(/already used/);
    expect((await s.service.printItems(9, [1], {})).message).toMatch(/print queue/);
    expect((await s.service.printItems(9, [4], {})).message).toMatch(/valid documents/);
    expect((await s.service.printItems(9, [], {})).status).toBe(0);
    expect(s.db.credential_delivery_items.rows[1]?.status).toBe('print_queued');
  });
});

describe('dispatch batches', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => { s = setup(); });

  test('allocates TTII/DISPATCH/0001 then 0002 and packs the items', async () => {
    const first = await packedBatch(s, [1]);
    expect(s.db.credential_dispatch_batches.rows[0]?.batch_no).toBe('TTII/DISPATCH/0001');
    expect(s.db.credential_delivery_items.rows[0]).toMatchObject({ status: 'packed', batch_id: first });
    await s.service.printItems(9, [2], {});
    const second = await s.service.createBatch(9, { itemIds: [2], type: 'to_centre', centreId: 5, address: 'Kochi', courierId: 1, awbNo: 'AWB2' });
    expect(second.data?.batchNo).toBe('TTII/DISPATCH/0002');
  });

  test('enforces the batch rules server-side', async () => {
    await s.service.printItems(9, [1, 2, 3], {});
    const base = { itemIds: [1, 2], type: 'to_centre', centreId: 5, address: 'Kochi', courierId: 1, awbNo: 'A' };
    expect((await s.service.createBatch(9, { ...base, itemIds: [1, 3] })).message).toMatch(/selected centre/);
    expect((await s.service.createBatch(9, { ...base, courierId: 2 })).message).toMatch(/active courier/);
    expect((await s.service.createBatch(9, { ...base, awbNo: '' })).message).toMatch(/AWB/);
    expect((await s.service.createBatch(9, { ...base, type: 'to_learner', centreId: 0 })).message).toMatch(/one learner/);
    expect((await s.service.createBatch(9, { ...base, itemIds: [4] })).status).toBe(0);
    expect(s.db.credential_dispatch_batches.rows).toHaveLength(0);
  });

  test('Mark Dispatched needs the packing list; then dispatches items and notifies learners and the centre', async () => {
    const id = await packedBatch(s);
    expect((await s.service.dispatchBatch(9, id)).message).toMatch(/packing list/);
    const pl = await s.service.generatePackingList(9, id);
    expect(pl.status).toBe(1);
    expect(s.uploads[0]).toMatch(/^credentials\/packing-lists\/TTII_DISPATCH_0001-[0-9a-f]{32}\.pdf$/);
    expect((await s.service.packingListUrl(id)).data?.url).toContain('packing-lists');
    expect((await s.service.dispatchBatch(9, id)).status).toBe(1);
    expect(s.db.credential_delivery_items.rows.slice(0, 2).map((i) => i.status)).toEqual(['dispatched', 'dispatched']);
    expect(s.db.credential_dispatch_batches.rows[0]?.status).toBe('dispatched');
    const titles = s.db.credential_notifications.rows.map((n) => n.title);
    expect(titles.filter((t) => t === 'Document dispatched')).toHaveLength(2);
    expect(titles).toContain('Parcel dispatched to your centre');
    expect(s.db.credential_notifications.rows.find((n) => n.title === 'Document dispatched')?.link).toBe('https://track.example/AWB1');
    expect((await s.service.dispatchBatch(9, id)).message).toMatch(/packed batch|already/);
  });

  test('a document revoked after packing blocks dispatch', async () => {
    const id = await packedBatch(s);
    await s.service.generatePackingList(9, id);
    await s.db.credential_documents.update({ where: { id: 1 }, data: { status: 'revoked' } });
    expect((await s.service.dispatchBatch(9, id)).message).toMatch(/no longer valid/);
  });
});

describe('item updates', () => {
  let s: ReturnType<typeof setup>;
  let batchId = 0;
  beforeEach(async () => {
    s = setup();
    batchId = await packedBatch(s);
    await s.service.generatePackingList(9, batchId);
    await s.service.dispatchBatch(9, batchId);
  });

  test('rejects invalid moves and requires remarks / receiver + proof', async () => {
    expect((await s.service.updateItem(9, 1, { status: 'printed', receiverName: '', proofKey: null, remarks: '' })).message).toMatch(/cannot move/);
    expect((await s.service.updateItem(9, 1, { status: 'lost', receiverName: '', proofKey: null, remarks: '' })).message).toMatch(/remarks/i);
    expect((await s.service.updateItem(9, 1, { status: 'collected', receiverName: 'R', proofKey: PROOF, remarks: '' })).message).toMatch(/cannot move/);
    expect((await s.service.updateItem(9, 1, { status: 'in_transit', receiverName: '', proofKey: null, remarks: '' })).status).toBe(1);
    expect(s.db.credential_delivery_items.rows[0]?.status).toBe('in_transit');
  });

  test('Delivered sets delivered_at, notifies the learner and the batch turns Delivered once all are', async () => {
    await s.service.updateItem(9, 1, { status: 'delivered', receiverName: '', proofKey: null, remarks: '' });
    expect(s.db.credential_dispatch_batches.rows[0]?.status).toBe('in_progress');
    await s.service.updateItem(9, 2, { status: 'delivered', receiverName: '', proofKey: null, remarks: '' });
    expect(s.db.credential_dispatch_batches.rows[0]?.status).toBe('delivered');
    expect(s.db.credential_delivery_items.rows[0]?.delivered_at).toEqual(NOW);
    expect(s.db.credential_notifications.rows.filter((n) => n.title === 'Document delivered')).toHaveLength(2);
    expect(s.db.credential_delivery_events.rows.filter((e) => e.action === 'Update delivery')).toHaveLength(2);
  });

  test('a proof key outside the credentials folder is refused', async () => {
    await s.service.updateItem(9, 1, { status: 'delivered', receiverName: '', proofKey: null, remarks: '' });
    const r = await s.service.updateItem(9, 1, { status: 'handed_over', receiverName: 'R', proofKey: '../../etc/passwd', remarks: '' });
    expect(r.message).toMatch(/proof file/);
  });

  test('Lost -> Duplicate logs the event once and queues a fresh print item', async () => {
    await s.service.updateItem(9, 1, { status: 'lost', receiverName: '', proofKey: null, remarks: 'Courier lost it' });
    expect((await s.service.duplicateLostItem(9, 1, ' ')).message).toMatch(/reason/);
    expect((await s.service.duplicateLostItem(9, 2, 'x')).message).toMatch(/lost copy/);
    expect((await s.service.duplicateLostItem(9, 1, 'Parcel lost in transit')).status).toBe(1);
    expect(s.db.credential_document_events.rows.some((e) => e.action === 'Duplicate' && e.copy_type === 'duplicate')).toBe(true);
    expect(s.db.credential_delivery_items.rows.filter((i) => i.document_id === 1 && i.status === 'print_queued')).toHaveLength(1);
    expect((await s.service.duplicateLostItem(9, 1, 'again')).message).toMatch(/already in the print queue/);
  });

  test('overview flags overdue parcels and builds the courier tracking link', async () => {
    const later = new CredentialDeliveryService({ prisma: s.db as never, now: () => new Date('2026-11-30T00:00:00Z') });
    const out = await later.overview();
    const row = out.data?.items.find((i) => i.id === 1);
    expect(row?.overdue).toBe(true);
    expect(row?.trackingUrl).toBe('https://track.example/AWB1');
    expect(row?.nextStatuses).toContain('in_transit');
    expect(out.data?.items.find((i) => i.id === 4)?.nextStatuses).toEqual([]);
  });
});

describe('centre scoping', () => {
  let s: ReturnType<typeof setup>;
  let batchId = 0;
  beforeEach(async () => {
    s = setup();
    batchId = await packedBatch(s);
    await s.service.generatePackingList(9, batchId);
    await s.service.dispatchBatch(9, batchId);
  });

  test('the overview shows only the caller\'s own centre', async () => {
    const mine = await s.service.centreOverview(500);
    expect(mine.data?.documents.map((d) => d.id).sort()).toEqual([1, 2, 4]);
    expect(mine.data?.parcels).toHaveLength(1);
    const other = await s.service.centreOverview(600);
    expect(other.data?.documents.map((d) => d.id)).toEqual([3]);
    expect(other.data?.parcels).toEqual([]);
  });

  test('a non-centre user or a learner gets nothing', async () => {
    expect((await s.service.centreOverview(2)).status).toBe(0);
    expect((await s.service.acknowledgeParcel(2, batchId, 'X')).status).toBe(0);
  });

  test('another centre cannot acknowledge, hand over, or read documents and proofs', async () => {
    expect((await s.service.acknowledgeParcel(600, batchId, 'Intruder')).message).toBe('Parcel not found.');
    expect((await s.service.handOver(600, 1, 'R', PROOF)).status).toBe(0);
    expect((await s.service.documentFileUrl(1, 6)).status).toBe(0);
    expect((await s.service.documentFileUrl(1, 5)).status).toBe(1);
  });

  test('acknowledge needs a receiver, marks items Delivered, then the centre can hand over with proof', async () => {
    expect((await s.service.acknowledgeParcel(500, batchId, ' ')).message).toMatch(/Receiver/);
    expect((await s.service.handOver(500, 1, 'Learner', PROOF)).message).toMatch(/Acknowledge the parcel/);
    expect((await s.service.acknowledgeParcel(500, batchId, 'Centre receiver')).status).toBe(1);
    expect(s.db.credential_delivery_items.rows.slice(0, 2).map((i) => i.status)).toEqual(['delivered', 'delivered']);
    expect((await s.service.acknowledgeParcel(500, batchId, 'Again')).message).toMatch(/already/);
    const parcels = (await s.service.centreOverview(500)).data?.parcels;
    expect(parcels?.[0]?.receivedBy).toBe('Centre receiver');
    expect((await s.service.handOver(500, 1, 'Learner', null)).message).toMatch(/ID photo/);
    expect((await s.service.handOver(500, 1, ' ', PROOF)).message).toMatch(/Receiver/);
    expect((await s.service.handOver(500, 1, 'Learner', PROOF)).status).toBe(1);
    expect(s.db.credential_delivery_items.rows[0]).toMatchObject({ status: 'handed_over', received_by_name: 'Learner', proof_key: PROOF });
    const handovers = (await s.service.centreOverview(500)).data?.handovers ?? [];
    expect(handovers.find((h) => h.id === 2)?.canHandOver).toBe(true);
    expect(handovers.find((h) => h.id === 1)?.canHandOver).toBe(false);
  });

  test('the centre cannot use the admin-only transitions', async () => {
    await s.service.acknowledgeParcel(500, batchId, 'R');
    const r = await s.service.updateItem(500, 1, { status: 'lost', receiverName: '', proofKey: null, remarks: 'x' }, { centreId: 5 });
    expect(r.status).toBe(0);
  });
});

describe('notifications and scan alert review', () => {
  test('notifyCredential dedupes by key + audience + recipient and never throws', async () => {
    const { db } = setup();
    const n = { key: 'issued:1', audience: 'learner' as const, recipientUserId: 7, title: 'Document issued' };
    expect(await notifyCredential(n, db as never)).toBe(true);
    expect(await notifyCredential(n, db as never)).toBe(false);
    expect(await notifyCredential({ ...n, recipientUserId: 8 }, db as never)).toBe(true);
    expect(await notifyCredential({ ...n, audience: 'centre', centreId: 5 }, db as never)).toBe(true);
    expect(db.credential_notifications.rows).toHaveLength(3);
    expect(await notifyCredential(n, {} as never)).toBe(false);
  });

  test('alert review needs a note, works once only and records user, time and note', async () => {
    const { db } = setup();
    db.credential_scan_alerts.seed({ id: 1, alert_key: 'k', type: 'revoked_scan', document_id: 1, created_at: NOW, reviewed_at: null });
    const scans = new CredentialScansService(db as never, () => NOW);
    expect((await scans.review(9, 1, '  ')).message).toBe('Add a review note.');
    expect((await scans.review(9, 1, 'Checked with learner')).status).toBe(1);
    expect(db.credential_scan_alerts.rows[0]).toMatchObject({ reviewed_by: 9, reviewed_at: NOW, note: 'Checked with learner' });
    expect((await scans.review(9, 1, 'again')).message).toMatch(/already reviewed/);
    expect((await scans.review(9, 99, 'x')).message).toBe('Alert not found.');
  });
});
