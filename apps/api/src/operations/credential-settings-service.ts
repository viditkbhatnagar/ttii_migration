import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import {
  DEFAULT_DELIVERY_SETTINGS, NOT_SET_UP_MESSAGE, isMissingTable, parseConfigData,
  type ConfigCategory, type DeliverySettingsData,
} from './credential-types.js';
import {
  SETTINGS_FILE_PREFIX, dateToYmd, isDeliveryMode, isLevel, parseCourierInput, parseDeliverySettings, parseGradingInput,
  parseNameOnly, parseRuleInput, parseSeriesInput, parseSignatoryInput, parseTemplateInput, ymdToDate, numberExample,
} from './credential-settings-model.js';

// Credential Manager → Settings (spec §1.7). Rules and templates are versioned,
// every create/edit/delete appends credential_settings_audit (before/after JSON),
// and every method degrades to NOT_SET_UP_MESSAGE before the 2026-11-15 DDL runs.

export interface Outcome<T = unknown> { status: 0 | 1; message: string; data?: T }
const refuse = (message: string): Outcome<never> => ({ status: 0, message });
const done = <T>(message: string, data?: T): Outcome<T> => (data === undefined ? { status: 1, message } : { status: 1, message, data });

export const SETTING_CATEGORIES = ['rule', 'template', 'signatory', 'grading', 'hold_reason', 'courier'] as const;
export type SettingCategory = Extract<ConfigCategory, typeof SETTING_CATEGORIES[number]>;
export const SETTING_ENTITY: Record<SettingCategory | 'number_series' | 'delivery' | 'offering', string> = {
  rule: 'Completion Rule', template: 'Template', signatory: 'Signatory', grading: 'Grading Scheme',
  hold_reason: 'Hold Reason', courier: 'Courier Partner', number_series: 'Number Series', delivery: 'Delivery settings', offering: 'Course Offering',
};
export function isSettingCategory(value: unknown): value is SettingCategory {
  return (SETTING_CATEGORIES as readonly string[]).includes(value as string);
}

export interface ConfigRowView {
  id: number; category: string; name: string; offeringId: number | null; version: number;
  effectiveFrom: string; active: boolean; data: unknown; updatedAt: string;
}
interface ConfigRow {
  id: number; category: string; name: string; offering_id: number | null; version: number; effective_from: Date | null;
  is_active: boolean; data: string | null; updated_at: Date | null; created_at: Date | null;
}
const iso = (d: Date | null | undefined): string => (d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString() : '');

function parseData(raw: string | null): unknown {
  return parseConfigData<Record<string, unknown>>(raw, {});
}
function view(row: ConfigRow): ConfigRowView {
  return {
    id: row.id, category: row.category, name: row.name, offeringId: row.offering_id, version: row.version,
    effectiveFrom: dateToYmd(row.effective_from), active: row.is_active, data: parseData(row.data), updatedAt: iso(row.updated_at ?? row.created_at),
  };
}
/** The audit snapshot of a row (data parsed so before/after read as JSON). */
const snapshot = (row: ConfigRow): ConfigRowView => view(row);

export interface SeriesView { id: number; docType: string; prefix: string; year: number; padding: number; nextNumber: number; resetYearly: boolean; example: string }
interface SeriesRow { id: number; doc_type: string; prefix: string; year: number; padding: number; next_number: number; reset_yearly: boolean }
function seriesView(r: SeriesRow): SeriesView {
  return {
    id: r.id, docType: r.doc_type, prefix: r.prefix, year: r.year, padding: r.padding, nextNumber: r.next_number, resetYearly: r.reset_yearly,
    example: numberExample({ prefix: r.prefix, year: r.year, padding: r.padding, nextNumber: r.next_number }),
  };
}

export interface OfferingCredentialView { offeringId: number; issuedByTtii: boolean; defaultDeliveryMode: string; level: string | null }

