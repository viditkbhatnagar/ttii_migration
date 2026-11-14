import { getPrismaClient } from '../data/prisma-client.js';
import { buildDashboard, type DashboardView } from './credential-dashboard.js';
import { userNames, type Db } from './credential-delivery-reads.js';
import { loadInsightsData, type InsightsData } from './credential-insights-data.js';
import { buildReport, isReportKey, REPORT_KEYS, REPORT_TITLE, type AuditRow, type DateRange, type ReportKey, type ReportResult } from './credential-reports.js';
import { NOT_SET_UP_MESSAGE, isMissingTable } from './credential-types.js';
import type { Outcome } from './credential-delivery-service.js';

// Credential Manager — Dashboard and Reports endpoints' service. Reads only.

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const AUDIT_LIMIT = 5000;

const json = (value: unknown): string => JSON.stringify(value);

export class CredentialInsightsService {
  constructor(private readonly prisma: Db = getPrismaClient(), private readonly now: () => Date = () => new Date()) {}

  async dashboard(): Promise<Outcome<DashboardView & { ready: boolean }>> {
    try {
      const data = await loadInsightsData(this.prisma, this.now());
      return { status: 1, message: 'success', data: { ...buildDashboard(data), ready: true } };
    } catch (error: unknown) {
      if (isMissingTable(error)) {
        const empty = buildDashboard(emptyData(this.now()));
        return { status: 1, message: NOT_SET_UP_MESSAGE, data: { ...empty, ready: false } };
      }
      throw error;
    }
  }

  async report(key: string, range: DateRange): Promise<Outcome<ReportResult & { ready: boolean }>> {
    if (!isReportKey(key)) return { status: 0, message: 'Unknown report.' };
    const clean: DateRange = { from: range.from && YMD.test(range.from) ? range.from : null, to: range.to && YMD.test(range.to) ? range.to : null };
    try {
      const data = await loadInsightsData(this.prisma, this.now());
      const auditRows = key === 'audit' ? await this.auditRows(data) : [];
      return { status: 1, message: 'success', data: { ...buildReport(key, data, clean, auditRows), ready: true } };
    } catch (error: unknown) {
      if (isMissingTable(error)) {
        return { status: 1, message: NOT_SET_UP_MESSAGE, data: { ...buildReport(key, emptyData(this.now()), clean), ready: false } };
      }
      throw error;
    }
  }

  reportList(): Array<{ key: ReportKey; title: string }> {
    return REPORT_KEYS.map((key) => ({ key, title: REPORT_TITLE[key] }));
  }

  /** Settings audit + eligibility events + document events + delivery events + alert reviews, merged. */
  private async auditRows(data: InsightsData): Promise<AuditRow[]> {
    const db = this.prisma;
    const [settings, eligibility, delivery, reviewed] = await Promise.all([
      db.credential_settings_audit.findMany({ orderBy: { id: 'desc' }, take: AUDIT_LIMIT }),
      db.credential_eligibility_events.findMany({ orderBy: { id: 'desc' }, take: AUDIT_LIMIT }),
      db.credential_delivery_events.findMany({ orderBy: { id: 'desc' }, take: AUDIT_LIMIT }),
      db.credential_scan_alerts.findMany({ where: { reviewed_at: { not: null } }, orderBy: { id: 'desc' }, take: AUDIT_LIMIT }),
    ]);
    const people = await userNames(db, [
      ...settings.map((s) => s.actor_user_id), ...eligibility.map((e) => e.actor_user_id), ...delivery.map((e) => e.actor_user_id), ...reviewed.map((a) => a.reviewed_by),
    ]);
    const who = (id: number | null): string => (id ? people.get(id) ?? '' : 'System');
    const docOf = new Map(data.docs.map((d) => [d.id, d]));
    const rows: AuditRow[] = [
      ...settings.map((s): AuditRow => ({ date: s.created_at.toISOString(), user: who(s.actor_user_id), action: s.action, entity: s.entity, record: s.entity_id ? String(s.entity_id) : '', before: s.before_json ?? '', after: s.after_json ?? '' })),
      ...eligibility.map((e): AuditRow => ({ date: e.created_at.toISOString(), user: who(e.actor_user_id), action: e.action, entity: 'Eligibility', record: `Enrolment ${e.enrol_id}`, before: '', after: e.reason ? json({ reason: e.reason }) : '' })),
      ...data.docEvents.map((e): AuditRow => ({ date: e.at.toISOString(), user: e.user, action: e.action, entity: 'Issued document', record: docOf.get(e.documentId)?.documentNo ?? `Document ${e.documentId}`, before: e.beforeStatus ? json({ status: e.beforeStatus }) : '', after: json({ status: e.afterStatus, reason: e.reason, copyType: e.copyType }) })),
      ...delivery.map((e): AuditRow => ({ date: e.created_at.toISOString(), user: who(e.actor_user_id), action: e.action, entity: 'Delivery', record: `${e.entity_type === 'batch' ? 'Batch' : 'Item'} ${e.entity_id}`, before: e.before_status ? json({ value: e.before_status }) : '', after: json({ value: e.after_status ?? '', reason: e.reason ?? '' }) })),
      ...reviewed.map((a): AuditRow => ({ date: (a.reviewed_at ?? a.created_at).toISOString(), user: who(a.reviewed_by), action: 'Review alert', entity: 'Scan alert', record: `Alert ${a.id}`, before: 'Open', after: a.note ?? '' })),
    ];
    return rows;
  }
}

function emptyData(now: Date): InsightsData {
  return {
    now, settings: { overdueDays: 10, readyDays: 3, centreModes: {} }, docs: [], items: [], docEvents: [], scans: [], alerts: [], holds: [], ready: null, modes: new Map(),
  };
}
