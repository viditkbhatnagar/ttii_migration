import { createHash, randomBytes } from 'node:crypto';

import type { Prisma, PrismaClient } from '@prisma/client';
import QRCode from 'qrcode';

import { getPrismaClient } from '../data/prisma-client.js';
import type { EmailProvider, StorageProvider } from '../integrations/contracts.js';
import { CREDENTIAL_EMAIL_SUBJECT, renderCredentialReadyEmail } from '../integrations/credential-emails.js';
import { designFor, fileDesignAssets, isPdf, type CredentialDesignAssets } from '../integrations/credential-design-assets.js';
import { renderDesignedCredential, type DesignId, type DesignInput } from '../integrations/credential-design-pdf.js';
import { renderCredentialPdf, type CredentialPdfInput } from '../integrations/credential-pdf.js';
import { CredentialEligibilityService, type Evaluated } from './credential-eligibility-service.js';
import { ISSUE_ERRORS, issueGateError, type GateEnrolment } from './credential-eligibility-model.js';
import {
  DEFAULT_SERIES_PREFIX, actionRefusal, correctionDocumentNo, formatDocumentNo, newVerificationId, parseSnapshot, publicUrl,
  type CredentialSnapshot,
} from './credential-issue-model.js';
import { dateOnly, dmy, emitCredentialNotice, fail, guarded, istToday, notify, ok, ymdOf, type Outcome } from './credential-common.js';
import {
  DOC_TYPE_LABEL, parseConfigData, type DeliveryMode, type DeliverySettingsData, type DocType, type SignatoryData, type TemplateData,
  DEFAULT_DELIVERY_SETTINGS,
} from './credential-types.js';

// Credential Manager — issuing, PDFs and the actions on an issued document.
// Everything that decides is in credential-eligibility-model.ts / credential-issue-model.ts (pure).

type Tx = Prisma.TransactionClient;
const TX_OPTIONS = { maxWait: 10_000, timeout: 120_000 } as const;
const VERIFICATION_RETRIES = 8;

export interface IssuedDoc { id: number; enrolId: number; docType: string; documentNo: string; verificationId: string; learner: string }
export interface IssueResult { issued: IssuedDoc[]; pdfFailures: number; emailsSent: number }

/** One request renders, stores and emails every document; keep it inside the proxy timeout. */
export const MAX_ISSUE_BATCH = 50;

interface ResolvedTemplate { id: number | null; name: string; version: number | null; data: TemplateData | null }

export interface CredentialIssueOptions {
  storage?: StorageProvider;
  email?: EmailProvider;
  now?: () => Date;
  origin?: string;
  eligibility?: CredentialEligibilityService;
  /** TTII's design artwork and fonts (default: CREDENTIAL_ASSETS_DIR on disk). */
  assets?: CredentialDesignAssets;
}

const randomHex = (): string => randomBytes(16).toString('hex');
const sanitise = (v: string): string => v.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'doc';
const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? '';

export class CredentialIssueService {
  private readonly eligibility: CredentialEligibilityService;
  private emailProvider: EmailProvider | null;
  private readonly assets: CredentialDesignAssets;

  constructor(
    readonly prisma: PrismaClient = getPrismaClient(),
    private readonly options: CredentialIssueOptions = {},
  ) {
    this.eligibility = options.eligibility ?? new CredentialEligibilityService(prisma, options.now ? { now: options.now } : {});
    this.emailProvider = options.email ?? null;
    this.assets = options.assets ?? fileDesignAssets();
  }

  private now(): Date { return this.options.now?.() ?? new Date(); }
  private today(): string { return istToday(this.now()); }
  private url(verificationId: string): string { return publicUrl(verificationId, this.options.origin); }

  // ── Templates, signatories, delivery mode ──────────────────────────────────
  /** Offering-bound template, else the offering's level template, else the built-in layout. */
  async resolveTemplate(offeringId: number, docType: string, today: string, level: string | null): Promise<ResolvedTemplate> {
    const rows = await this.prisma.credential_config.findMany({
      where: { category: 'template', deleted_at: null, is_active: true, OR: [{ offering_id: offeringId }, { offering_id: null }] },
    });
    const usable = rows
      .map((r) => ({ r, data: parseConfigData<TemplateData>(r.data, { docType: 'certificate', level: null, fields: [], signatoryIds: [], backContent: '', backgroundKey: null }) }))
      .filter((x) => x.data.docType === docType && (x.r.effective_from === null || ymdOf(x.r.effective_from) <= today));
    const newest = (list: typeof usable) => [...list].sort((a, b) => ymdOf(b.r.effective_from).localeCompare(ymdOf(a.r.effective_from)) || b.r.version - a.r.version)[0];
    const pick = newest(usable.filter((x) => x.r.offering_id === offeringId))
      ?? (level ? newest(usable.filter((x) => x.r.offering_id === null && x.data.level === level)) : undefined);
    return pick ? { id: pick.r.id, name: pick.r.name, version: pick.r.version, data: pick.data } : { id: null, name: 'TTII layout', version: null, data: null };
  }