export class CredentialSettingsService {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  /** Wraps a read: a missing table (before the DDL) degrades, other errors surface. */
  private async guarded<T>(fallback: T, fn: () => Promise<T>): Promise<{ ready: boolean; message: string; value: T }> {
    try { return { ready: true, message: '', value: await fn() }; } catch (error: unknown) {
      if (isMissingTable(error)) return { ready: false, message: NOT_SET_UP_MESSAGE, value: fallback };
      throw error;
    }
  }
  private async guardedWrite<T>(fn: () => Promise<Outcome<T>>): Promise<Outcome<T>> {
    try { return await fn(); } catch (error: unknown) {
      if (isMissingTable(error)) return refuse(NOT_SET_UP_MESSAGE);
      throw error;
    }
  }

  private async audit(actor: number | null, action: string, entity: string, entityId: number | null, before: unknown, after: unknown): Promise<void> {
    await this.prisma.credential_settings_audit.create({
      data: {
        actor_user_id: actor, action, entity, entity_id: entityId,
        before_json: before === null ? null : JSON.stringify(before), after_json: after === null ? null : JSON.stringify(after),
      },
    });
  }

  private async issuedOfferingIds(): Promise<Set<number>> {
    const rows = await this.prisma.credential_offering_settings.findMany({ where: { issued_by_ttii: true }, select: { offering_id: true } });
    return new Set(rows.map((r) => r.offering_id));
  }

  // ── Lookups for the editors ────────────────────────────────────────────────
  /** TTII = Yes offerings (title + course) for the rule / template / grading selects. */
  async options(): Promise<{ ready: boolean; message: string; offerings: Array<{ id: number; title: string; course: string; level: string | null }> }> {
    const r = await this.guarded<Array<{ id: number; title: string; course: string; level: string | null }>>([], async () => {
      const settings = await this.prisma.credential_offering_settings.findMany({ where: { issued_by_ttii: true } });
      if (settings.length === 0) return [];
      const offerings = await this.prisma.offerings.findMany({
        where: { id: { in: settings.map((s) => s.offering_id) }, deleted_at: null }, select: { id: true, title: true, course_id: true },
      });
      const courses = await this.prisma.course.findMany({ where: { id: { in: [...new Set(offerings.map((o) => o.course_id))] } }, select: { id: true, title: true } });
      const courseTitle = new Map(courses.map((c) => [c.id, c.title ?? '']));
      const levelOf = new Map(settings.map((s) => [s.offering_id, s.level]));
      return offerings
        .map((o) => ({ id: o.id, title: o.title ?? '', course: courseTitle.get(o.course_id) ?? '', level: levelOf.get(o.id) ?? null }))
        .sort((a, b) => a.title.localeCompare(b.title));
    });
    return { ready: r.ready, message: r.message, offerings: r.value };
  }

  // ── Config rows (rules, templates, signatories, grading, hold reasons, couriers) ─
  async list(category: SettingCategory): Promise<{ ready: boolean; message: string; rows: ConfigRowView[] }> {
    const r = await this.guarded<ConfigRowView[]>([], async () => {
      const rows = (await this.prisma.credential_config.findMany({
        where: { category, deleted_at: null }, orderBy: [{ id: 'asc' }],
      })) as ConfigRow[];
      let visible = rows;
      if (category === 'rule' || category === 'template') {
        const issued = await this.issuedOfferingIds();
        visible = rows.filter((row) => (row.offering_id === null ? category === 'template' : issued.has(row.offering_id)));
      }
      return visible.map(view);
    });
    return { ready: r.ready, message: r.message, rows: r.value };
  }

