import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { loadCandidates, type CandidateFilter, type LmsCandidate } from './credential-lms-adapter.js';
import {
  DEFAULT_GRADING, DEFAULT_GRADING_NAME, bindBatchRule, buildAcademic, daysSince, evaluateEligibility, isIssuedByDocs,
  type Academic, type Criterion, type RuleRow,
} from './credential-eligibility-model.js';
import { fail, guarded, isoOf, istToday, notify, ok, userNames, ymdOf, type Outcome } from './credential-common.js';
import {
  parseConfigData, type EligibilityStatus, type GradingData, type RuleData,
} from './credential-types.js';

// Credential Manager — Ready to Issue: candidates, rule binding, status, holds, override,
// learner confirmation. Settings rows are read straight from credential_config.

const EMPTY_RULE: RuleData = { ruleType: 'Custom', reattempt: 'Latest', autoIssue: false, components: [] };

export interface DocRef { docType: string; status: string; id: number }

export interface Evaluated {
  candidate: LmsCandidate;
  status: EligibilityStatus;
  percent: number;
  failure: string;
  criteria: Criterion[];
  rule: RuleRow | undefined;
  academic: Academic;
  docs: DocRef[];
  activeHolds: Array<{ id: number; reason: string; remarks: string; placedAt: string }>;
  hasOverride: boolean;
  printedName: string;
  address: string;
  confirmedAt: string;
  daysWaiting: number;
}

export interface EligibilityInsightRow {
  enrolId: number;
  learnerName: string;
  centreId: number | null;
  courseTitle: string;
  status: EligibilityStatus;
  readySince: string | null;
}

export interface ReadyRow {
  enrolId: number;
  learner: string;
  enrolmentNo: string;
  course: string;
  courseId: number;
  offeringId: number;
  batch: string;
  centre: string;
  centreId: number | null;
  completionDate: string;
  examSession: string;
  status: EligibilityStatus;
  percent: number;
  failure: string;
  cgpa: string;
  grade: string;
  daysWaiting: number;
  nameConfirmed: boolean;
  printedName: string;
  address: string;
  holdReason: string;
  heldSince: string;
  hasOverride: boolean;
  issuedTypes: string[];
}

export interface ReadyList {
  rows: ReadyRow[];
  counts: Record<'Ready' | 'On Hold' | 'Not Eligible' | 'In Progress', number>;
  readyDays: number;
  holdReasons: string[];
}

export interface EligibilityDetail {
  row: ReadyRow;
  ruleVersion: number | null;
  criteria: Criterion[];
  holds: Array<{ id: number; reason: string; remarks: string; placedBy: string; placedAt: string; releasedBy: string; releasedAt: string }>;
  history: Array<{ id: number; action: string; reason: string; user: string; at: string }>;
  subjects: Academic['subjects'];
}

function ruleRows(rows: Array<{ id: number; offering_id: number | null; version: number; effective_from: Date | null; is_active: boolean; name: string; data: string | null }>): RuleRow[] {
  return rows.map((r) => {
    const data = parseConfigData<RuleData>(r.data, EMPTY_RULE);
    return {
      id: r.id, offeringId: r.offering_id, version: r.version, effectiveFrom: ymdOf(r.effective_from), active: r.is_active, name: r.name,
      data: { ...EMPTY_RULE, ...data, components: Array.isArray(data.components) ? data.components : [] },
    };
  });
}

export class CredentialEligibilityService {
  constructor(
    private readonly prisma: PrismaClient = getPrismaClient(),
    private readonly options: { now?: () => Date; loader?: typeof loadCandidates } = {},
  ) {}

  private today(): string { return istToday(this.options.now?.() ?? new Date()); }

