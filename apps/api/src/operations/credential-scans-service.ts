import { getPrismaClient } from '../data/prisma-client.js';
import { courseTitles, loadScopeOfferingIds, userNames, type Db } from './credential-delivery-reads.js';
import { NOT_SET_UP_MESSAGE, isMissingTable } from './credential-types.js';
import type { Outcome } from './credential-delivery-service.js';

// Credential Manager — Scan History and scan alerts (spec §1.5, §6.2). Scans
// and alerts are WRITTEN by the public verification flow; this service reads
// them and records the (once-only, note-required) alert review.

const SCAN_LIMIT = 3000;
const ALERT_LIMIT = 1000;
const UNKNOWN = 'Unknown';

export interface ScanRow {
  id: number; at: string; verificationId: string; documentId: number | null; learner: string; docType: string;
  documentNo: string; course: string; city: string; country: string; device: string; method: string; status: string;
}
export interface AlertRow {
  id: number; type: string; details: string; createdAt: string; documentId: number | null; documentNo: string;
  reviewedBy: string; reviewedAt: string | null; note: string; reviewStatus: 'open' | 'reviewed';
}
export interface ScansOverview {
  ready: boolean; scans: ScanRow[]; alerts: AlertRow[];
  counts: { all: number; openAlerts: number; notFound: number };
}

export const ALERT_TYPE_LABEL: Record<string, string> = {
  revoked_scan: 'Revoked scan', superseded_scan: 'Superseded scan',
  multiple_countries: 'Multiple countries', not_found_attempts: 'Not-found attempts',
};

export class CredentialScansService {
  constructor(private readonly prisma: Db = getPrismaClient(), private readonly now: () => Date = () => new Date()) {}

  async overview(range: { from?: Date | null; to?: Date | null } = {}): Promise<Outcome<ScansOverview>> {
    const empty: ScansOverview = { ready: false, scans: [], alerts: [], counts: { all: 0, openAlerts: 0, notFound: 0 } };
    try {
      const scope = await loadScopeOfferingIds(this.prisma);
      const createdAt = { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lt: range.to } : {}) };
      const rawScans = await this.prisma.credential_scans.findMany({
        where: Object.keys(createdAt).length ? { created_at: createdAt } : {}, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take: SCAN_LIMIT,
      });
      const rawAlerts = await this.prisma.credential_scan_alerts.findMany({ orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take: ALERT_LIMIT });
      const docIds = [...new Set([...rawScans.map((s) => s.document_id), ...rawAlerts.map((a) => a.document_id)].filter((v): v is number => v !== null))];
      const docs = docIds.length ? await this.prisma.credential_documents.findMany({ where: { id: { in: docIds } } }) : [];
      const inScope = new Map(docs.filter((d) => d.offering_id !== null && scope.has(d.offering_id)).map((d) => [d.id, d]));
      const [courses, people] = await Promise.all([
        courseTitles(this.prisma, [...inScope.values()].map((d) => d.course_id)),
        userNames(this.prisma, rawAlerts.map((a) => a.reviewed_by)),
      ]);
      const scans: ScanRow[] = rawScans
        .filter((s) => s.document_id === null || inScope.has(s.document_id))
        .map((s) => {
          const doc = s.document_id ? inScope.get(s.document_id) : undefined;
          return {
            id: s.id, at: s.created_at.toISOString(), verificationId: s.verification_id, documentId: s.document_id,
            learner: doc?.printed_name ?? '-', docType: doc?.doc_type ?? '-', documentNo: doc?.document_no ?? '-',
            course: doc?.course_id ? courses.get(doc.course_id) ?? '-' : '-', city: s.city || UNKNOWN, country: s.country || UNKNOWN,
            device: s.device || UNKNOWN, method: s.method, status: s.status,
          };
        });
      const alerts: AlertRow[] = rawAlerts
        .filter((a) => a.document_id === null || inScope.has(a.document_id))
        .map((a) => ({
          id: a.id, type: a.type, details: a.details ?? '', createdAt: a.created_at.toISOString(), documentId: a.document_id,
          documentNo: a.document_id ? inScope.get(a.document_id)?.document_no ?? '' : '',
          reviewedBy: a.reviewed_by ? people.get(a.reviewed_by) ?? '' : '', reviewedAt: a.reviewed_at ? a.reviewed_at.toISOString() : null,
          note: a.note ?? '', reviewStatus: a.reviewed_at ? 'reviewed' : 'open',
        }));
      return {
        status: 1, message: 'success',
        data: { ready: true, scans, alerts, counts: { all: scans.length, openAlerts: alerts.filter((a) => a.reviewStatus === 'open').length, notFound: scans.filter((s) => s.status === 'not_found').length } },
      };
    } catch (error: unknown) {
      if (isMissingTable(error)) return { status: 1, message: NOT_SET_UP_MESSAGE, data: empty };
      throw error;
    }
  }

  /** Review an alert: note required, once only. Scans are never edited. */
  async review(actor: number | null, alertId: number, note: string): Promise<Outcome> {
    const text = note.trim();
    if (!text) return { status: 0, message: 'Add a review note.' };
    try {
      const alert = await this.prisma.credential_scan_alerts.findUnique({ where: { id: alertId } });
      if (!alert) return { status: 0, message: 'Alert not found.' };
      if (alert.document_id !== null) {
        const scope = await loadScopeOfferingIds(this.prisma);
        const doc = await this.prisma.credential_documents.findUnique({ where: { id: alert.document_id }, select: { offering_id: true } });
        if (!doc || doc.offering_id === null || !scope.has(doc.offering_id)) return { status: 0, message: 'Alert not found.' };
      }
      const claimed = await this.prisma.credential_scan_alerts.updateMany({
        where: { id: alertId, reviewed_at: null }, data: { reviewed_by: actor, reviewed_at: this.now(), note: text },
      });
      if (claimed.count !== 1) return { status: 0, message: 'This alert was already reviewed.' };
      return { status: 1, message: 'Alert reviewed.' };
    } catch (error: unknown) {
      if (isMissingTable(error)) return { status: 0, message: NOT_SET_UP_MESSAGE };
      throw error;
    }
  }
}
