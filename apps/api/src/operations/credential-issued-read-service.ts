import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { fail, guarded, isoOf, ok, userNames, ymdOf, type Outcome } from './credential-common.js';
import { CredentialEligibilityService, type ReadyRow } from './credential-eligibility-service.js';
import { parseSnapshot } from './credential-issue-model.js';
import { DOC_TYPE_LABEL, parseConfigData, type CourierData, type DocType } from './credential-types.js';

// Credential Manager — read side of the issued documents: the Issued page, its detail
// panel, and the learner's "My Certificates".

const ITEM_LABEL: Record<string, string> = {
  print_queued: 'Print queued', printed: 'Printed', packed: 'Packed', dispatched: 'Dispatched', in_transit: 'In transit', delivered: 'Delivered',
  collected: 'Collected', handed_over: 'Handed over', returned: 'Returned', address_issue: 'Address issue', lost: 'Lost',
};
export const itemLabel = (status: string): string => ITEM_LABEL[status] ?? status;

export interface IssuedRow {
  id: number;
  documentNo: string;
  verificationId: string;
  docType: string;
  docTypeLabel: string;
  version: number;
  learner: string;
  enrolmentNo: string;
  enrolId: number;
  course: string;
  batch: string;
  centre: string;
  centreId: number | null;
  offeringId: number | null;
  issueDate: string;
  status: 'valid' | 'revoked' | 'superseded';
  issuedBy: string;
  deliveryStatus: string;
  scanCount: number;
  lastScanned: string;
  replacesId: number | null;
  replacedById: number | null;
  hasPdf: boolean;
}

export interface IssuedDetail {
  row: IssuedRow;
  versions: IssuedRow[];
  linked: IssuedRow[];
  events: Array<{ id: number; action: string; copyType: string; reason: string; user: string; at: string; before: string; after: string }>;
  scans: Array<{ id: number; at: string; country: string; city: string; device: string; method: string; status: string }>;
  deliveryHistory: Array<{ id: number; at: string; user: string; action: string; before: string; after: string; reason: string }>;
  fields: Record<string, string>;
  publicUrl: string;
}

export interface LearnerDocument {
  id: number;
  docType: string;
  docTypeLabel: string;
  documentNo: string;
  verificationId: string;
  status: 'valid' | 'revoked' | 'superseded';
  learner: string;
  course: string;
  issueDate: string;
  physicalStatus: string;
  firstDownloadAt: string;
  trackingUrl: string;
  awbNo: string;
  hasPdf: boolean;
}

export interface LearnerPending {
  enrolId: number;
  course: string;
  status: ReadyRow['status'];
  label: string;
  message: string;
  holdReasons: string[];
  nameConfirmed: boolean;
  printedName: string;
  address: string;
  defaultName: string;
  canConfirm: boolean;
}

export interface LearnerCredentials { documents: LearnerDocument[]; pending: LearnerPending[] }

const HTTPS = /^https:\/\//i;

export class CredentialIssuedReadService {
  constructor(
    private readonly prisma: PrismaClient = getPrismaClient(),
    private readonly eligibility: CredentialEligibilityService = new CredentialEligibilityService(prisma),
    private readonly origin = 'https://learn.teachersindia.in',
  ) {}

  private async inScopeOfferings(): Promise<number[]> {
    const rows = await this.prisma.credential_offering_settings.findMany({ where: { issued_by_ttii: true }, select: { offering_id: true } });
    return rows.map((r) => r.offering_id);
  }

  private async deliveryByDoc(ids: number[]): Promise<Map<number, { status: string; batchId: number | null }>> {
    const items = ids.length > 0 ? await this.prisma.credential_delivery_items.findMany({ where: { document_id: { in: ids } }, orderBy: { id: 'asc' } }) : [];
    const out = new Map<number, { status: string; batchId: number | null }>();
    for (const i of items) out.set(i.document_id, { status: i.status, batchId: i.batch_id });
    return out;
  }