  /** Every in-scope enrolment with its evaluated status (batched: a handful of queries in all). */
  async evaluate(filter: CandidateFilter = {}): Promise<Evaluated[]> {
    const load = this.options.loader ?? loadCandidates;
    const candidates = await load(this.prisma, filter);
    if (candidates.length === 0) return [];
    const enrolIds = candidates.map((c) => c.enrolId);
    const [ruleData, gradingData, holds, states, docs] = await Promise.all([
      this.prisma.credential_config.findMany({ where: { category: 'rule', deleted_at: null }, select: { id: true, offering_id: true, version: true, effective_from: true, is_active: true, name: true, data: true } }),
      this.prisma.credential_config.findMany({ where: { category: 'grading', deleted_at: null, is_active: true }, select: { name: true, data: true } }),
      this.prisma.credential_holds.findMany({ where: { enrol_id: { in: enrolIds }, released_at: null } }),
      this.prisma.credential_learner_state.findMany({ where: { enrol_id: { in: enrolIds } } }),
      this.prisma.credential_documents.findMany({ where: { enrol_id: { in: enrolIds } }, select: { id: true, enrol_id: true, doc_type: true, status: true } }),
    ]);
    const rules = ruleRows(ruleData);
    const gradings = gradingData.map((g) => ({ name: g.name, data: { ...DEFAULT_GRADING, ...parseConfigData<GradingData>(g.data, DEFAULT_GRADING) } }));
    const today = this.today();
    return candidates.map((candidate): Evaluated => {
      const rule = bindBatchRule(rules, candidate.offeringId, candidate.batchStart);
      const grading = gradings.find((g) => Array.isArray(g.data.offeringIds) && g.data.offeringIds.includes(candidate.offeringId));
      const academic = buildAcademic(candidate.facts, {
        reattempt: rule?.data.reattempt ?? 'Latest',
        grading: grading?.data ?? DEFAULT_GRADING,
        gradingName: grading?.name ?? DEFAULT_GRADING_NAME,
        lessonWise: candidate.lessonWise ? { title: candidate.courseTitle } : null,
      });
      const own = holds.filter((h) => h.enrol_id === candidate.enrolId);
      const state = states.find((s) => s.enrol_id === candidate.enrolId);
      const ownDocs = docs.filter((d) => d.enrol_id === candidate.enrolId).map((d) => ({ docType: d.doc_type, status: d.status, id: d.id }));
      const result = evaluateEligibility(
        { issued: isIssuedByDocs(ownDocs), activeHolds: own.length, hasOverride: !!state?.override_at, completionDate: candidate.completionDate, values: academic.values },
        rule, today,
      );
      return {
        candidate, status: result.status, percent: result.percent, failure: result.failure, criteria: result.criteria, rule, academic, docs: ownDocs,
        activeHolds: own.map((h) => ({ id: h.id, reason: h.reason, remarks: h.remarks ?? '', placedAt: isoOf(h.placed_at) })),
        hasOverride: !!state?.override_at,
        printedName: (state?.printed_name ?? '').trim(),
        address: (state?.address ?? '').trim(),
        confirmedAt: isoOf(state?.confirmed_at),
        daysWaiting: daysSince(candidate.completionDate, today),
      };
    });
  }

  private toRow(e: Evaluated): ReadyRow {
    const c = e.candidate;
    const hold = e.activeHolds[0];
    return {
      enrolId: c.enrolId, learner: c.learnerName, enrolmentNo: c.enrolmentNo, course: c.courseTitle, courseId: c.courseId, offeringId: c.offeringId,
      batch: c.offeringTitle, centre: c.centre, centreId: c.centreId, completionDate: c.completionDate, examSession: c.examSession,
      status: e.status, percent: e.percent, failure: e.failure, cgpa: e.academic.cgpa, grade: e.academic.grade, daysWaiting: e.daysWaiting,
      nameConfirmed: e.printedName !== '' && e.address !== '', printedName: e.printedName, address: e.address,
      holdReason: e.activeHolds.map((h) => h.reason).join(', '), heldSince: hold?.placedAt ?? '', hasOverride: e.hasOverride,
      issuedTypes: e.docs.map((d) => d.docType),
    };
  }

  /** Every in-scope enrolment's status for the Dashboard insights; readySince = the date it became Ready (completion date, or the override date). */
  async listEligibilityForInsights(): Promise<EligibilityInsightRow[]> {
    const evaluated = await this.evaluate();
    return evaluated.map((e) => ({
      enrolId: e.candidate.enrolId, learnerName: e.candidate.learnerName, centreId: e.candidate.centreId, courseTitle: e.candidate.courseTitle,
      status: e.status, readySince: e.status === 'Ready' ? (e.candidate.completionDate || null) : null,
    }));
  }