  async save(actor: number | null, category: SettingCategory, raw: Record<string, unknown>): Promise<Outcome<{ id: number }>> {
    return this.guardedWrite(async () => {
      const id = Math.trunc(Number(raw.id ?? 0)) || 0;
      const existing = id > 0
        ? ((await this.prisma.credential_config.findFirst({ where: { id, category, deleted_at: null } })) as ConfigRow | null)
        : null;
      if (id > 0 && !existing) return refuse('That setting no longer exists. Refresh and try again.');
      switch (category) {
        case 'rule': return this.saveRule(actor, existing, raw);
        case 'template': return this.saveTemplate(actor, existing, raw);
        case 'signatory': return this.saveSimple(actor, category, existing, parseSignatoryInput(raw));
        case 'grading': return this.saveSimple(actor, category, existing, parseGradingInput(raw));
        case 'courier': return this.saveSimple(actor, category, existing, parseCourierInput(raw));
        default: return this.saveSimple(actor, category, existing, parseNameOnly(raw));
      }
    });
  }

  private async saveSimple(
    actor: number | null, category: SettingCategory, existing: ConfigRow | null,
    parsed: { ok: true; value: { name: string; active: boolean; data?: unknown } } | { ok: false; message: string },
  ): Promise<Outcome<{ id: number }>> {
    if (!parsed.ok) return refuse(parsed.message);
    const { name, active, data } = parsed.value;
    const payload = data === undefined ? null : JSON.stringify(data);
    if (category === 'grading' && data) {
      const linked = (data as { offeringIds: number[] }).offeringIds;
      if (linked.length > 0) {
        const issued = await this.issuedOfferingIds();
        if (linked.some((o) => !issued.has(o))) return refuse('Choose offerings marked Credential issued by TTII = Yes.');
      }
    }
    if (existing) {
      const before = snapshot(existing);
      const updated = (await this.prisma.credential_config.update({
        where: { id: existing.id }, data: { name, is_active: active, data: payload, updated_by: actor, updated_at: new Date() },
      })) as ConfigRow;
      await this.audit(actor, 'Edit', SETTING_ENTITY[category], existing.id, before, snapshot(updated));
      return done('Saved', { id: existing.id });
    }
    const created = (await this.prisma.credential_config.create({
      data: { category, name, is_active: active, data: payload, version: 1, created_by: actor, updated_by: actor, updated_at: new Date() },
    })) as ConfigRow;
    await this.audit(actor, 'Create', SETTING_ENTITY[category], created.id, null, snapshot(created));
    return done('Saved', { id: created.id });
  }

  private async nextVersion(where: { category: string; offering_id?: number; name?: string }): Promise<number> {
    const rows = await this.prisma.credential_config.findMany({ where, select: { version: true } });
    return rows.reduce((max, r) => Math.max(max, r.version), 0) + 1;
  }

  private async saveRule(actor: number | null, existing: ConfigRow | null, raw: Record<string, unknown>): Promise<Outcome<{ id: number }>> {
    const parsed = parseRuleInput(raw);
    if (!parsed.ok) return refuse(parsed.message);
    const { offeringId, effectiveFrom, active, data } = parsed.value;
    if (!(await this.issuedOfferingIds()).has(offeringId)) return refuse('Choose an offering marked Credential issued by TTII = Yes.');
    const base = { category: 'rule', name: '', offering_id: offeringId, effective_from: ymdToDate(effectiveFrom), is_active: active, data: JSON.stringify(data) };

    if (existing && !existing.is_active) {
      const before = snapshot(existing);
      const updated = (await this.prisma.credential_config.update({ where: { id: existing.id }, data: { ...base, updated_by: actor, updated_at: new Date() } })) as ConfigRow;
      await this.audit(actor, 'Edit', SETTING_ENTITY.rule, existing.id, before, snapshot(updated));
      return done('Saved', { id: existing.id });
    }
    if (existing) {
      if (effectiveFrom <= dateToYmd(existing.effective_from)) return refuse('A new rule version needs a later effective-from date.');
      const version = await this.nextVersion({ category: 'rule', offering_id: offeringId });
      const created = (await this.prisma.credential_config.create({ data: { ...base, version, created_by: actor, updated_by: actor, updated_at: new Date() } })) as ConfigRow;
      await this.audit(actor, 'Create version', SETTING_ENTITY.rule, created.id, snapshot(existing), snapshot(created));
      return done('New rule version saved', { id: created.id });
    }
    const version = await this.nextVersion({ category: 'rule', offering_id: offeringId });
    const created = (await this.prisma.credential_config.create({ data: { ...base, version, created_by: actor, updated_by: actor, updated_at: new Date() } })) as ConfigRow;
    await this.audit(actor, 'Create', SETTING_ENTITY.rule, created.id, null, snapshot(created));
    return done('Saved', { id: created.id });
  }

