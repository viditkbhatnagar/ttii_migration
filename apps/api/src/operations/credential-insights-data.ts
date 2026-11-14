import { getPrismaClient } from '../data/prisma-client.js';
import {
  centreNames, courseTitles, enrolmentNumbers, loadCouriers, loadDeliverySettings, loadScopeOfferingIds, userNames, type Db,
} from './credential-delivery-reads.js';
import { DELIVERY_MODES, type DeliveryMode, type DeliverySettingsData } from './credential-types.js';
import { isItemStatus } from './credential-delivery-model.js';
import type { ItemStatus } from './credential-types.js';

// Credential Manager — the shared, read-only dataset behind the Dashboard and
// the Reports. Loaded once per request, then every KPI / report row is derived
// from it by the pure functions in credential-dashboard.ts / credential-reports.ts.

export interface ReadyCandidate {
  enrolId: number;
  enrolmentNo: string;
  learner: string;
  course: string;
  batch: string;
  centreId: number | null;
  centre: string;
  /** YYYY-MM-DD */
  completionDate: string;
  daysWaiting: number;
  holdReasons: string[];
}

/**
 * Where the "Ready to issue" list comes from. The eligibility module owns that
 * computation (rules, holds, overrides); it registers itself here. Until it
 * does, Ready-based figures are reported as unavailable instead of invented.
 */
export type ReadyProvider = () => Promise<ReadyCandidate[]>;
let readyProvider: ReadyProvider | null = null;
export function registerReadyProvider(provider: ReadyProvider | null): void { readyProvider = provider; }

export interface DocFact {
  id: number; enrolId: number; enrolmentNo: string; learner: string; courseId: number | null; course: string; batch: string;
  centreId: number | null; centre: string; docType: string; version: number; documentNo: string; verificationId: string;
  status: string; issueDate: string; issuedAt: Date; issuedBy: string; completionDate: string | null; offeringId: number | null;
}
export interface ItemFact {
  id: number; documentId: number; status: ItemStatus; batchId: number | null; batchNo: string; courier: string;
  dispatchedAt: Date | null; deliveredAt: Date | null;
}
export interface DocEventFact {
  id: number; documentId: number; action: string; copyType: string; reason: string; beforeStatus: string; afterStatus: string; user: string; at: Date;
}
export interface ScanFact {
  id: number; at: Date; verificationId: string; documentId: number | null; status: string; method: string; country: string;
}
export interface AlertFact { id: number; type: string; details: string; createdAt: Date; documentId: number | null; reviewedAt: Date | null }
export interface HoldFact { id: number; learner: string; course: string; centre: string; reason: string; placedAt: Date; placedBy: string }

export interface InsightsData {
  now: Date;
  settings: DeliverySettingsData;
  docs: DocFact[];
  items: ItemFact[];
  docEvents: DocEventFact[];
  scans: ScanFact[];
  alerts: AlertFact[];
  holds: HoldFact[];
  /** null = the eligibility module is not connected. */
  ready: ReadyCandidate[] | null;
  /** Resolved delivery mode per document id (centre override -> offering default -> digital). */
  modes: Map<number, DeliveryMode>;
}

const EVENT_LIMIT = 20_000;
const SCAN_LIMIT = 20_000;

function completionOf(snapshot: string): string | null {
  try {
    const value = JSON.parse(snapshot) as Record<string, unknown>;
    const raw = value.completionDate ?? value.completion_date;
    return typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : null;
  } catch {
    return null;
  }
}

function isMode(value: string): value is DeliveryMode {
  return (DELIVERY_MODES as readonly string[]).includes(value);
}