  async holdReasons(): Promise<string[]> {
    const rows = await this.prisma.credential_config.findMany({ where: { category: 'hold_reason', deleted_at: null, is_active: true }, select: { name: true }, orderBy: { name: 'asc' } });
    return rows.map((r) => r.name).filter(Boolean);
  }

  async readyDays(): Promise<number> {
    const row = await this.prisma.credential_config.findFirst({ where: { category: 'delivery', deleted_at: null }, select: { data: true } });
    return parseConfigData<{ readyDays: number }>(row?.data, { readyDays: 3 }).readyDays;
  }

  list(): Promise<Outcome<ReadyList>> {
    return guarded(async () => {
      const [evaluated, holdReasons, readyDays] = await Promise.all([this.evaluate(), this.holdReasons(), this.readyDays()]);
      const rows = evaluated.filter((e) => e.status !== 'Issued').map((e) => this.toRow(e));
      const counts = { Ready: 0, 'On Hold': 0, 'Not Eligible': 0, 'In Progress': 0 };
      for (const r of rows) if (r.status !== 'Issued') counts[r.status] += 1;
      return ok({ rows, counts, readyDays, holdReasons });
    });
  }

  detail(enrolId: number): Promise<Outcome<EligibilityDetail>> {
    return guarded(async () => {
      const [e] = await this.evaluate({ enrolIds: [enrolId] });
      if (!e) return fail('Learner not found.');
      const [holds, events] = await Promise.all([
        this.prisma.credential_holds.findMany({ where: { enrol_id: enrolId }, orderBy: { id: 'desc' } }),
        this.prisma.credential_eligibility_events.findMany({ where: { enrol_id: enrolId }, orderBy: { id: 'desc' } }),
      ]);
      const names = await userNames(this.prisma, [...holds.flatMap((h) => [h.placed_by, h.released_by]), ...events.map((x) => x.actor_user_id)]);
      const name = (id: number | null): string => (id ? names.get(id) ?? `User ${id}` : '');
      return ok({
        row: this.toRow(e),
        ruleVersion: e.rule?.version ?? null,
        criteria: e.criteria,
        subjects: e.academic.subjects,
        holds: holds.map((h) => ({ id: h.id, reason: h.reason, remarks: h.remarks ?? '', placedBy: name(h.placed_by), placedAt: isoOf(h.placed_at), releasedBy: name(h.released_by), releasedAt: isoOf(h.released_at) })),
        history: events.map((x) => ({ id: x.id, action: x.action, reason: x.reason ?? '', user: name(x.actor_user_id), at: isoOf(x.created_at) })),
      });
    });
  }

  private async scoped(enrolId: number): Promise<Evaluated | null> {
    return (await this.evaluate({ enrolIds: [enrolId] }))[0] ?? null;
  }

  placeHold(actor: number | null, enrolId: number, reason: string, remarks: string): Promise<Outcome> {
    return guarded(async () => {
      const why = reason.trim();
      if (!why) return fail('A reason is required.');
      const e = await this.scoped(enrolId);
      if (!e) return fail('Learner not found.');
      if (e.status === 'Issued') return fail('The credential is already issued.');
      const allowed = await this.holdReasons();
      if (allowed.length > 0 && !allowed.includes(why)) return fail('Choose one of the configured hold reasons.');
      const at = new Date();
      await this.prisma.$transaction(async (tx) => {
        await tx.credential_holds.create({ data: { enrol_id: enrolId, reason: why.slice(0, 200), remarks: remarks.trim() || null, placed_by: actor, placed_at: at } });
        await tx.credential_eligibility_events.create({ data: { enrol_id: enrolId, action: 'Place hold', reason: [why, remarks.trim()].filter(Boolean).join(' · '), actor_user_id: actor, created_at: at } });
        await notify(tx, { key: `hold:${enrolId}:${at.getTime()}`, audience: 'learner', recipientUserId: e.candidate.userId, title: 'Credential on hold', body: why, link: '/student/certificates' });
      });
      return ok(undefined, 'Eligibility updated; history retained.');
    });
  }