  private async saveTemplate(actor: number | null, existing: ConfigRow | null, raw: Record<string, unknown>): Promise<Outcome<{ id: number }>> {
    const parsed = parseTemplateInput(raw);
    if (!parsed.ok) return refuse(parsed.message);
    const { name, offeringId, effectiveFrom, active, data } = parsed.value;
    if (offeringId !== null && !(await this.issuedOfferingIds()).has(offeringId)) return refuse('Choose an offering marked Credential issued by TTII = Yes.');
    const base = { category: 'template', name, offering_id: offeringId, effective_from: ymdToDate(effectiveFrom), is_active: active, data: JSON.stringify(data) };

    if (existing && !existing.is_active) {
      const before = snapshot(existing);
      const updated = (await this.prisma.credential_config.update({ where: { id: existing.id }, data: { ...base, updated_by: actor, updated_at: new Date() } })) as ConfigRow;
      await this.audit(actor, 'Edit', SETTING_ENTITY.template, existing.id, before, snapshot(updated));
      return done('Saved', { id: existing.id });
    }
    const version = await this.nextVersion({ category: 'template', name });
    const created = (await this.prisma.credential_config.create({ data: { ...base, version, created_by: actor, updated_by: actor, updated_at: new Date() } })) as ConfigRow;
    await this.audit(actor, existing ? 'Create version' : 'Create', SETTING_ENTITY.template, created.id, existing ? snapshot(existing) : null, snapshot(created));
    return done(existing ? 'New template version saved' : 'Saved', { id: created.id });
  }

  async remove(actor: number | null, category: SettingCategory | 'number_series', id: number): Promise<Outcome> {
    return this.guardedWrite(async () => {
      if (!Number.isInteger(id) || id <= 0) return refuse('Choose a setting to delete.');
      if (category === 'number_series') {
        const row = (await this.prisma.credential_number_series.findUnique({ where: { id } })) as SeriesRow | null;
        if (!row) return refuse('That setting no longer exists. Refresh and try again.');
        await this.prisma.credential_number_series.delete({ where: { id } });
        await this.audit(actor, 'Delete', SETTING_ENTITY.number_series, id, seriesView(row), null);
        return done('Deleted');
      }
      const row = (await this.prisma.credential_config.findFirst({ where: { id, category, deleted_at: null } })) as ConfigRow | null;
      if (!row) return refuse('That setting no longer exists. Refresh and try again.');
      if (category === 'rule' && row.is_active) return refuse('Active rule versions must be retained.');
      await this.prisma.credential_config.update({ where: { id }, data: { deleted_at: new Date(), deleted_by: actor, updated_at: new Date() } });
      await this.audit(actor, 'Delete', SETTING_ENTITY[category], id, snapshot(row), null);
      return done('Deleted');
    });
  }

  // ── Number series ──────────────────────────────────────────────────────────
  async listSeries(): Promise<{ ready: boolean; message: string; rows: SeriesView[] }> {
    const r = await this.guarded<SeriesView[]>([], async () => {
      const rows = (await this.prisma.credential_number_series.findMany({ orderBy: { id: 'asc' } })) as SeriesRow[];
      return rows.map(seriesView);
    });
    return { ready: r.ready, message: r.message, rows: r.value };
  }

