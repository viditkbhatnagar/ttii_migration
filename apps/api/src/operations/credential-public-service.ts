import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { fail, guarded, notify, ok, ymdOf, type Outcome } from './credential-common.js';
import {
  alertCandidates, deviceClass, normaliseVerificationId, parseSnapshot, publicProjection,
  type PublicResult, type ScanLite, type ScanStatus,
} from './credential-issue-model.js';

// Credential Manager — public verification (spec §1.8, §6.1-6.2). Every lookup is a scan row,
// found or not; the response is the privacy-safe projection only.

export interface LookupContext {
  method: 'qr' | 'manual';
  ip: string;
  userAgent: string;
}

const MATCHING: Record<string, string> = { certificate: 'marksheet', marksheet: 'certificate', provisional: 'marksheet' };
const LABEL: Record<string, string> = { certificate: 'Certificate', marksheet: 'Marksheet', provisional: 'Provisional Certificate' };

export class CredentialPublicService {
  constructor(private readonly prisma: PrismaClient = getPrismaClient(), private readonly now: () => Date = () => new Date()) {}

  lookup(rawId: string, ctx: LookupContext): Promise<Outcome<PublicResult>> {
    return guarded(async () => {
      const verificationId = normaliseVerificationId(rawId);
      if (!verificationId) return fail('Enter a verification ID.');
      const doc = await this.prisma.credential_documents.findUnique({ where: { verification_id: verificationId } });
      // A document row exists only when it was issued in scope; later changes to the
      // offering's "issued by TTII" switch must never make a printed QR stop verifying.
      const found = doc ?? null;
      const status: ScanStatus = found ? (found.status as ScanStatus) : 'not_found';
      const at = this.now();

      const scan = await this.prisma.credential_scans.create({
        data: {
          verification_id: verificationId.slice(0, 80), document_id: found?.id ?? null, status, method: ctx.method,
          ip: ctx.ip.slice(0, 64) || null, user_agent: ctx.userAgent.slice(0, 300) || null, device: deviceClass(ctx.userAgent), city: null, country: null, created_at: at,
        },
      });
      if (found) {
        await this.prisma.credential_documents.update({ where: { id: found.id }, data: { scan_count: { increment: 1 }, last_scanned_at: at } });
      }
      await this.raiseAlerts({ id: scan.id, at, documentId: found?.id ?? null, status, country: null, ip: ctx.ip || null }, verificationId).catch(() => undefined);

      if (!found) return ok({ verificationId, status: 'not_found' as const });
      const snapshot = parseSnapshot(found.snapshot);
      if (!snapshot) return ok({ verificationId, status: 'not_found' as const });
      const replacedBy = found.replaced_by_id ? await this.prisma.credential_documents.findUnique({ where: { id: found.replaced_by_id }, select: { verification_id: true } }) : null;
      const result = publicProjection({
        verificationId: found.verification_id, status: found.status, docType: found.doc_type, documentNo: found.document_no, issueDate: ymdOf(found.issue_date),
        revokedAt: ymdOf(found.revoked_at), replacedByVerificationId: replacedBy?.verification_id ?? '', snapshot,
      });
      if (found.status === 'valid' && MATCHING[found.doc_type]) {
        const related = await this.prisma.credential_documents.findFirst({ where: { enrol_id: found.enrol_id, doc_type: MATCHING[found.doc_type] as string, status: 'valid' }, select: { verification_id: true, doc_type: true } });
        if (related) result.related = { verificationId: related.verification_id, docType: related.doc_type, docTypeLabel: LABEL[related.doc_type] ?? related.doc_type };
      }
      return ok(result);
    });
  }

  private async raiseAlerts(scan: ScanLite, verificationId: string): Promise<void> {
    const dayStart = new Date(Date.UTC(scan.at.getUTCFullYear(), scan.at.getUTCMonth(), scan.at.getUTCDate()));
    const sameIp = scan.status === 'not_found' && scan.ip
      ? await this.prisma.credential_scans.findMany({ where: { ip: scan.ip, status: 'not_found', created_at: { gte: dayStart, lte: scan.at } }, select: { id: true, created_at: true, document_id: true, status: true, country: true, ip: true } })
      : [];
    const history: ScanLite[] = [
      scan,
      ...sameIp.filter((s) => s.id !== scan.id).map((s) => ({ id: s.id, at: s.created_at, documentId: s.document_id, status: s.status as ScanStatus, country: s.country, ip: s.ip })),
    ];
    for (const alert of alertCandidates(scan, history, verificationId)) {
      try {
        await this.prisma.credential_scan_alerts.create({ data: { alert_key: alert.key, type: alert.type, document_id: scan.documentId, scan_id: scan.id, details: alert.details } });
      } catch (error: unknown) {
        if ((error as { code?: string }).code === 'P2002') continue; // already raised for this key
        throw error;
      }
      for (const audience of ['credential_admins', 'management'] as const) {
        await notify(this.prisma, { key: `scan-alert:${alert.key}:${audience}`, audience, title: 'Credential scan alert', body: alert.details });
      }
    }
  }
}