  releaseHold(actor: number | null, enrolId: number, reason: string, remarks: string): Promise<Outcome> {
    return guarded(async () => {
      if (!reason.trim()) return fail('A reason is required.');
      const e = await this.scoped(enrolId);
      if (!e) return fail('Learner not found.');
      if (e.activeHolds.length === 0) return fail('There is no active hold to release.');
      const at = new Date();
      await this.prisma.$transaction(async (tx) => {
        await tx.credential_holds.updateMany({ where: { enrol_id: enrolId, released_at: null }, data: { released_at: at, released_by: actor } });
        await tx.credential_eligibility_events.create({ data: { enrol_id: enrolId, action: 'Release hold', reason: [reason.trim(), remarks.trim()].filter(Boolean).join(' · '), actor_user_id: actor, created_at: at } });
        await notify(tx, { key: `release:${enrolId}:${at.getTime()}`, audience: 'learner', recipientUserId: e.candidate.userId, title: 'Eligibility updated', body: reason.trim(), link: '/student/certificates' });
      });
      return ok(undefined, 'Eligibility updated; history retained.');
    });
  }

  /** Permission credentials.override is checked by the route. */
  override(actor: number | null, enrolId: number, reason: string, remarks: string): Promise<Outcome> {
    return guarded(async () => {
      if (!reason.trim()) return fail('A reason is required.');
      const e = await this.scoped(enrolId);
      if (!e) return fail('Learner not found.');
      if (e.status === 'Issued') return fail('The credential is already issued.');
      if (e.status === 'Ready') return fail('This learner is already Ready.');
      const at = new Date();
      await this.prisma.$transaction(async (tx) => {
        await tx.credential_learner_state.upsert({
          where: { enrol_id: enrolId },
          create: { enrol_id: enrolId, user_id: e.candidate.userId, offering_id: e.candidate.offeringId, override_reason: reason.trim(), override_by: actor, override_at: at, updated_at: at },
          update: { override_reason: reason.trim(), override_by: actor, override_at: at, updated_at: at },
        });
        await tx.credential_eligibility_events.create({ data: { enrol_id: enrolId, action: 'Override', reason: [reason.trim(), remarks.trim()].filter(Boolean).join(' · '), actor_user_id: actor, created_at: at } });
        await notify(tx, { key: `override:${enrolId}:${at.getTime()}`, audience: 'learner', recipientUserId: e.candidate.userId, title: 'Eligibility updated', body: reason.trim(), link: '/student/certificates' });
      });
      return ok(undefined, 'Eligibility updated; history retained.');
    });
  }

  /** Learner-confirmed printed name and delivery address (only while Ready). */
  confirmDetails(userId: number, enrolId: number, printedName: string, address: string): Promise<Outcome> {
    return guarded(async () => {
      const name = printedName.trim().slice(0, 250);
      const addr = address.trim().slice(0, 2000);
      if (!name || !addr) return fail('Confirm your printed name and delivery address.');
      const e = await this.scoped(enrolId);
      if (!e || e.candidate.userId !== userId) return fail('Enrolment not found.');
      if (e.status !== 'Ready') return fail('Only Ready learners can confirm details.');
      const at = new Date();
      await this.prisma.$transaction(async (tx) => {
        await tx.credential_learner_state.upsert({
          where: { enrol_id: enrolId },
          create: { enrol_id: enrolId, user_id: userId, offering_id: e.candidate.offeringId, printed_name: name, address: addr, confirmed_at: at, updated_at: at },
          update: { printed_name: name, address: addr, confirmed_at: at, updated_at: at },
        });
        await tx.credential_eligibility_events.create({ data: { enrol_id: enrolId, action: 'Name and address confirmed', reason: name, actor_user_id: userId, created_at: at } });
      });
      return ok(undefined, 'Details confirmed.');
    });
  }
}

/** Standalone entry for the Dashboard's Ready / Needs attention / Pending report. */
export function listEligibilityForInsights(): Promise<EligibilityInsightRow[]> {
  return new CredentialEligibilityService().listEligibilityForInsights();
}
