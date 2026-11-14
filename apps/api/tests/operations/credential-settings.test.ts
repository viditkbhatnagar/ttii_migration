import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import {
  bandsOverlap, isValidTrackingUrl, parseCourierInput, parseDeliverySettings, parseGradingInput, parseSeriesInput,
  parseSignatoryInput, parseTemplateInput, presetComponents,
} from '../../src/operations/credential-settings-model.js';
import { CredentialSettingsService } from '../../src/operations/credential-settings-service.js';
import { NOT_SET_UP_MESSAGE } from '../../src/operations/credential-types.js';

// Credential settings (spec 1.7 / 1.12): validation, versioning, audit, offering upsert.

const missingTable = Object.assign(new Error('The table `credential_config` does not exist'), { code: 'P2021' });

interface Cfg { id: number; category: string; name: string; offering_id: number | null; version: number; effective_from: Date | null; is_active: boolean; data: string | null; deleted_at: Date | null; updated_at: Date | null; created_at: Date | null }

function world(opts: { issued?: number[]; missing?: boolean; docs?: Array<{ offering_id: number; document_no: string }> } = {}) {
  const cfg: Cfg[] = [];
  const audit: Array<{ action: string; entity: string; entity_id: number | null; before_json: string | null; after_json: string | null; actor_user_id: number | null }> = [];
  const series: Array<{ id: number; doc_type: string; prefix: string; year: number; padding: number; next_number: number; reset_yearly: boolean }> = [];
  const offeringSettings = new Map<number, { offering_id: number; issued_by_ttii: boolean; default_delivery_mode: string; level: string | null }>();
  for (const id of opts.issued ?? [1]) offeringSettings.set(id, { offering_id: id, issued_by_ttii: true, default_delivery_mode: 'digital', level: null });
  let seq = 0;
  const gate = () => { if (opts.missing) throw missingTable; };
  const matches = (row: Cfg, where: Record<string, unknown> = {}) => Object.entries(where).every(([k, v]) => {
    if (k === 'deleted_at') return v === null ? row.deleted_at === null : true;
    return (row as unknown as Record<string, unknown>)[k] === v;
  });
  const prisma = {
    credential_config: {
      findMany: (a: { where?: Record<string, unknown> } = {}) => { gate(); return Promise.resolve(cfg.filter((r) => matches(r, a.where))); },
      findFirst: (a: { where?: Record<string, unknown> } = {}) => { gate(); return Promise.resolve(cfg.find((r) => matches(r, a.where)) ?? null); },
      create: (a: { data: Partial<Cfg> }) => {
        gate();
        const row: Cfg = { id: ++seq, category: '', name: '', offering_id: null, version: 1, effective_from: null, is_active: true, data: null, deleted_at: null, updated_at: null, created_at: null, ...a.data } as Cfg;
        cfg.push(row);
        return Promise.resolve(row);
      },
      update: (a: { where: { id: number }; data: Partial<Cfg> }) => {
        gate();
        const row = cfg.find((r) => r.id === a.where.id) as Cfg;
        Object.assign(row, a.data);
        return Promise.resolve(row);
      },
    },
    credential_settings_audit: { create: (a: { data: (typeof audit)[number] }) => { gate(); audit.push(a.data); return Promise.resolve(a.data); } },
    credential_offering_settings: {
      findMany: (a: { where?: { issued_by_ttii?: boolean } } = {}) => { gate(); return Promise.resolve([...offeringSettings.values()].filter((r) => a.where?.issued_by_ttii === undefined || r.issued_by_ttii === a.where.issued_by_ttii)); },
      findUnique: (a: { where: { offering_id: number } }) => { gate(); return Promise.resolve(offeringSettings.get(a.where.offering_id) ?? null); },
      upsert: (a: { where: { offering_id: number }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
        gate();
        const prev = offeringSettings.get(a.where.offering_id);
        const next = { ...(prev ?? {}), ...(prev ? a.update : a.create) } as { offering_id: number; issued_by_ttii: boolean; default_delivery_mode: string; level: string | null };
        offeringSettings.set(a.where.offering_id, next);
        return Promise.resolve(next);
      },
    },
    offerings: { findFirst: (a: { where: { id: number } }) => Promise.resolve(a.where.id < 100 ? { id: a.where.id } : null) },
    credential_documents: {
      count: (a: { where: { offering_id: number } }) => Promise.resolve((opts.docs ?? []).filter((d) => d.offering_id === a.where.offering_id).length),
      findFirst: (a: { where: { document_no: string } }) => Promise.resolve((opts.docs ?? []).find((d) => d.document_no === a.where.document_no) ? { id: 1 } : null),
    },
    credential_number_series: {
      findMany: () => { gate(); return Promise.resolve(series); },
      findUnique: (a: { where: { id?: number; doc_type?: string } }) => { gate(); return Promise.resolve(series.find((s) => (a.where.id !== undefined ? s.id === a.where.id : s.doc_type === a.where.doc_type)) ?? null); },
      create: (a: { data: Record<string, unknown> }) => { const row = { id: ++seq, ...a.data } as (typeof series)[number]; series.push(row); return Promise.resolve(row); },
      update: (a: { where: { id: number }; data: Record<string, unknown> }) => { const row = series.find((s) => s.id === a.where.id) as (typeof series)[number]; Object.assign(row, a.data); return Promise.resolve(row); },
      delete: (a: { where: { id: number } }) => { series.splice(series.findIndex((s) => s.id === a.where.id), 1); return Promise.resolve({}); },
    },
  } as unknown as PrismaClient;
  return { service: new CredentialSettingsService(prisma), cfg, audit, series, offeringSettings };
}

const ruleBody = (over: Record<string, unknown> = {}) => ({
  offering_id: 1, effective_from: '2026-11-12', active: true,
  data: { ruleType: 'Assignment only', reattempt: 'Best', autoIssue: false, components: presetComponents('Assignment only') },
  ...over,
});

describe('completion rules: versioning and audit', () => {
  test('create writes version 1 and a Create audit; an active rule cannot be deleted', async () => {
    const w = world();
    const saved = await w.service.save(7, 'rule', ruleBody());
    expect(saved).toMatchObject({ status: 1, data: { id: 1 } });
    expect(w.cfg[0]).toMatchObject({ version: 1, offering_id: 1 });
    expect(w.audit).toHaveLength(1);
    expect(w.audit[0]).toMatchObject({ action: 'Create', entity: 'Completion Rule', actor_user_id: 7, before_json: null });
    expect(await w.service.remove(7, 'rule', 1)).toEqual({ status: 0, message: 'Active rule versions must be retained.' });
    expect(w.cfg[0]?.deleted_at).toBeNull();
  });

  test('editing an active rule needs a later effective date and creates version 2, keeping the original', async () => {
    const w = world();
    await w.service.save(7, 'rule', ruleBody());
    const same = await w.service.save(7, 'rule', ruleBody({ id: 1 }));
    expect(same).toEqual({ status: 0, message: 'A new rule version needs a later effective-from date.' });
    const next = await w.service.save(7, 'rule', ruleBody({ id: 1, effective_from: '2026-12-01' }));
    expect(next).toMatchObject({ status: 1, message: 'New rule version saved', data: { id: 2 } });
    expect(w.cfg.map((r) => r.version)).toEqual([1, 2]);
    expect(w.cfg[0]?.effective_from?.toISOString().slice(0, 10)).toBe('2026-11-12');
    expect(w.audit.at(-1)).toMatchObject({ action: 'Create version', entity_id: 2 });
    expect(JSON.parse(w.audit.at(-1)?.before_json ?? '{}')).toMatchObject({ id: 1, version: 1 });
  });

  test('an inactive rule is overwritten in place and can then be deleted (audited)', async () => {
    const w = world();
    await w.service.save(7, 'rule', ruleBody({ active: false }));
    const edited = await w.service.save(7, 'rule', ruleBody({ id: 1, active: false, effective_from: '2026-11-01' }));
    expect(edited.status).toBe(1);
    expect(w.cfg).toHaveLength(1);
    expect(w.audit.at(-1)?.action).toBe('Edit');
    expect((await w.service.remove(7, 'rule', 1)).status).toBe(1);
    expect(w.audit.at(-1)).toMatchObject({ action: 'Delete', after_json: null });
    expect((await w.service.list('rule')).rows).toEqual([]);
  });

  test('refusals: offering not TTII = Yes, no components, bad percentages', async () => {
    const w = world();
    expect((await w.service.save(7, 'rule', ruleBody({ offering_id: 2 }))).message).toBe('Choose an offering marked Credential issued by TTII = Yes.');
    expect((await w.service.save(7, 'rule', ruleBody({ data: { components: [] } }))).message).toBe('Add at least one completion component.');
    const bad = { components: [{ componentType: 'Exams', minimum: 120 }] };
    expect((await w.service.save(7, 'rule', ruleBody({ data: bad }))).message).toBe('Minimum percentages must be 0–100 and assignment counts must be positive whole numbers.');
    const count = { components: [{ componentType: 'Assignments', coverage: 'Count', count: 0, minimum: 40 }] };
    expect((await w.service.save(7, 'rule', ruleBody({ data: count }))).status).toBe(0);
    expect(w.audit).toHaveLength(0);
  });

  test('the list hides rules and course templates of offerings that stopped being TTII = Yes, but keeps level templates', async () => {
    const w = world({ issued: [1] });
    await w.service.save(7, 'rule', ruleBody());
    const tpl = { name: 'Level cert', effective_from: '2026-11-12', data: { docType: 'certificate', level: 'Diploma', fields: ['Learner name'] } };
    await w.service.save(7, 'template', tpl);
    w.offeringSettings.get(1)!.issued_by_ttii = false;
    expect((await w.service.list('rule')).rows).toEqual([]);
    expect((await w.service.list('template')).rows).toHaveLength(1);
  });
});

describe('templates: versioning by name, validation', () => {
  const body = (over: Record<string, unknown> = {}) => ({
    name: 'Standard certificate', effective_from: '2026-11-12', active: true,
    data: { docType: 'certificate', level: 'Diploma', fields: ['Learner name', 'QR'], signatoryIds: [], backContent: 'Terms' }, ...over,
  });

  test('editing an active template creates version max(name)+1 with no date rule', async () => {
    const w = world();
    await w.service.save(1, 'template', body());
    const v2 = await w.service.save(1, 'template', body({ id: 1 }));
    expect(v2).toMatchObject({ status: 1, data: { id: 2 } });
    expect(w.cfg.map((r) => r.version)).toEqual([1, 2]);
    expect(w.audit.at(-1)?.action).toBe('Create version');
    const other = await w.service.save(1, 'template', body({ name: 'Other' }));
    expect(w.cfg[other.data!.id - 1]?.version).toBe(1);
  });

  test('validation messages', () => {
    expect(parseTemplateInput(body({ data: { docType: 'certificate', level: 'Diploma', fields: [] } }))).toEqual({ ok: false, message: 'Select at least one field to print.' });
    expect(parseTemplateInput(body({ data: { docType: 'certificate', fields: ['QR'] } }))).toEqual({ ok: false, message: 'Apply the template to a course offering or a level.' });
    expect(parseTemplateInput(body({ data: { docType: 'certificate', level: 'Diploma', fields: ['QR'], backgroundKey: 'https://evil/x.png' } })).ok).toBe(false);
    const course = parseTemplateInput(body({ offering_id: 3, data: { docType: 'marksheet', level: 'Diploma', fields: ['QR'] } }));
    expect(course.ok && course.value.data.level).toBeNull();
  });

  test('a course-bound template must be TTII = Yes', async () => {
    const w = world({ issued: [1] });
    const res = await w.service.save(1, 'template', body({ offering_id: 5, data: { docType: 'certificate', fields: ['QR'] } }));
    expect(res.message).toBe('Choose an offering marked Credential issued by TTII = Yes.');
  });
});

describe('number series, signatories, grading, hold reasons, couriers', () => {
  test('one series per document type; example is prefix/year/padded', async () => {
    const w = world();
    const first = await w.service.saveSeries(1, { doc_type: 'certificate', prefix: 'TTII/CERT', year: 2026, padding: 6, next_number: 12, reset_yearly: true });
    expect(first.status).toBe(1);
    expect((await w.service.listSeries()).rows[0]?.example).toBe('TTII/CERT/2026/000012');
    const dup = await w.service.saveSeries(1, { doc_type: 'certificate', prefix: 'X', year: 2026, padding: 6, next_number: 1 });
    expect(dup).toEqual({ status: 0, message: 'A number series already exists for this document type.' });
    const edit = await w.service.saveSeries(1, { id: first.data!.id, doc_type: 'certificate', prefix: 'TTII/C2', year: 2026, padding: 4, next_number: 1 });
    expect(edit.status).toBe(1);
    expect(w.audit.map((a) => a.action)).toEqual(['Create', 'Edit']);
    expect(parseSeriesInput({ doc_type: 'certificate', prefix: 'A', year: 1999, padding: 6, next_number: 1 }).ok).toBe(false);
    expect(parseSeriesInput({ doc_type: 'certificate', prefix: 'A', year: 2026, padding: 13, next_number: 1 }).ok).toBe(false);
    expect((await w.service.remove(1, 'number_series', first.data!.id)).status).toBe(1);
  });

  test('refuses a next number that has already been issued (would block every issue with a unique clash)', async () => {
    const w = world({ docs: [{ offering_id: 1, document_no: 'TTII/CERT/2026/000005' }] });
    const clash = await w.service.saveSeries(1, { doc_type: 'certificate', prefix: 'TTII/CERT', year: 2026, padding: 6, next_number: 5 });
    expect(clash.status).toBe(0);
    expect(clash.message).toContain('TTII/CERT/2026/000005 has already been issued');
    expect((await w.service.saveSeries(1, { doc_type: 'certificate', prefix: 'TTII/CERT', year: 2026, padding: 6, next_number: 6 })).status).toBe(1);
  });

  test('signatory needs an image and valid-to not before valid-from', () => {
    const base = { name: 'Dr Rao', data: { designation: 'Director', validFrom: '2026-01-01', signatureKey: 'credentials/settings/signature-ab.png' } };
    expect(parseSignatoryInput(base).ok).toBe(true);
    expect(parseSignatoryInput({ ...base, data: { ...base.data, signatureKey: '' } })).toEqual({ ok: false, message: 'Upload a signature image.' });
    expect(parseSignatoryInput({ ...base, data: { ...base.data, validTo: '2025-12-31' } })).toEqual({ ok: false, message: 'Valid to must not be before valid from.' });
    expect(parseSignatoryInput({ name: '', data: base.data })).toEqual({ ok: false, message: 'Enter a name.' });
  });

  test('grading bands must fit the scale and not overlap', () => {
    const bands = [{ min: 90, max: 100, grade: 'O', points: 10 }, { min: 40, max: 89.99, grade: 'B', points: 6 }, { min: 0, max: 39.99, grade: 'F', points: 0 }];
    const body = (b: unknown[], over: Record<string, unknown> = {}) => ({ name: 'S', data: { scaleMax: 10, passMinimum: 40, bands: b, ...over } });
    expect(parseGradingInput(body(bands)).ok).toBe(true);
    expect(bandsOverlap(bands)).toBe(false);
    expect(parseGradingInput(body([...bands, { min: 85, max: 95, grade: 'X', points: 5 }]))).toEqual({ ok: false, message: 'Grade bands must not overlap.' });
    expect(parseGradingInput(body([{ min: 0, max: 100, grade: 'A', points: 11 }]))).toEqual({ ok: false, message: 'Check each band, grade and grade point against the scale.' });
    expect(parseGradingInput(body([{ min: 50, max: 40, grade: 'A', points: 1 }])).ok).toBe(false);
  });

  test('courier tracking URL must be https with {AWB}', () => {
    expect(isValidTrackingUrl('https://track.example.com/t?awb={AWB}')).toBe(true);
    expect(isValidTrackingUrl('http://track.example.com/{AWB}')).toBe(false);
    expect(isValidTrackingUrl('https://track.example.com/')).toBe(false);
    expect(isValidTrackingUrl('javascript:alert({AWB})')).toBe(false);
    expect(parseCourierInput({ name: 'DTDC', data: { trackingUrlPattern: 'ftp://x/{AWB}' } })).toEqual({ ok: false, message: 'Use an HTTPS tracking URL containing {AWB}.' });
  });

  test('hold reasons and couriers save, edit and soft-delete with audit', async () => {
    const w = world();
    const r = await w.service.save(3, 'hold_reason', { name: 'Fee dues' });
    await w.service.save(3, 'hold_reason', { id: r.data!.id, name: 'Fee dues pending', active: false });
    await w.service.remove(3, 'hold_reason', r.data!.id);
    expect(w.audit.map((a) => a.action)).toEqual(['Create', 'Edit', 'Delete']);
    expect((await w.service.save(3, 'hold_reason', { name: '  ' })).message).toBe('Enter a name.');
  });
});

describe('delivery settings', () => {
  test('days 1-365, centre overrides keep only valid modes; saved as the single delivery row', async () => {
    expect(parseDeliverySettings({ overdue_days: 0, ready_days: 3 }).ok).toBe(false);
    expect(parseDeliverySettings({ overdue_days: 10, ready_days: 366 }).ok).toBe(false);
    const parsed = parseDeliverySettings({ overdue_days: 10, ready_days: 3, centre_modes: { 5: 'via_centre', 6: 'carrier_pigeon', abc: 'digital' } });
    expect(parsed.ok && parsed.value.centreModes).toEqual({ 5: 'via_centre' });
    const w = world();
    expect((await w.service.getDelivery()).settings).toMatchObject({ overdueDays: 10, readyDays: 3 });
    await w.service.saveDelivery(1, { overdue_days: 14, ready_days: 5, centre_modes: {} });
    await w.service.saveDelivery(1, { overdue_days: 15, ready_days: 5, centre_modes: {} });
    expect(w.cfg.filter((r) => r.category === 'delivery')).toHaveLength(1);
    expect((await w.service.getDelivery()).settings.overdueDays).toBe(15);
  });
});

describe('offering credential fields', () => {
  test('upserts by offering, validates, audits', async () => {
    const w = world({ issued: [] });
    const created = await w.service.saveOfferingSettings(4, { offering_id: 9, issued_by_ttii: true, default_delivery_mode: 'via_centre', level: 'Diploma' });
    expect(created).toMatchObject({ status: 1, data: { offeringId: 9, issuedByTtii: true, defaultDeliveryMode: 'via_centre', level: 'Diploma' } });
    await w.service.saveOfferingSettings(4, { offering_id: 9, issued_by_ttii: false, default_delivery_mode: 'digital', level: '' });
    expect(w.offeringSettings.get(9)).toMatchObject({ issued_by_ttii: false, level: null });
    expect(w.audit.map((a) => a.action)).toEqual(['Create', 'Edit']);
    expect((await w.service.saveOfferingSettings(4, { offering_id: 9, default_delivery_mode: 'digital' })).status).toBe(0);
    expect((await w.service.saveOfferingSettings(4, { offering_id: 9, issued_by_ttii: true, default_delivery_mode: 'pigeon' })).status).toBe(0);
    expect((await w.service.saveOfferingSettings(4, { offering_id: 9, issued_by_ttii: true, level: 'PhD' })).status).toBe(0);
    expect((await w.service.saveOfferingSettings(4, { offering_id: 500, issued_by_ttii: true })).message).toBe('Offering not found.');
    expect((await w.service.listOfferingSettings()).rows).toHaveLength(1);
  });

  test('cannot switch "issued by TTII" off once credentials exist for the offering (printed QRs keep their scope)', async () => {
    const w = world({ issued: [3], docs: [{ offering_id: 3, document_no: 'TTII/CERT/2026/000001' }] });
    const off = await w.service.saveOfferingSettings(4, { offering_id: 3, issued_by_ttii: false, default_delivery_mode: 'digital' });
    expect(off.status).toBe(0);
    expect(off.message).toContain('must stay Yes');
    expect(w.offeringSettings.get(3)?.issued_by_ttii).toBe(true);
    expect((await w.service.saveOfferingSettings(4, { offering_id: 3, issued_by_ttii: true, default_delivery_mode: 'via_centre' })).status).toBe(1);
  });
});

describe('before the migration (tables missing)', () => {
  test('reads degrade with the not-set-up message and writes refuse, never throw', async () => {
    const w = world({ missing: true });
    expect(await w.service.list('hold_reason')).toMatchObject({ ready: false, message: NOT_SET_UP_MESSAGE, rows: [] });
    expect(await w.service.listSeries()).toMatchObject({ ready: false, rows: [] });
    expect(await w.service.listOfferingSettings()).toMatchObject({ ready: false, rows: [] });
    expect((await w.service.getDelivery()).settings.overdueDays).toBe(10);
    expect(await w.service.save(1, 'hold_reason', { name: 'x' })).toEqual({ status: 0, message: NOT_SET_UP_MESSAGE });
    expect(await w.service.saveOfferingSettings(1, { offering_id: 1, issued_by_ttii: true })).toEqual({ status: 0, message: NOT_SET_UP_MESSAGE });
    expect(await w.service.saveDelivery(1, { overdue_days: 10, ready_days: 3 })).toEqual({ status: 0, message: NOT_SET_UP_MESSAGE });
  });
});