export async function loadInsightsData(db: Db = getPrismaClient(), now: Date = new Date()): Promise<InsightsData> {
  const [settings, scope] = await Promise.all([loadDeliverySettings(db), loadScopeOfferingIds(db)]);
  const rawDocs = (await db.credential_documents.findMany({ orderBy: { id: 'desc' } }))
    .filter((d) => d.offering_id !== null && scope.has(d.offering_id));
  const docIds = rawDocs.map((d) => d.id);
  const inDocs = { in: docIds };
  const [courses, centres, enrolNos, people, offerings, offeringSettings, rawItems, rawEvents, rawScans, rawAlerts, couriers] = await Promise.all([
    courseTitles(db, rawDocs.map((d) => d.course_id)),
    centreNames(db, rawDocs.map((d) => d.centre_id)),
    enrolmentNumbers(db, rawDocs.map((d) => d.enrol_id)),
    userNames(db, rawDocs.map((d) => d.issued_by)),
    docIds.length ? db.offerings.findMany({ where: { id: { in: [...new Set(rawDocs.map((d) => d.offering_id).filter((v): v is number => v !== null))] } }, select: { id: true, title: true } }) : [],
    db.credential_offering_settings.findMany({ where: { issued_by_ttii: true }, select: { offering_id: true, default_delivery_mode: true } }),
    docIds.length ? db.credential_delivery_items.findMany({ where: { document_id: inDocs } }) : [],
    docIds.length ? db.credential_document_events.findMany({ where: { document_id: inDocs }, orderBy: { id: 'desc' }, take: EVENT_LIMIT }) : [],
    db.credential_scans.findMany({ orderBy: { id: 'desc' }, take: SCAN_LIMIT }),
    db.credential_scan_alerts.findMany({ orderBy: { id: 'desc' }, take: 5000 }),
    loadCouriers(db),
  ]);
  const offeringTitle = new Map(offerings.map((o) => [o.id, o.title ?? '']));
  const offeringMode = new Map(offeringSettings.map((o) => [o.offering_id, o.default_delivery_mode]));
  const eventUsers = await userNames(db, rawEvents.map((e) => e.actor_user_id));
  const batchIds = [...new Set(rawItems.map((i) => i.batch_id).filter((v): v is number => v !== null))];
  const batches = batchIds.length ? await db.credential_dispatch_batches.findMany({ where: { id: { in: batchIds } } }) : [];
  const batchOf = new Map(batches.map((b) => [b.id, b]));
  const courierName = new Map(couriers.map((c) => [c.id, c.name]));

  const docs: DocFact[] = rawDocs.map((d) => ({
    id: d.id, enrolId: d.enrol_id, enrolmentNo: enrolNos.get(d.enrol_id) ?? '', learner: d.printed_name, courseId: d.course_id,
    course: d.course_id ? courses.get(d.course_id) ?? '' : '', batch: d.offering_id ? offeringTitle.get(d.offering_id) ?? '' : '',
    centreId: d.centre_id, centre: d.centre_id ? centres.get(d.centre_id) ?? '' : '', docType: d.doc_type, version: d.version,
    documentNo: d.document_no, verificationId: d.verification_id, status: d.status, issueDate: d.issue_date.toISOString().slice(0, 10),
    issuedAt: d.created_at, issuedBy: d.issued_by ? people.get(d.issued_by) ?? '' : '', completionDate: completionOf(d.snapshot), offeringId: d.offering_id,
  }));
  const modes = new Map<number, DeliveryMode>();
  for (const d of rawDocs) {
    const centreMode = d.centre_id ? settings.centreModes[String(d.centre_id)] : undefined;
    const offeringDefault = d.offering_id ? offeringMode.get(d.offering_id) ?? '' : '';
    modes.set(d.id, centreMode && isMode(centreMode) ? centreMode : isMode(offeringDefault) ? offeringDefault : 'digital');
  }
  const items: ItemFact[] = rawItems.flatMap((i) => {
    if (!isItemStatus(i.status)) return [];
    const batch = i.batch_id ? batchOf.get(i.batch_id) : undefined;
    return [{
      id: i.id, documentId: i.document_id, status: i.status, batchId: i.batch_id, batchNo: batch?.batch_no ?? '',
      courier: batch?.courier_id ? courierName.get(batch.courier_id) ?? '' : '', dispatchedAt: batch?.dispatched_at ?? null, deliveredAt: i.delivered_at,
    }];
  });
  const docSet = new Set(docIds);
  const scans: ScanFact[] = rawScans
    .filter((s) => s.document_id === null || docSet.has(s.document_id))
    .map((s) => ({ id: s.id, at: s.created_at, verificationId: s.verification_id, documentId: s.document_id, status: s.status, method: s.method, country: s.country || 'Unknown' }));
  const alerts: AlertFact[] = rawAlerts
    .filter((a) => a.document_id === null || docSet.has(a.document_id))
    .map((a) => ({ id: a.id, type: a.type, details: a.details ?? '', createdAt: a.created_at, documentId: a.document_id, reviewedAt: a.reviewed_at }));
  const docEvents: DocEventFact[] = rawEvents.map((e) => ({
    id: e.id, documentId: e.document_id, action: e.action, copyType: e.copy_type ?? '', reason: e.reason ?? '', beforeStatus: e.before_status ?? '',
    afterStatus: e.after_status ?? '', user: e.actor_user_id ? eventUsers.get(e.actor_user_id) ?? '' : 'System', at: e.created_at,
  }));
  return { now, settings, docs, items, docEvents, scans, alerts, holds: await loadHolds(db), ready: await loadReady(), modes };
}

async function loadReady(): Promise<ReadyCandidate[] | null> {
  if (!readyProvider) return null;
  return readyProvider();
}

async function loadHolds(db: Db): Promise<HoldFact[]> {
  const holds = await db.credential_holds.findMany({ where: { released_at: null }, orderBy: { id: 'desc' } });
  if (holds.length === 0) return [];
  const enrols = await db.enrol.findMany({ where: { id: { in: [...new Set(holds.map((h) => h.enrol_id))] } }, select: { id: true, user_id: true, course_id: true } });
  const enrolOf = new Map(enrols.map((e) => [e.id, e]));
  const users = await db.users.findMany({ where: { id: { in: enrols.map((e) => e.user_id).filter((v): v is number => v !== null) } }, select: { id: true, name: true, added_under_centre: true } });
  const userOf = new Map(users.map((u) => [u.id, u]));
  const [courses, centres, people] = await Promise.all([
    courseTitles(db, enrols.map((e) => e.course_id)), centreNames(db, users.map((u) => u.added_under_centre)), userNames(db, holds.map((h) => h.placed_by)),
  ]);
  return holds.map((h) => {
    const enrol = enrolOf.get(h.enrol_id);
    const user = enrol?.user_id ? userOf.get(enrol.user_id) : undefined;
    return {
      id: h.id, learner: user?.name ?? '', course: enrol?.course_id ? courses.get(enrol.course_id) ?? '' : '',
      centre: user?.added_under_centre ? centres.get(user.added_under_centre) ?? '' : '', reason: h.reason, placedAt: h.placed_at,
      placedBy: h.placed_by ? people.get(h.placed_by) ?? '' : '',
    };
  });
}