  async saveSeries(actor: number | null, raw: Record<string, unknown>): Promise<Outcome<{ id: number }>> {
    return this.guardedWrite(async () => {
      const parsed = parseSeriesInput(raw);
      if (!parsed.ok) return refuse(parsed.message);
      const s = parsed.value;
      const id = Math.trunc(Number(raw.id ?? 0)) || 0;
      const clash = (await this.prisma.credential_number_series.findUnique({ where: { doc_type: s.docType } })) as SeriesRow | null;
      if (clash && clash.id !== id) return refuse('A number series already exists for this document type.');
      const data = { doc_type: s.docType, prefix: s.prefix, year: s.year, padding: s.padding, next_number: s.nextNumber, reset_yearly: s.resetYearly, updated_by: actor, updated_at: new Date() };
      if (id > 0) {
        const before = (await this.prisma.credential_number_series.findUnique({ where: { id } })) as SeriesRow | null;
        if (!before) return refuse('That setting no longer exists. Refresh and try again.');
        const after = (await this.prisma.credential_number_series.update({ where: { id }, data })) as SeriesRow;
        await this.audit(actor, 'Edit', SETTING_ENTITY.number_series, id, seriesView(before), seriesView(after));
        return done('Saved', { id });
      }
      try {
        const created = (await this.prisma.credential_number_series.create({ data })) as SeriesRow;
        await this.audit(actor, 'Create', SETTING_ENTITY.number_series, created.id, null, seriesView(created));
        return done('Saved', { id: created.id });
      } catch (error: unknown) {
        if ((error as { code?: string } | null)?.code === 'P2002') return refuse('A number series already exists for this document type.');
        throw error;
      }
    });
  }

  // ── Audit ──────────────────────────────────────────────────────────────────
  async listAudit(limit = 200): Promise<{ ready: boolean; message: string; rows: Array<Record<string, unknown>> }> {
    const r = await this.guarded<Array<Record<string, unknown>>>([], async () => {
      const rows = await this.prisma.credential_settings_audit.findMany({ orderBy: { id: 'desc' }, take: Math.min(Math.max(limit, 1), 500) });
      const users = await this.prisma.users.findMany({ where: { id: { in: [...new Set(rows.map((x) => x.actor_user_id).filter((v): v is number => v !== null))] } }, select: { id: true, name: true } });
      const name = new Map(users.map((u) => [u.id, u.name ?? '']));
      return rows.map((x) => ({
        id: x.id, user: x.actor_user_id === null ? '' : name.get(x.actor_user_id) ?? `User ${x.actor_user_id}`, action: x.action, entity: x.entity,
        entityId: x.entity_id, before: x.before_json, after: x.after_json, at: iso(x.created_at),
      }));
    });
    return { ready: r.ready, message: r.message, rows: r.value };
  }

  // ── Delivery settings (single config row, category 'delivery') ─────────────
  async getDelivery(): Promise<{ ready: boolean; message: string; settings: DeliverySettingsData }> {
    const r = await this.guarded<DeliverySettingsData>(DEFAULT_DELIVERY_SETTINGS, async () => {
      const row = await this.prisma.credential_config.findFirst({ where: { category: 'delivery', deleted_at: null }, orderBy: { id: 'asc' } });
      return { ...DEFAULT_DELIVERY_SETTINGS, ...parseConfigData<Partial<DeliverySettingsData>>(row?.data, {}) };
    });
    return { ready: r.ready, message: r.message, settings: r.value };
  }