  private toRows(
    docs: Awaited<ReturnType<PrismaClient['credential_documents']['findMany']>>,
    names: Map<number, string>,
    delivery: Map<number, { status: string; batchId: number | null }>,
  ): IssuedRow[] {
    return docs.map((d): IssuedRow => {
      const snap = parseSnapshot(d.snapshot);
      return {
        id: d.id, documentNo: d.document_no, verificationId: d.verification_id, docType: d.doc_type, docTypeLabel: DOC_TYPE_LABEL[d.doc_type as DocType] ?? d.doc_type,
        version: d.version, learner: d.printed_name, enrolmentNo: snap?.enrolmentNo ?? '', enrolId: d.enrol_id, course: snap?.programme ?? '', batch: snap?.batch ?? '',
        centre: snap?.centre ?? '', centreId: d.centre_id, offeringId: d.offering_id, issueDate: ymdOf(d.issue_date), status: d.status as IssuedRow['status'],
        issuedBy: d.issued_by ? names.get(d.issued_by) ?? '' : '', deliveryStatus: delivery.has(d.id) ? itemLabel(delivery.get(d.id)?.status ?? '') : 'Digital',
        scanCount: d.scan_count, lastScanned: isoOf(d.last_scanned_at), replacesId: d.replaces_id, replacedById: d.replaced_by_id, hasPdf: d.storage_key !== null,
      };
    });
  }

  list(): Promise<Outcome<{ rows: IssuedRow[] }>> {
    return guarded(async () => {
      const scope = await this.inScopeOfferings();
      const docs = await this.prisma.credential_documents.findMany({ where: { offering_id: { in: scope } }, orderBy: [{ issue_date: 'desc' }, { id: 'desc' }] });
      const [names, delivery] = await Promise.all([userNames(this.prisma, docs.map((d) => d.issued_by)), this.deliveryByDoc(docs.map((d) => d.id))]);
      return ok({ rows: this.toRows(docs, names, delivery) });
    });
  }

  detail(id: number): Promise<Outcome<IssuedDetail>> {
    return guarded(async () => {
      const scope = await this.inScopeOfferings();
      const doc = await this.prisma.credential_documents.findFirst({ where: { id, offering_id: { in: scope } } });
      if (!doc) return fail('Document not found.');
      const [siblings, events, scans] = await Promise.all([
        this.prisma.credential_documents.findMany({ where: { enrol_id: doc.enrol_id }, orderBy: [{ doc_type: 'asc' }, { version: 'asc' }] }),
        this.prisma.credential_document_events.findMany({ where: { document_id: id }, orderBy: { id: 'desc' } }),
        this.prisma.credential_scans.findMany({ where: { document_id: id }, orderBy: { id: 'desc' }, take: 100 }),
      ]);
      const items = await this.prisma.credential_delivery_items.findMany({ where: { document_id: id }, select: { id: true } });
      const dEvents = items.length > 0
        ? await this.prisma.credential_delivery_events.findMany({ where: { entity_type: 'item', entity_id: { in: items.map((i) => i.id) } }, orderBy: { id: 'desc' } })
        : [];
      const names = await userNames(this.prisma, [...siblings.map((d) => d.issued_by), ...events.map((e) => e.actor_user_id), ...dEvents.map((e) => e.actor_user_id)]);
      const delivery = await this.deliveryByDoc(siblings.map((d) => d.id));
      const rows = this.toRows(siblings, names, delivery);
      const row = rows.find((r) => r.id === id) as IssuedRow;
      const snap = parseSnapshot(doc.snapshot);
      return ok({
        row,
        versions: rows.filter((r) => r.docType === doc.doc_type),
        linked: rows.filter((r) => r.docType !== doc.doc_type),
        events: events.map((e) => ({ id: e.id, action: e.action, copyType: e.copy_type ?? '', reason: e.reason ?? '', user: e.actor_user_id ? names.get(e.actor_user_id) ?? '' : '', at: isoOf(e.created_at), before: e.before_status ?? '', after: e.after_status ?? '' })),
        scans: scans.map((s) => ({ id: s.id, at: isoOf(s.created_at), country: s.country ?? 'Unknown', city: s.city ?? 'Unknown', device: s.device ?? 'Unknown', method: s.method, status: s.status })),
        deliveryHistory: dEvents.map((e) => ({ id: e.id, at: isoOf(e.created_at), user: e.actor_user_id ? names.get(e.actor_user_id) ?? '' : '', action: e.action, before: e.before_status ?? '', after: e.after_status ?? '', reason: e.reason ?? '' })),
        fields: {
          'Learner (printed)': doc.printed_name, 'Enrolment no.': snap?.enrolmentNo ?? '', Programme: snap?.programme ?? '', Batch: snap?.batch ?? '', Centre: snap?.centre ?? '',
          'Exam session': snap?.examSession ?? '', CGPA: snap?.cgpa ?? '', Grade: snap?.grade ?? '', Result: snap?.result ?? '', Template: snap?.template.name ?? '',
        },
        publicUrl: `${this.origin}/v/${encodeURIComponent(doc.verification_id)}`,
      });
    });
  }