  /** Signatories valid on the date; limited to the template's list when a template is bound. */
  private async signatoriesFor(db: PrismaClient | Tx, ids: number[] | null, date: string): Promise<Array<{ id: number; name: string; designation: string; signatureKey: string | null }>> {
    const rows = await db.credential_config.findMany({
      where: { category: 'signatory', deleted_at: null, is_active: true, ...(ids ? { id: { in: ids } } : {}) },
      orderBy: { id: 'asc' },
    });
    return rows
      .map((r) => ({ r, d: parseConfigData<SignatoryData>(r.data, { designation: '', validFrom: '', validTo: null, signatureKey: null }) }))
      .filter(({ d }) => (d.validFrom === '' || d.validFrom <= date) && (!d.validTo || d.validTo >= date))
      .map(({ r, d }) => ({ id: r.id, name: r.name, designation: d.designation, signatureKey: d.signatureKey }));
  }

  private async deliveryModeFor(offeringId: number, centreId: number | null): Promise<DeliveryMode> {
    const [settings, row] = await Promise.all([
      this.prisma.credential_config.findFirst({ where: { category: 'delivery', deleted_at: null }, select: { data: true } }),
      this.prisma.credential_offering_settings.findUnique({ where: { offering_id: offeringId }, select: { default_delivery_mode: true } }),
    ]);
    const data = parseConfigData<DeliverySettingsData>(settings?.data, DEFAULT_DELIVERY_SETTINGS);
    const override = centreId ? data.centreModes?.[String(centreId)] : undefined;
    return (override ?? (row?.default_delivery_mode as DeliveryMode | undefined) ?? 'digital');
  }

  // ── Issue ──────────────────────────────────────────────────────────────────
  issue(actor: number | null, enrolIds: number[], docTypes: string[]): Promise<Outcome<IssueResult>> {
    return guarded(async () => {
      if (enrolIds.length > MAX_ISSUE_BATCH) return fail(`Issue at most ${MAX_ISSUE_BATCH} learners at a time.`);
      const evaluated = await this.eligibility.evaluate({ enrolIds });
      const byEnrol = new Map(evaluated.map((e) => [e.candidate.enrolId, e]));
      const gate = new Map<number, GateEnrolment>(enrolIds.map((id): [number, GateEnrolment] => {
        const e = byEnrol.get(id);
        return [id, { enrolId: id, status: e ? e.status : 'Missing', existingTypes: e ? e.docs.map((d) => d.docType) : [] }];
      }));
      const refusal = issueGateError(enrolIds, docTypes, gate);
      if (refusal) return fail(refusal);

      const today = this.today();
      const courseIds = [...new Set(evaluated.map((e) => e.candidate.courseId))];
      const [settings, courses] = await Promise.all([
        this.prisma.credential_offering_settings.findMany({ where: { offering_id: { in: [...new Set(evaluated.map((e) => e.candidate.offeringId))] } }, select: { offering_id: true, level: true } }),
        this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, duration: true } }),
      ]);
      const levelOf = new Map(settings.map((s) => [s.offering_id, s.level]));
      const durationOf = new Map(courses.map((c) => [c.id, (c.duration ?? '').trim()]));

      const plans: Array<{ e: Evaluated; docType: DocType; template: ResolvedTemplate; signatoryIds: number[]; mode: DeliveryMode; snapshot: CredentialSnapshot }> = [];
      for (const id of enrolIds) {
        const e = byEnrol.get(id) as Evaluated;
        const level = levelOf.get(e.candidate.offeringId) ?? null;
        const mode = await this.deliveryModeFor(e.candidate.offeringId, e.candidate.centreId);
        for (const docType of docTypes as DocType[]) {
          const template = await this.resolveTemplate(e.candidate.offeringId, docType, today, level);
          const sigs = await this.signatoriesFor(this.prisma, template.data ? template.data.signatoryIds : null, today);
          plans.push({
            e, docType, template, mode, signatoryIds: sigs.map((s) => s.id),
            snapshot: this.buildSnapshot(e, docType, level ?? '', durationOf.get(e.candidate.courseId) ?? '', template, sigs, today),
          });
        }
      }