  async saveDelivery(actor: number | null, raw: Record<string, unknown>): Promise<Outcome<DeliverySettingsData>> {
    return this.guardedWrite(async () => {
      const parsed = parseDeliverySettings(raw);
      if (!parsed.ok) return refuse(parsed.message);
      const row = (await this.prisma.credential_config.findFirst({ where: { category: 'delivery', deleted_at: null }, orderBy: { id: 'asc' } })) as ConfigRow | null;
      const data = JSON.stringify(parsed.value);
      if (row) {
        const before = snapshot(row);
        const updated = (await this.prisma.credential_config.update({ where: { id: row.id }, data: { data, updated_by: actor, updated_at: new Date() } })) as ConfigRow;
        await this.audit(actor, 'Edit', SETTING_ENTITY.delivery, row.id, before, snapshot(updated));
      } else {
        const created = (await this.prisma.credential_config.create({ data: { category: 'delivery', name: 'Delivery settings', data, created_by: actor, updated_by: actor, updated_at: new Date() } })) as ConfigRow;
        await this.audit(actor, 'Create', SETTING_ENTITY.delivery, created.id, null, snapshot(created));
      }
      return done('Delivery settings saved', parsed.value);
    });
  }

  // ── Course Offering credential fields (spec §1.12) ─────────────────────────
  async listOfferingSettings(): Promise<{ ready: boolean; message: string; rows: OfferingCredentialView[] }> {
    const r = await this.guarded<OfferingCredentialView[]>([], async () => {
      const rows = await this.prisma.credential_offering_settings.findMany();
      return rows.map((x) => ({ offeringId: x.offering_id, issuedByTtii: x.issued_by_ttii, defaultDeliveryMode: x.default_delivery_mode, level: x.level }));
    });
    return { ready: r.ready, message: r.message, rows: r.value };
  }

  async saveOfferingSettings(actor: number | null, raw: Record<string, unknown>): Promise<Outcome<OfferingCredentialView>> {
    return this.guardedWrite(async () => {
      const offeringId = Math.trunc(Number(raw.offering_id ?? 0)) || 0;
      if (offeringId <= 0) return refuse('Choose an offering.');
      if (typeof raw.issued_by_ttii !== 'boolean' && raw.issued_by_ttii !== 0 && raw.issued_by_ttii !== 1 && raw.issued_by_ttii !== '0' && raw.issued_by_ttii !== '1') {
        return refuse('Choose Yes or No for Credential issued by TTII.');
      }
      const issued = raw.issued_by_ttii === true || raw.issued_by_ttii === 1 || raw.issued_by_ttii === '1';
      const mode = raw.default_delivery_mode === undefined || raw.default_delivery_mode === '' ? 'digital' : raw.default_delivery_mode;
      if (!isDeliveryMode(mode)) return refuse('Choose a default delivery mode.');
      const levelRaw = typeof raw.level === 'string' ? raw.level.trim() : '';
      if (levelRaw && !isLevel(levelRaw)) return refuse('Choose a level: Certificate, Diploma, PG Diploma or Degree.');
      const offering = await this.prisma.offerings.findFirst({ where: { id: offeringId, deleted_at: null }, select: { id: true } });
      if (!offering) return refuse('Offering not found.');
      const beforeRow = await this.prisma.credential_offering_settings.findUnique({ where: { offering_id: offeringId } });
      const data = { issued_by_ttii: issued, default_delivery_mode: mode, level: levelRaw || null, updated_by: actor, updated_at: new Date() };
      const after = await this.prisma.credential_offering_settings.upsert({ where: { offering_id: offeringId }, create: { offering_id: offeringId, ...data }, update: data });
      const toView = (x: { offering_id: number; issued_by_ttii: boolean; default_delivery_mode: string; level: string | null }): OfferingCredentialView =>
        ({ offeringId: x.offering_id, issuedByTtii: x.issued_by_ttii, defaultDeliveryMode: x.default_delivery_mode, level: x.level });
      await this.audit(actor, beforeRow ? 'Edit' : 'Create', SETTING_ENTITY.offering, offeringId, beforeRow ? toView(beforeRow) : null, toView(after));
      return done('Saved', toView(after));
    });
  }
}

export { SETTINGS_FILE_PREFIX };