  // ── Learner ────────────────────────────────────────────────────────────────
  private trackingUrl(pattern: string, awb: string): string {
    if (!awb || !pattern) return '';
    const url = pattern.replace(/\{awb\}/gi, encodeURIComponent(awb));
    return HTTPS.test(url) ? url : '';
  }

  forLearner(userId: number): Promise<Outcome<LearnerCredentials>> {
    return guarded(async () => {
      const docs = await this.prisma.credential_documents.findMany({ where: { user_id: userId }, orderBy: { id: 'desc' } });
      const live = docs.filter((d) => d.status !== 'superseded');
      const ids = live.map((d) => d.id);
      const [digital, items] = await Promise.all([
        ids.length > 0 ? this.prisma.credential_digital_deliveries.findMany({ where: { document_id: { in: ids } } }) : Promise.resolve([]),
        ids.length > 0 ? this.prisma.credential_delivery_items.findMany({ where: { document_id: { in: ids } }, orderBy: { id: 'asc' } }) : Promise.resolve([]),
      ]);
      const batchIds = [...new Set(items.map((i) => i.batch_id).filter((v): v is number => v !== null))];
      const batches = batchIds.length > 0 ? await this.prisma.credential_dispatch_batches.findMany({ where: { id: { in: batchIds } } }) : [];
      const courierIds = [...new Set(batches.map((b) => b.courier_id).filter((v): v is number => v !== null))];
      const couriers = courierIds.length > 0 ? await this.prisma.credential_config.findMany({ where: { id: { in: courierIds } } }) : [];
      const documents = live.map((d): LearnerDocument => {
        const snap = parseSnapshot(d.snapshot);
        const item = items.find((i) => i.document_id === d.id);
        const batch = item?.batch_id ? batches.find((b) => b.id === item.batch_id) : undefined;
        const courier = batch?.courier_id ? couriers.find((c) => c.id === batch.courier_id) : undefined;
        const pattern = parseConfigData<CourierData>(courier?.data, { trackingUrlPattern: '' }).trackingUrlPattern;
        return {
          id: d.id, docType: d.doc_type, docTypeLabel: DOC_TYPE_LABEL[d.doc_type as DocType] ?? d.doc_type, documentNo: d.document_no, verificationId: d.verification_id,
          status: d.status as LearnerDocument['status'], learner: d.printed_name, course: snap?.programme ?? '', issueDate: ymdOf(d.issue_date),
          physicalStatus: item ? itemLabel(item.status) : 'Digital only', firstDownloadAt: isoOf(digital.find((x) => x.document_id === d.id)?.first_download_at),
          trackingUrl: this.trackingUrl(pattern, batch?.awb_no ?? ''), awbNo: batch?.awb_no ?? '', hasPdf: true,
        };
      });

      const evaluated = await this.eligibility.evaluate({ userId });
      const pending = evaluated.filter((e) => e.status !== 'Issued').map((e): LearnerPending => {
        const label = e.status === 'Not Eligible' ? 'Not eligible yet' : e.status === 'On Hold' ? 'On Hold' : 'Being processed';
        const message = e.status === 'Not Eligible'
          ? e.failure
          : e.status === 'On Hold' ? e.activeHolds.map((h) => h.reason).join(', ')
            : e.status === 'Ready' ? 'Ready for issue' : 'Course completion pending';
        return {
          enrolId: e.candidate.enrolId, course: e.candidate.courseTitle, status: e.status, label, message, holdReasons: e.activeHolds.map((h) => h.reason),
          nameConfirmed: e.printedName !== '' && e.address !== '', printedName: e.printedName, address: e.address, defaultName: e.candidate.learnerName, canConfirm: e.status === 'Ready',
        };
      });
      return ok({ documents, pending });
    });
  }

  /** The learner's own valid document (for download); null when it is not theirs or not valid. */
  async learnerDocument(userId: number, id: number): Promise<{ id: number } | null> {
    const doc = await this.prisma.credential_documents.findFirst({ where: { id, user_id: userId, status: 'valid' }, select: { id: true } });
    return doc ?? null;
  }

  /** The document exists and belongs to a TTII-issued offering. */
  async isVisible(id: number): Promise<boolean> {
    const doc = await this.prisma.credential_documents.findUnique({ where: { id }, select: { offering_id: true } });
    return doc !== null && (await this.inScopeOfferings()).includes(doc.offering_id ?? -1);
  }

  async markFirstDownload(id: number): Promise<void> {
    await this.prisma.credential_digital_deliveries.updateMany({ where: { document_id: id, first_download_at: null }, data: { first_download_at: new Date() } });
  }
}