      let created: Array<{ id: number; plan: (typeof plans)[number]; documentNo: string; verificationId: string }> = [];
      try {
        created = await this.prisma.$transaction(async (tx) => {
          const out: typeof created = [];
          for (const plan of plans) {
            const { e, docType } = plan;
            // Re-check inside the transaction: another call may have issued meanwhile.
            const clash = await tx.credential_documents.findFirst({ where: { enrol_id: e.candidate.enrolId, doc_type: docType }, select: { id: true } });
            if (clash) throw new IssueRefusal(`A ${DOC_TYPE_LABEL[docType].toLowerCase()} already exists. Use Correction for a new version.`);
            const documentNo = await this.allocateNumber(tx, docType, today);
            const verificationId = await this.uniqueVerificationId(tx);
            const row = await tx.credential_documents.create({
              data: {
                enrol_id: e.candidate.enrolId, user_id: e.candidate.userId, offering_id: e.candidate.offeringId, course_id: e.candidate.courseId, centre_id: e.candidate.centreId,
                doc_type: docType, version: 1, document_no: documentNo, verification_id: verificationId, status: 'valid', issue_date: dateOnly(today),
                printed_name: plan.snapshot.printedName.slice(0, 250), snapshot: JSON.stringify(plan.snapshot), issued_by: actor, updated_at: this.now(),
              },
            });
            await tx.credential_document_events.create({ data: { document_id: row.id, action: 'Issue', reason: 'Requirements reviewed', before_status: null, after_status: 'valid', actor_user_id: actor } });
            await this.createDelivery(tx, row.id, e.candidate.enrolId, plan.mode, actor);
            await notify(tx, { key: `issued:${row.id}`, audience: 'learner', recipientUserId: e.candidate.userId, title: 'Document issued', body: `${DOC_TYPE_LABEL[docType]} ${documentNo}`, link: '/student/certificates' });
            out.push({ id: row.id, plan, documentNo, verificationId });
          }
          return out;
        }, TX_OPTIONS);
      } catch (error: unknown) {
        if (error instanceof IssueRefusal) return fail(error.message);
        if ((error as { code?: string }).code === 'P2002') {
          const target = JSON.stringify((error as { meta?: { target?: unknown } }).meta?.target ?? '');
          if (target.includes('doc_no') || target.includes('document_no')) {
            return fail('The next document number is already in use. Check Settings > Number Series and set the next number above the last one issued.');
          }
          return fail('A document already exists. Use Correction for a new version.');
        }
        throw error;
      }

      for (const c of created) emitCredentialNotice('issue', { id: c.id, userId: c.plan.e.candidate.userId, documentNo: c.documentNo });
      // After the commit: PDFs (a failure keeps the document; "Regenerate PDF" retries), then the learner emails.
      let pdfFailures = 0;
      for (const c of created) {
        if (!(await this.renderAndStore(c.id))) pdfFailures += 1;
      }
      const emailsSent = await this.emailLearners(created.map((c) => ({ id: c.id, userId: c.plan.e.candidate.userId, enrolId: c.plan.e.candidate.enrolId })), false);
      return ok({
        issued: created.map((c) => ({ id: c.id, enrolId: c.plan.e.candidate.enrolId, docType: c.plan.docType, documentNo: c.documentNo, verificationId: c.verificationId, learner: c.plan.snapshot.printedName })),
        pdfFailures,
        emailsSent,
      }, 'Documents issued.');
    });
  }

  private buildSnapshot(
    e: Evaluated, docType: DocType, level: string, durationText: string, template: ResolvedTemplate,
    sigs: Array<{ id: number; name: string; designation: string; signatureKey: string | null }>, today: string,
  ): CredentialSnapshot {
    const c = e.candidate;
    const credits = e.academic.subjects.length > 0 && e.academic.subjects.every((s) => s.credits !== null)
      ? e.academic.subjects.reduce((s, r) => s + (r.credits ?? 0), 0) : null;
    return {
      learner: c.learnerName,
      printedName: e.printedName || c.learnerName,
      enrolmentNo: c.enrolmentNo,
      programme: c.courseTitle,
      batch: c.offeringTitle,
      centre: c.centre,
      level,
      durationText,
      creditsTotal: credits,
      cgpa: e.academic.cgpa,
      grade: e.academic.grade,
      result: e.academic.result,
      examSession: c.examSession,
      completionDate: c.completionDate,
      subjects: e.academic.subjects,
      gradingName: e.academic.gradingName,
      ruleVersion: e.rule?.version ?? null,
      template: { id: template.id, name: template.name, version: template.version, docType },
      signatoryIds: sigs.map((s) => s.id),
      layout: {
        fields: template.data?.fields ?? [],
        backgroundKey: template.data?.backgroundKey ?? null,
        signatories: sigs.map((s) => ({ name: s.name, designation: s.designation, signatureKey: s.signatureKey })),
        design: designFor(docType, level),
      },
      parentName: c.profile?.parentName ?? '',
      dateOfBirth: c.profile?.dateOfBirth ?? '',
      centreCode: c.profile?.centreCode ?? '',
      academicSession: c.profile?.academicSession ?? '',
      cgpaScale: e.academic.cgpaScale ?? 10,
      issueDate: today,
      generatedAt: this.now().toISOString(),
    };
  }

  /** Atomic number allocation: the UPDATE row-locks the series, so concurrent issues get distinct numbers. */
  private async allocateNumber(tx: Tx, docType: DocType, today: string): Promise<string> {
    const year = Number(today.slice(0, 4));
    let series = await tx.credential_number_series.findUnique({ where: { doc_type: docType } });
    if (!series) {
      try {
        series = await tx.credential_number_series.create({ data: { doc_type: docType, prefix: DEFAULT_SERIES_PREFIX[docType], year, padding: 6, next_number: 1, reset_yearly: true, updated_at: this.now() } });
      } catch {
        series = await tx.credential_number_series.findUnique({ where: { doc_type: docType } });
      }
    }
    if (!series) throw new Error('Number series unavailable.');
    if (series.reset_yearly && series.year !== year) {
      await tx.credential_number_series.updateMany({ where: { id: series.id, year: { not: year } }, data: { year, next_number: 1, updated_at: this.now() } });
    }
    const updated = await tx.credential_number_series.update({ where: { id: series.id }, data: { next_number: { increment: 1 }, updated_at: this.now() } });
    return formatDocumentNo(updated.prefix, updated.year, updated.next_number - 1, updated.padding);
  }

  private async uniqueVerificationId(tx: Tx): Promise<string> {
    for (let i = 0; i < VERIFICATION_RETRIES; i += 1) {
      const id = newVerificationId();
      if (!(await tx.credential_documents.findUnique({ where: { verification_id: id }, select: { id: true } }))) return id;
    }
    throw new Error('Could not allocate a verification ID.');
  }

  private async createDelivery(tx: Tx, documentId: number, enrolId: number, mode: DeliveryMode, actor: number | null): Promise<void> {
    await tx.credential_digital_deliveries.create({ data: { document_id: documentId, available_at: this.now() } });
    if (mode !== 'digital') {
      const item = await tx.credential_delivery_items.create({ data: { document_id: documentId, enrol_id: enrolId, status: 'print_queued', updated_at: this.now() } });
      await tx.credential_delivery_events.create({ data: { entity_type: 'item', entity_id: item.id, action: 'Print queued', before_status: null, after_status: 'print_queued', actor_user_id: actor } });
    }
  }

  // ── PDF ────────────────────────────────────────────────────────────────────
  private async fetchImage(key: string | null | undefined): Promise<Buffer | null> {
    const storage = this.options.storage;
    if (!key || !storage?.downloadObject) return null;
    try { return await storage.downloadObject(key); } catch { return null; }
  }

  /** Renders the document deterministically from its immutable snapshot (+ the template and signatories it recorded). */
  /** Layout for a snapshot written before `layout` was frozen: read the live template / signatories. */
  private async liveLayout(snap: CredentialSnapshot): Promise<NonNullable<CredentialSnapshot['layout']>> {
    const templateRow = snap.template.id ? await this.prisma.credential_config.findUnique({ where: { id: snap.template.id } }) : null;
    const template = templateRow ? parseConfigData<TemplateData>(templateRow.data, { docType: 'certificate', level: null, fields: [], signatoryIds: [], backContent: '', backgroundKey: null }) : null;
    const sigRows = snap.signatoryIds.length > 0
      ? await this.prisma.credential_config.findMany({ where: { id: { in: snap.signatoryIds }, category: 'signatory' }, orderBy: { id: 'asc' } })
      : [];
    return {
      fields: template?.fields ?? [],
      backgroundKey: template?.backgroundKey ?? null,
      signatories: sigRows.map((r) => {
        const d = parseConfigData<SignatoryData>(r.data, { designation: '', validFrom: '', validTo: null, signatureKey: null });
        return { name: r.name, designation: d.designation, signatureKey: d.signatureKey };
      }),
    };
  }

  async renderPdf(documentId: number, copyLabel?: string): Promise<Buffer | null> {
    const doc = await this.prisma.credential_documents.findUnique({ where: { id: documentId } });
    const snap = doc ? parseSnapshot(doc.snapshot) : null;
    if (!doc || !snap) return null;
    const layout = snap.layout ?? await this.liveLayout(snap);
    const signatories = await Promise.all(layout.signatories.map(async (sg) => ({ name: sg.name, designation: sg.designation, image: await this.fetchImage(sg.signatureKey) })));
    const url = this.url(doc.verification_id);
    const qrPng = await QRCode.toBuffer(url, { margin: 1, width: 256, errorCorrectionLevel: 'M' });
    const background = await this.fetchImage(layout.backgroundKey);
    const designed = await this.renderDesign(doc, snap, layout.design ?? null, background, signatories[0]?.image ?? null, qrPng, copyLabel);
    if (designed) return designed;
    const input: CredentialPdfInput = {
      docType: doc.doc_type as CredentialPdfInput['docType'],
      documentNo: doc.document_no,
      verificationId: doc.verification_id,
      issueDate: dmy(ymdOf(doc.issue_date)),
      printedName: doc.printed_name,
      enrolmentNo: snap.enrolmentNo,
      programme: snap.programme,
      level: snap.level,
      durationText: snap.durationText,
      creditsTotal: snap.creditsTotal,
      cgpa: snap.cgpa,
      grade: snap.grade,
      result: snap.result,
      examSession: snap.examSession,
      subjects: snap.subjects,
      fields: layout.fields,
      backgroundImage: isPdf(background) ? null : background,
      signatories,
      qrPng,
      publicUrl: url,
      templateLabel: snap.template.version ? `Template: ${snap.template.name} v${snap.template.version}` : 'TTII layout',
      ...(copyLabel ? { copyLabel } : {}),
    };
    return renderCredentialPdf(input);
  }

  /**
   * TTII's Illustrator design, when the document has one: the template's uploaded PDF artwork if
   * it is a PDF, else the design's default artwork on disk. Null (built-in layout) when there is
   * no design, the template's background is a PNG/JPG, or the artwork or fonts are missing.
   */
  private async renderDesign(
    doc: { doc_type: string; document_no: string; issue_date: Date | null; printed_name: string },
    snap: CredentialSnapshot, design: DesignId | null, background: Buffer | null, signature: Buffer | null, qrPng: Buffer, copyLabel?: string,
  ): Promise<Buffer | null> {
    if (!design || (background && !isPdf(background))) return null;
    const [artwork, fonts] = await Promise.all([isPdf(background) ? Promise.resolve(background) : this.assets.artwork(design), this.assets.fonts()]);
    if (!artwork || !fonts) return null;
    const input: DesignInput = {
      docType: doc.doc_type as DesignInput['docType'],
      documentNo: doc.document_no,
      issueDate: dmy(ymdOf(doc.issue_date)),
      printedName: doc.printed_name,
      enrolmentNo: snap.enrolmentNo,
      programme: snap.programme,
      durationText: snap.durationText,
      creditsTotal: snap.creditsTotal,
      cgpa: snap.cgpa,
      cgpaScale: snap.cgpaScale ?? 10,
      grade: snap.grade,
      examSession: snap.examSession,
      parentName: snap.parentName ?? '',
      dateOfBirth: snap.dateOfBirth ?? '',
      centreCode: snap.centreCode ?? '',
      academicSession: snap.academicSession ?? '',
      subjects: snap.subjects.map((s) => ({
        code: s.code, title: s.title, credits: s.credits, grade: s.grade, points: s.points,
        // Older snapshots carry the percentage only: print it out of 100.
        maxMarks: s.maxMarks ?? 100,
        obtained: s.obtained ?? s.total,
      })),
      qrPng,
      signature,
      ...(copyLabel ? { copyLabel } : {}),
    };
    const title = `${DOC_TYPE_LABEL[doc.doc_type as DocType] ?? 'Credential'} ${doc.document_no}`;
    try {
      return await renderDesignedCredential(design, artwork, input, fonts, title);
    } catch {
      // A malformed uploaded PDF: the built-in layout still produces the document.
      return null;
    }
  }

  /** Renders, stores privately and records the key + sha256. False when anything fails (the document stays). */
  async renderAndStore(documentId: number): Promise<boolean> {
    const storage = this.options.storage;
    if (!storage) return false;
    try {
      const doc = await this.prisma.credential_documents.findUnique({ where: { id: documentId }, select: { doc_type: true, document_no: true, storage_key: true } });
      const pdf = await this.renderPdf(documentId);
      if (!doc || !pdf) return false;
      const key = `credentials/${doc.doc_type}/${sanitise(doc.document_no)}-${randomHex()}.pdf`;
      await storage.uploadObject({ key, body: pdf, contentType: 'application/pdf' });
      await this.prisma.credential_documents.update({ where: { id: documentId }, data: { storage_key: key, sha256: createHash('sha256').update(pdf).digest('hex'), updated_at: this.now() } });
      if (doc.storage_key && doc.storage_key !== key) await storage.deleteObject({ key: doc.storage_key }).catch(() => undefined);
      return true;
    } catch {
      return false;
    }
  }

  /** The stored PDF; rendered (and stored) on the fly when the key is missing. */
  async pdfBytes(documentId: number): Promise<{ bytes: Buffer; fileName: string } | null> {
    const doc = await this.prisma.credential_documents.findUnique({ where: { id: documentId }, select: { storage_key: true, document_no: true } });
    if (!doc) return null;
    const storage = this.options.storage;
    let bytes: Buffer | null = null;
    if (doc.storage_key && storage?.downloadObject) {
      try { bytes = await storage.downloadObject(doc.storage_key); } catch { bytes = null; }
    }
    if (!bytes) {
      await this.renderAndStore(documentId);
      bytes = await this.renderPdf(documentId);
    }
    return bytes ? { bytes, fileName: `${sanitise(doc.document_no)}.pdf` } : null;
  }

  // ── Email ──────────────────────────────────────────────────────────────────
  private async mailer(): Promise<EmailProvider> {
    if (!this.emailProvider) {
      const { createIntegrationRegistry } = await import('../integrations/registry.js');
      this.emailProvider = createIntegrationRegistry().email;
    }
    return this.emailProvider;
  }

  /** One email per learner covering the given documents; records email_status on each digital delivery. */
  async emailLearners(docs: Array<{ id: number; userId: number; enrolId: number }>, resend: boolean): Promise<number> {
    let sent = 0;
    const byUser = new Map<number, number[]>();
    for (const d of docs) byUser.set(d.userId, [...(byUser.get(d.userId) ?? []), d.id]);
    for (const [userId, ids] of byUser) {
      let status: 'sent' | 'failed' = 'failed';
      try {
        const [user, rows] = await Promise.all([
          this.prisma.users.findUnique({ where: { id: userId }, select: { name: true, user_email: true, email: true } }),
          this.prisma.credential_documents.findMany({ where: { id: { in: ids } } }),
        ]);
        const to = (user?.user_email ?? '').trim() || (user?.email ?? '').trim();
        if (to.includes('@') && rows.length > 0) {
          const snap = parseSnapshot(rows[0]?.snapshot ?? '');
          await (await this.mailer()).sendEmail({
            to,
            subject: CREDENTIAL_EMAIL_SUBJECT(resend),
            html: renderCredentialReadyEmail({
              learnerFirstName: firstName(user?.name ?? ''),
              programme: snap?.programme ?? '',
              documents: rows.map((r) => ({ label: DOC_TYPE_LABEL[r.doc_type as DocType] ?? r.doc_type, documentNo: r.document_no })),
              issueDate: dmy(ymdOf(rows[0]?.issue_date)),
              resend,
            }),
          });
          status = 'sent';
          sent += 1;
        }
      } catch {
        status = 'failed';
      }
      await this.prisma.credential_digital_deliveries.updateMany({
        where: { document_id: { in: ids } },
        data: { email_status: status, email_sent_at: status === 'sent' ? this.now() : null },
      }).catch(() => undefined);
    }
    return sent;
  }

  // ── Actions on an issued version ───────────────────────────────────────────
  private async load(id: number) {
    return this.prisma.credential_documents.findUnique({ where: { id } });
  }

  private async inScope(offeringId: number | null): Promise<boolean> {
    if (!offeringId) return false;
    const s = await this.prisma.credential_offering_settings.findUnique({ where: { offering_id: offeringId }, select: { issued_by_ttii: true } });
    return s?.issued_by_ttii === true;
  }

  private async event(db: PrismaClient | Tx, documentId: number, action: string, actor: number | null, extra: { reason?: string; copyType?: 'original' | 'duplicate'; before?: string; after?: string } = {}) {
    return db.credential_document_events.create({
      data: { document_id: documentId, action, copy_type: extra.copyType ?? null, reason: extra.reason ?? null, before_status: extra.before ?? null, after_status: extra.after ?? null, actor_user_id: actor },
    });
  }

  /** Duplicate copy / Print Original: log the event; the route then streams the PDF (see duplicateLabel). */
  recordCopy(actor: number | null, id: number, kind: 'duplicate' | 'print', reason: string): Promise<Outcome<{ eventId: number }>> {
    return guarded(async () => {
      const doc = await this.load(id);
      if (!doc || !(await this.inScope(doc.offering_id))) return fail('Document not found.');
      const refusal = actionRefusal(kind, doc.status, reason);
      if (refusal) return fail(refusal);
      const ev = await this.event(this.prisma, id, kind === 'duplicate' ? 'Duplicate' : 'Print', actor, { reason: reason.trim(), copyType: kind === 'duplicate' ? 'duplicate' : 'original', before: doc.status, after: doc.status });
      if (kind === 'duplicate') {
        await notify(this.prisma, { key: `duplicate:${ev.id}`, audience: 'learner', recipientUserId: doc.user_id, title: 'Credential duplicate', body: `${doc.document_no}: ${reason.trim()}`, link: '/student/certificates' });
      }
      if (kind === 'duplicate') emitCredentialNotice('duplicate', { id, userId: doc.user_id, documentNo: doc.document_no });
      return ok({ eventId: ev.id }, kind === 'duplicate' ? 'Duplicate copy recorded.' : 'PDF downloaded for printing; Original copy event recorded.');
    });
  }

  /** The PDF behind a recorded duplicate event, carrying the DUPLICATE mark dated by the event. */
  async duplicatePdf(id: number, eventId: number): Promise<{ bytes: Buffer; fileName: string } | null> {
    const ev = await this.prisma.credential_document_events.findFirst({ where: { id: eventId, document_id: id, action: 'Duplicate' } });
    const doc = await this.load(id);
    if (!ev || !doc) return null;
    const day = istToday(ev.created_at);
    const bytes = await this.renderPdf(id, `DUPLICATE - issued on ${dmy(day)}`);
    return bytes ? { bytes, fileName: `${sanitise(doc.document_no)}-duplicate.pdf` } : null;
  }

  /** Duplicate copy for a valid document (also the Lost -> Duplicate hook of the delivery side). */
  issueDuplicateCopy(documentId: number, reason: string, actorId: number | null): Promise<Outcome<{ eventId: number }>> {
    return this.recordCopy(actorId, documentId, 'duplicate', reason);
  }

  logDownload(actor: number | null, id: number): Promise<unknown> {
    return this.event(this.prisma, id, 'Download', actor, { copyType: 'original' });
  }

  revoke(actor: number | null, id: number, reason: string): Promise<Outcome> {
    return this.statusChange(actor, id, reason, 'revoke');
  }

  restore(actor: number | null, id: number, reason: string): Promise<Outcome> {
    return this.statusChange(actor, id, reason, 'restore');
  }

  private statusChange(actor: number | null, id: number, reason: string, action: 'revoke' | 'restore'): Promise<Outcome> {
    return guarded(async () => {
      const doc = await this.load(id);
      if (!doc || !(await this.inScope(doc.offering_id))) return fail('Document not found.');
      const refusal = actionRefusal(action, doc.status, reason);
      if (refusal) return fail(refusal);
      const from = action === 'revoke' ? 'valid' : 'revoked';
      const to = action === 'revoke' ? 'revoked' : 'valid';
      const at = this.now();
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.credential_documents.updateMany({
          where: { id, status: from },
          data: { status: to, revoked_at: action === 'revoke' ? at : null, revoke_reason: action === 'revoke' ? reason.trim() : null, updated_at: at },
        });
        if (claimed.count === 0) throw new IssueRefusal('The document status changed. Reload and try again.');
        await this.event(tx, id, action === 'revoke' ? 'Revoke' : 'Restore', actor, { reason: reason.trim(), before: from, after: to });
        await notify(tx, { key: `${action}:${id}:${at.getTime()}`, audience: 'learner', recipientUserId: doc.user_id, title: action === 'revoke' ? 'Credential revoked' : 'Credential restored', body: doc.document_no, link: '/student/certificates' });
      }).catch((e: unknown) => { if (e instanceof IssueRefusal) return; throw e; });
      const fresh = await this.load(id);
      if (fresh?.status === to) emitCredentialNotice(action, { id, userId: doc.user_id, documentNo: doc.document_no });
      return fresh?.status === to ? ok(undefined, action === 'revoke' ? 'Document revoked.' : 'Document restored.') : fail('The document status changed. Reload and try again.');
    });
  }

  correction(actor: number | null, id: number, reason: string, correctedName: string): Promise<Outcome<{ id: number; documentNo: string; verificationId: string }>> {
    return guarded(async () => {
      const doc = await this.load(id);
      if (!doc || !(await this.inScope(doc.offering_id))) return fail('Document not found.');
      const refusal = actionRefusal('correction', doc.status, reason, { correctedName });
      if (refusal) return fail(refusal);
      const snap = parseSnapshot(doc.snapshot);
      if (!snap) return fail('The document snapshot is unreadable.');
      const name = correctedName.trim().slice(0, 250);
      const today = this.today();
      const at = this.now();
      let created: { id: number; documentNo: string; verificationId: string } | null = null;
      try {
        created = await this.prisma.$transaction(async (tx) => {
          const claimed = await tx.credential_documents.updateMany({ where: { id, status: 'valid' }, data: { status: 'superseded', updated_at: at } });
          if (claimed.count === 0) throw new IssueRefusal('The document status changed. Reload and try again.');
          const documentNo = correctionDocumentNo(doc.document_no, doc.version);
          const verificationId = await this.uniqueVerificationId(tx);
          const newSnap: CredentialSnapshot = { ...snap, printedName: name, issueDate: today, generatedAt: at.toISOString() };
          const row = await tx.credential_documents.create({
            data: {
              enrol_id: doc.enrol_id, user_id: doc.user_id, offering_id: doc.offering_id, course_id: doc.course_id, centre_id: doc.centre_id, doc_type: doc.doc_type,
              version: doc.version + 1, document_no: documentNo, verification_id: verificationId, status: 'valid', issue_date: dateOnly(today),
              printed_name: name, snapshot: JSON.stringify(newSnap), replaces_id: doc.id, issued_by: actor, updated_at: at,
            },
          });
          await tx.credential_documents.update({ where: { id }, data: { replaced_by_id: row.id } });
          await this.event(tx, id, 'Correction', actor, { reason: reason.trim(), before: 'valid', after: 'superseded' });
          await this.event(tx, row.id, 'Issue', actor, { reason: `Correction of ${doc.document_no}: ${reason.trim()}`, after: 'valid' });
          const mode = await this.deliveryModeFor(doc.offering_id ?? 0, doc.centre_id);
          await this.createDelivery(tx, row.id, doc.enrol_id, mode, actor);
          await notify(tx, { key: `correction:${row.id}`, audience: 'learner', recipientUserId: doc.user_id, title: 'Credential corrected', body: `${DOC_TYPE_LABEL[doc.doc_type as DocType] ?? doc.doc_type} ${documentNo}`, link: '/student/certificates' });
          return { id: row.id, documentNo, verificationId };
        }, TX_OPTIONS);
      } catch (error: unknown) {
        if (error instanceof IssueRefusal) return fail(error.message);
        throw error;
      }
      emitCredentialNotice('correction', { id: created.id, userId: doc.user_id, documentNo: created.documentNo });
      await this.renderAndStore(created.id);
      await this.emailLearners([{ id: created.id, userId: doc.user_id, enrolId: doc.enrol_id }], false);
      return ok(created, 'Corrected version issued.');
    });
  }

  resend(actor: number | null, id: number): Promise<Outcome> {
    return guarded(async () => {
      const doc = await this.load(id);
      if (!doc || !(await this.inScope(doc.offering_id))) return fail('Document not found.');
      const refusal = actionRefusal('resend', doc.status, '');
      if (refusal) return fail(refusal);
      const sent = await this.emailLearners([{ id, userId: doc.user_id, enrolId: doc.enrol_id }], true);
      await this.event(this.prisma, id, 'Resend', actor, { reason: sent > 0 ? 'Email sent' : 'Email could not be sent', before: doc.status, after: doc.status });
      await notify(this.prisma, { key: `resend:${id}:${this.now().getTime()}`, audience: 'learner', recipientUserId: doc.user_id, title: 'Credential download link', body: doc.document_no, link: '/student/certificates' });
      return ok(undefined, sent > 0 ? 'Email sent and portal notification created.' : 'Portal notification sent. The email could not be sent (no valid address or sender not configured).');
    });
  }

  regenerate(actor: number | null, id: number): Promise<Outcome> {
    return guarded(async () => {
      const doc = await this.load(id);
      if (!doc || !(await this.inScope(doc.offering_id))) return fail('Document not found.');
      const done = await this.renderAndStore(id);
      if (!done) return fail('The PDF could not be generated. Check storage and try again.');
      await this.event(this.prisma, id, 'Regenerate', actor, { reason: 'PDF regenerated', before: doc.status, after: doc.status });
      return ok(undefined, 'PDF regenerated.');
    });
  }
}

/** A refusal raised inside a transaction (rolls everything back, surfaces as a plain refusal). */
class IssueRefusal extends Error {}

export { ISSUE_ERRORS };

/** Standalone entry for callers that do not hold the service (delivery side). */
export function issueDuplicateCopy(documentId: number, reason: string, actorId: number | null): Promise<Outcome<{ eventId: number }>> {
  return new CredentialIssueService().issueDuplicateCopy(documentId, reason, actorId);
}
