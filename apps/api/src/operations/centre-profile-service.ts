import type { Prisma, PrismaClient, centre_kyc } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { toLegacyFileUrl } from '../data/legacy-asset-url.js';
import { CentreCoursePlans } from './centre-course-plans.js';
import { isCentreCodeTaken, nextCentreCode, sameCentreCode } from './centre-code.js';
import { CENTRE_ROLE_ID, createCentreInTx, emailCentreCredentials, kycColumns, type CentreKycInput } from './centre-create.js';
import {
  DOC_TYPE_UPLOADED, EMPTY_VALUES, NOT_SET_UP_MESSAGE,
  FILE_FIELDS, applicationStage, buildActivity, digitsOnly, fail, failWith, hasKycInput, intOf, isHttpUrl, isIndia, isMissingTable, iso,
  istToday, locationName, mergeForSave, money, planStatus, readSubmitted, studentStatus, text, validateCentre,
  ymdOfDate, ymdOfText,
  type ActivityItem, type CentreValues, type FieldErrors, type Outcome,
} from './centre-profile-model.js';

// Centre Directory + Centre Profile 360 (Naji 2026-10-22). Admin / Subadmin
// only (centre-profile-routes.ts). Everything shown is REAL data; the
// prototype's generated fee packages, offerings, student certificates and
// progress bars have no source here and are not invented.
//
// The 2026-10-22 tables (centre_kyc, centre_documents, centre_agreements,
// centre_affiliation_certificates) may not exist yet: every read of them
// degrades to empty (kyc_ready=false) and every write that needs them refuses
// with NOT_SET_UP_MESSAGE. Reads of the existing tables keep working.
//
// centres.password (legacy PHP) is never selected, so it can never be returned.

const IST_OFFSET_MS = 330 * 60 * 1000;
const FIELD_ERRORS_MESSAGE = 'Please fix the highlighted fields';

/** Every centres column the profile and the edit merge need — never `password`. */
const CENTRE_SELECT = {
  id: true, centre_id: true, centre_name: true, wallet_balance: true, country_id: true, state_id: true,
  district_id: true, address: true, contact_person: true, contact_person_designation: true, country_code: true,
  phone: true, whatsapp: true, email: true, date_of_registration: true, date_of_expiry: true,
  registraion_certificate: true, affiliation_document: true, status: true, created_at: true, updated_at: true,
} as const satisfies Prisma.centresSelect;

type CentreRecord = Prisma.centresGetPayload<{ select: typeof CENTRE_SELECT }>;
type KycRecord = centre_kyc;
type Db = PrismaClient | Prisma.TransactionClient;

export interface CentreSummary {
  id: number;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  country: string;
  state: string;
  district: string;
  address: string;
  contact_person: string;
  designation: string;
  country_code: string;
  phone: string;
  email: string;
  registration_date: string;
  affiliation_expiry: string;
  registration_doc: string;
  affiliation_document: string;
  wallet_balance: number;
  created_at: string;
}

export interface KycView {
  legal_entity_name: string;
  entity_type: string;
  city: string;
  pincode: string;
  gstin: string;
  pan: string;
  id_number: string;
  id_doc: string;
  pan_doc: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_ifsc: string;
  bank_name: string;
  bank_branch: string;
  logo: string;
  updated_at: string;
}

export interface CoursePlanRow { id: number; course_id: number; course: string; amount: number; start: string; end: string; status: 'Active' | 'Inactive' }
export interface ApplicationRow { id: number; application_id: string; date: string; student: string; course: string; combination: string; fee: number | null; stage: string }
export interface StudentRow { id: number; roll: string; name: string; cohort: string; course: string; joined: string; status: string }
export interface WalletTxnRow { id: number; type: 'credit' | 'debit' | 'other'; amount: number; remarks: string; at: string }
export interface FundRequestRow { id: number; amount: number; date: string; status: string; description: string; receipt: string; attachment: string; at: string }
export type DocumentSource = 'registration' | 'affiliation' | 'id' | 'pan' | 'uploaded' | 'agreement' | 'certificate';
export interface DocumentRow { key: string; id: number | null; source: DocumentSource; name: string; type: string; date: string; url: string; deletable: boolean }

export interface CentreProfileData {
  kyc_ready: boolean;
  notice: string;
  centre: CentreSummary;
  kyc: KycView | null;
  login: { user_id: number; email: string; disabled: boolean } | null;
  course_plans: CoursePlanRow[];
  applications: ApplicationRow[];
  students: StudentRow[];
  cohorts: Array<Record<string, unknown>>;
  wallet: { balance: number; transactions: WalletTxnRow[]; fund_requests: FundRequestRow[] };
  documents: DocumentRow[];
  activity: ActivityItem[];
}

export interface SaveResult {
  id: number;
  code: string;
  mode: 'add' | 'edit';
  email_delivered?: boolean;
  email_error?: string;
  errors?: FieldErrors;
}

export interface CentreProfileDeps {
  /** Rows of the Cohorts list feed (operations-service listAdminCohorts) for one centre. */
  loadCohorts?: (centreId: number) => Promise<Array<Record<string, unknown>>>;
  emailCredentials?: typeof emailCentreCredentials;
  now?: () => Date;
}

class CodeTakenError extends Error {}

const istYmd = (value: Date | null | undefined): string =>
  (value instanceof Date && !Number.isNaN(value.getTime()) ? new Date(value.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10) : '');

/** The last path segment of a file URL, for the Documents tab's name column. */
export function fileNameOf(url: string): string {
  const clean = url.split(/[?#]/)[0] ?? '';
  const last = clean.split('/').filter(Boolean).pop() ?? '';
  try { return decodeURIComponent(last); } catch { return last; }
}

function summary(c: CentreRecord): CentreSummary {
  return {
    id: c.id,
    code: text(c.centre_id),
    name: text(c.centre_name),
    status: c.status === 0 ? 'inactive' : 'active',
    country: locationName(c.country_id),
    state: locationName(c.state_id),
    district: locationName(c.district_id),
    address: text(c.address),
    contact_person: text(c.contact_person),
    designation: text(c.contact_person_designation),
    country_code: text(c.country_code),
    phone: text(c.phone),
    email: text(c.email),
    registration_date: ymdOfText(c.date_of_registration),
    affiliation_expiry: ymdOfText(c.date_of_expiry),
    registration_doc: toLegacyFileUrl(c.registraion_certificate),
    affiliation_document: toLegacyFileUrl(c.affiliation_document),
    wallet_balance: money(c.wallet_balance),
    created_at: iso(c.created_at),
  };
}

function kycView(k: KycRecord): KycView {
  return {
    legal_entity_name: text(k.legal_entity_name),
    entity_type: text(k.entity_type),
    city: text(k.city),
    pincode: text(k.pincode),
    gstin: text(k.gstin),
    pan: text(k.pan),
    id_number: text(k.id_number),
    id_doc: toLegacyFileUrl(k.id_doc),
    pan_doc: toLegacyFileUrl(k.pan_doc),
    bank_account_name: text(k.bank_account_name),
    bank_account_number: text(k.bank_account_number),
    bank_ifsc: text(k.bank_ifsc),
    bank_name: text(k.bank_name),
    bank_branch: text(k.bank_branch),
    logo: toLegacyFileUrl(k.logo),
    updated_at: iso(k.updated_at),
  };
}

/** The stored centre + KYC as form values (the base an edit merges onto). */
export function storedValues(c: CentreRecord, k: KycRecord | null): CentreValues {
  const s = summary(c);
  const kv = k ? kycView(k) : null;
  return {
    ...EMPTY_VALUES,
    centre_code: s.code,
    centre_name: s.name,
    registration_doc: s.registration_doc,
    affiliation_expiry: s.affiliation_expiry,
    address: s.address,
    country: s.country,
    state: s.state,
    district: s.district,
    contact_person: s.contact_person,
    designation: s.designation,
    country_code: s.country_code ? `+${digitsOnly(s.country_code)}` : '',
    phone: s.phone,
    email: s.email.toLowerCase(),
    ...(kv ? {
      legal_entity_name: kv.legal_entity_name, entity_type: kv.entity_type, city: kv.city, pincode: kv.pincode,
      gstin: kv.gstin, pan: kv.pan, id_number: kv.id_number, id_doc: kv.id_doc, pan_doc: kv.pan_doc,
      bank_account_name: kv.bank_account_name, bank_account_number: kv.bank_account_number, bank_ifsc: kv.bank_ifsc,
      bank_name: kv.bank_name, bank_branch: kv.bank_branch,
    } : {}),
  };
}

function kycInput(v: CentreValues): CentreKycInput {
  return {
    legalEntityName: v.legal_entity_name, entityType: v.entity_type, city: v.city, pincode: v.pincode,
    gstin: v.gstin, pan: v.pan, idNumber: v.id_number, idDoc: v.id_doc, panDoc: v.pan_doc,
    bankAccountName: v.bank_account_name, bankAccountNumber: v.bank_account_number, bankIfsc: v.bank_ifsc,
    bankName: v.bank_name, bankBranch: v.bank_branch,
  };
}

/** "+91" / "91" spellings of one dial code, for matching legacy centres.country_code values. */
function dialVariants(code: string): string[] {
  const digits = digitsOnly(code);
  return digits ? [`+${digits}`, digits] : [''];
}

/** Read a 2026-10-22 table; P2021 (not migrated) answers `fallback`. */
async function optional<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch (error: unknown) {
    if (isMissingTable(error)) return fallback;
    throw error;
  }
}

export class CentreProfileService {
  constructor(
    private readonly prisma: PrismaClient = getPrismaClient(),
    private readonly deps: CentreProfileDeps = {},
  ) {}

  private now(): Date {
    return this.deps.now ? this.deps.now() : new Date();
  }

  private plans(): CentreCoursePlans {
    return new CentreCoursePlans(this.prisma, () => this.now());
  }

  courseOptions() { return this.plans().options(); }
  savePlan(actor: number | null, payload: Record<string, unknown>) { return this.plans().save(actor, payload); }
  deletePlan(actor: number | null, id: number, centreId: number) { return this.plans().remove(actor, id, centreId); }

  /** True once the 2026-10-22 migration has created centre_kyc. */
  async kycReady(db: Db = this.prisma): Promise<boolean> {
    return optional(async () => { await db.centre_kyc.findFirst({ select: { centre_id: true } }); return true; }, false);
  }

  async nextCode(): Promise<{ code: string }> {
    return { code: await nextCentreCode(this.prisma) };
  }

  // ─── Profile ──────────────────────────────────────────────────────────────

  async profile(centreId: number): Promise<Outcome<CentreProfileData>> {
    if (!centreId) return fail('Centre not found');
    const centre = await this.prisma.centres.findFirst({ where: { id: centreId, deleted_at: null }, select: CENTRE_SELECT });
    if (!centre) return fail('Centre not found');

    const missing = Symbol('missing');
    const kycOrMissing = await optional<KycRecord | null | typeof missing>(
      () => this.prisma.centre_kyc.findUnique({ where: { centre_id: centreId } }),
      missing,
    );
    const kycReady = kycOrMissing !== missing;
    const kyc = kycOrMissing === missing ? null : kycOrMissing;

    const [login, coursePlans, applications, students, cohorts, txns, funds, uploaded, agreements, certificates] = await Promise.all([
      this.prisma.users.findFirst({
        where: { role_id: CENTRE_ROLE_ID, centre_id: String(centreId), deleted_at: null },
        orderBy: { id: 'asc' },
        select: { id: true, user_email: true, email: true, disabled_at: true },
      }),
      this.coursePlans(centreId),
      this.applications(centreId),
      this.students(centreId),
      this.deps.loadCohorts ? this.deps.loadCohorts(centreId) : Promise.resolve([]),
      this.prisma.wallet_transactions.findMany({ where: { centre_id: centreId, deleted_at: null }, orderBy: { id: 'asc' } }),
      this.prisma.centre_fund_requests.findMany({ where: { centre_id: centreId, deleted_at: null }, orderBy: { id: 'asc' } }),
      optional(() => this.prisma.centre_documents.findMany({ where: { centre_id: centreId, deleted_at: null }, orderBy: { id: 'desc' } }), []),
      optional(() => this.prisma.centre_agreements.findMany({ where: { centre_id: centreId, deleted_at: null }, orderBy: { id: 'desc' } }), []),
      optional(() => this.prisma.centre_affiliation_certificates.findMany({ where: { centre_id: centreId, deleted_at: null }, orderBy: { id: 'desc' } }), []),
    ]);

    const s = summary(centre);
    const kv = kyc ? kycView(kyc) : null;
    const base = (key: DocumentSource, type: string, url: string): DocumentRow => ({
      key, id: null, source: key, name: url ? fileNameOf(url) || type : '—', type, date: '', url, deletable: false,
    });
    const documents: DocumentRow[] = [
      base('registration', 'Registration Certificate', s.registration_doc),
      base('affiliation', 'Affiliation Document', s.affiliation_document),
      base('id', 'Aadhaar / Passport', kv?.id_doc ?? ''),
      base('pan', 'PAN Card', kv?.pan_doc ?? ''),
      ...uploaded.map((d): DocumentRow => ({
        key: `doc-${d.id}`, id: d.id, source: 'uploaded', name: text(d.title), type: text(d.doc_type) || DOC_TYPE_UPLOADED,
        date: istYmd(d.created_at), url: toLegacyFileUrl(d.file_url), deletable: true,
      })),
      ...agreements.map((a): DocumentRow => ({
        key: `agr-${a.id}`, id: null, source: 'agreement', name: `Agreement ${a.agreement_no}`, type: 'Affiliation Agreement',
        date: ymdOfDate(a.signed_on) || ymdOfDate(a.effective_date), url: toLegacyFileUrl(a.file_url), deletable: false,
      })),
      ...certificates.map((c): DocumentRow => ({
        key: `cert-${c.id}`, id: null, source: 'certificate', name: `Certificate ${c.certificate_no}`, type: 'Affiliation Certificate',
        date: ymdOfDate(c.valid_from), url: toLegacyFileUrl(c.file_url), deletable: false,
      })),
    ];

    const transactions: WalletTxnRow[] = txns.map((t) => {
      const type = text(t.transaction_type).toLowerCase();
      return { id: t.id, type: type === 'credit' || type === 'debit' ? type : 'other', amount: money(t.amount), remarks: text(t.remarks), at: iso(t.created_at) };
    });
    const fundRequests: FundRequestRow[] = funds.map((f) => ({
      id: f.id, amount: money(f.amount), date: ymdOfDate(f.date), status: text(f.status).toLowerCase() || 'pending',
      description: text(f.description), receipt: text(f.transaction_receipt),
      attachment: toLegacyFileUrl(f.attachment_file), at: iso(f.created_at),
    }));

    const activity = buildActivity({
      centre: { code: s.code, created_at: centre.created_at },
      kyc: kyc ? { created_at: kyc.created_at, updated_at: kyc.updated_at } : null,
      fundRequests: funds.map((f) => ({ id: f.id, amount: f.amount, status: f.status, created_at: f.created_at, updated_at: f.updated_at })),
      walletTransactions: txns,
      documents: uploaded.map((d) => ({ title: d.title, created_at: d.created_at })),
      agreements: agreements.map((a) => ({ agreement_no: a.agreement_no, created_at: a.created_at })),
      certificates: certificates.map((c) => ({ certificate_no: c.certificate_no, created_at: c.created_at, revoked_at: c.revoked_at })),
    });

    return {
      status: 1,
      message: 'success',
      data: {
        kyc_ready: kycReady,
        notice: kycReady ? '' : NOT_SET_UP_MESSAGE,
        centre: s,
        kyc: kv,
        login: login ? { user_id: login.id, email: text(login.user_email) || text(login.email), disabled: Boolean(login.disabled_at) } : null,
        course_plans: coursePlans,
        applications,
        students,
        cohorts,
        wallet: { balance: s.wallet_balance, transactions, fund_requests: fundRequests },
        documents,
        activity,
      },
    };
  }

  private async coursePlans(centreId: number): Promise<CoursePlanRow[]> {
    const plans = await this.prisma.centre_course_plans.findMany({ where: { centre_id: centreId, deleted_at: null }, orderBy: { id: 'asc' } });
    const titles = await this.courseTitles(plans.map((p) => p.course_id));
    const today = istToday(this.now().getTime());
    return plans.map((p) => {
      const start = ymdOfDate(p.start_date);
      const end = ymdOfDate(p.end_date);
      return { id: p.id, course_id: p.course_id, course: titles.get(p.course_id) ?? '', amount: money(p.assigned_amount), start, end, status: planStatus(start, end, today) };
    });
  }

  private async courseTitles(ids: Array<number | null | undefined>): Promise<Map<number, string>> {
    const unique = [...new Set(ids.filter((id): id is number => typeof id === 'number' && id > 0))];
    if (unique.length === 0) return new Map();
    const rows = await this.prisma.course.findMany({ where: { id: { in: unique } }, select: { id: true, title: true } });
    return new Map(rows.map((r) => [r.id, text(r.title)]));
  }

  private async applications(centreId: number): Promise<ApplicationRow[]> {
    const apps = await this.prisma.applications.findMany({
      where: { added_under_centre: centreId, deleted_at: null },
      orderBy: { id: 'desc' },
      select: {
        id: true, application_id: true, name: true, created_at: true, course_id: true, certificate_combination_id: true,
        application_final_fee: true, stage: true, status: true, is_converted: true,
      },
    });
    const comboIds = [...new Set(apps.map((a) => a.certificate_combination_id).filter((id): id is number => typeof id === 'number' && id > 0))];
    const [titles, combos] = await Promise.all([
      this.courseTitles(apps.map((a) => a.course_id)),
      comboIds.length > 0
        ? this.prisma.certificate_combinations.findMany({ where: { id: { in: comboIds } }, select: { id: true, combination_code: true } })
        : Promise.resolve([]),
    ]);
    const comboMap = new Map(combos.map((c) => [c.id, text(c.combination_code)]));
    return apps.map((a) => ({
      id: a.id,
      application_id: text(a.application_id),
      date: istYmd(a.created_at),
      student: text(a.name),
      course: a.course_id ? titles.get(a.course_id) ?? '' : '',
      combination: a.certificate_combination_id ? comboMap.get(a.certificate_combination_id) ?? '' : '',
      fee: a.application_final_fee === null || a.application_final_fee === undefined ? null : money(a.application_final_fee),
      stage: applicationStage({ stage: a.stage, status: a.status, is_converted: a.is_converted }),
    }));
  }

  private async students(centreId: number): Promise<StudentRow[]> {
    const users = await this.prisma.users.findMany({
      where: { role_id: 2, added_under_centre: centreId, deleted_at: null },
      orderBy: { id: 'asc' },
      select: { id: true, student_id: true, name: true, created_at: true, status: true, disabled_at: true, course_id: true },
    });
    if (users.length === 0) return [];
    const ids = users.map((u) => u.id);
    const [enrols, links] = await Promise.all([
      this.prisma.enrol.findMany({ where: { user_id: { in: ids }, deleted_at: null }, orderBy: { id: 'desc' }, select: { user_id: true, course_id: true } }),
      this.prisma.cohort_students.findMany({ where: { user_id: { in: ids }, deleted_at: null }, select: { user_id: true, cohort_id: true } }),
    ]);
    const cohortIds = [...new Set(links.map((l) => intOf(l.cohort_id)).filter((id) => id > 0))];
    const cohorts = cohortIds.length > 0
      ? await this.prisma.cohorts.findMany({ where: { id: { in: cohortIds }, deleted_at: null }, select: { id: true, cohort_id: true, title: true } })
      : [];
    const cohortLabel = new Map(cohorts.map((c) => [c.id, text(c.cohort_id) || text(c.title) || `C${c.id}`]));
    const latestCourse = new Map<number, number>();
    for (const e of enrols) {
      if (e.user_id && e.course_id && !latestCourse.has(e.user_id)) latestCourse.set(e.user_id, e.course_id);
    }
    const titles = await this.courseTitles([...latestCourse.values(), ...users.map((u) => u.course_id)]);
    const cohortsByUser = new Map<number, string[]>();
    for (const l of links) {
      const label = cohortLabel.get(intOf(l.cohort_id));
      if (!l.user_id || !label) continue;
      const list = cohortsByUser.get(l.user_id) ?? [];
      if (!list.includes(label)) cohortsByUser.set(l.user_id, [...list, label]);
    }
    return users.map((u) => {
      const courseId = latestCourse.get(u.id) ?? u.course_id ?? 0;
      return {
        id: u.id,
        roll: text(u.student_id),
        name: text(u.name),
        cohort: (cohortsByUser.get(u.id) ?? []).join(', '),
        course: courseId ? titles.get(courseId) ?? '' : '',
        joined: istYmd(u.created_at),
        status: studentStatus({ status: u.status, disabled_at: u.disabled_at }),
      };
    });
  }

  // ─── Add / Edit ───────────────────────────────────────────────────────────

  async save(actor: number | null, payload: Record<string, unknown>): Promise<Outcome<SaveResult>> {
    const raw = payload.id;
    const hasId = raw !== undefined && raw !== null && text(raw) !== '';
    if (!hasId) return this.add(actor, payload);
    // A present but unreadable id is a broken edit, never a new centre.
    const id = intOf(raw);
    return id ? this.edit(actor, id, payload) : fail('Centre not found');
  }

  /** Field errors for a code already in use, another centre's phone/email, or another centre login's email. */
  private async conflicts(v: CentreValues, self: { centreId: number; code: string; phone: string; email: string; loginUserId: number | null } | null): Promise<FieldErrors> {
    const errors: FieldErrors = {};
    // An unchanged code (same number, e.g. "31" re-saved as "TTC0031") is never re-checked.
    const codeChanged = !self || !sameCentreCode(self.code, v.centre_code);
    if (v.centre_code && codeChanged
      && await isCentreCodeTaken(this.prisma, v.centre_code, self ? { centreId: self.centreId } : undefined)) {
      errors.centre_code = 'Centre ID already exists';
    }
    const phoneChanged = !self || digitsOnly(self.phone) !== digitsOnly(v.phone);
    const emailChanged = !self || self.email.toLowerCase() !== v.email.toLowerCase();
    if ((phoneChanged && v.phone) || (emailChanged && v.email)) {
      const others = await this.prisma.centres.findMany({
        where: {
          deleted_at: null,
          ...(self ? { id: { not: self.centreId } } : {}),
          OR: [
            ...(phoneChanged && v.phone ? [{ phone: v.phone, country_code: { in: dialVariants(v.country_code) } }] : []),
            ...(emailChanged && v.email ? [{ email: v.email }] : []),
          ],
        },
        select: { id: true, phone: true, email: true },
      });
      if (emailChanged && others.some((o) => text(o.email).toLowerCase() === v.email)) errors.email = 'Another centre already uses this email';
      if (phoneChanged && others.some((o) => digitsOnly(o.phone) === digitsOnly(v.phone))) errors.phone = 'Another centre already uses this mobile';
    }
    if (emailChanged && v.email && !errors.email) {
      const owners = await this.prisma.users.findMany({
        where: {
          deleted_at: null,
          OR: [{ user_email: v.email }, { email: v.email }],
          // ADD: another centre login (role 7) with this email. EDIT: any other user.
          ...(self ? {} : { role_id: CENTRE_ROLE_ID }),
        },
        select: { id: true },
      });
      const clash = owners.some((o) => o.id !== self?.loginUserId);
      if (clash) errors.email = self ? 'This email belongs to another user' : 'This email is already used by a centre login';
    }
    return errors;
  }

  private async add(actor: number | null, payload: Record<string, unknown>): Promise<Outcome<SaveResult>> {
    if (!(await this.kycReady())) return fail(NOT_SET_UP_MESSAGE);
    const merged = mergeForSave('add', readSubmitted(payload), EMPTY_VALUES);
    const v: CentreValues = { ...merged, country_code: merged.country_code || (isIndia(merged.country) ? '+91' : '') };
    const errors = { ...validateCentre(v, { mode: 'add', kycReady: true }) };
    Object.assign(errors, Object.fromEntries(Object.entries(await this.conflicts(v, null)).filter(([k]) => !(k in errors))));
    if (Object.keys(errors).length > 0) return failWith(FIELD_ERRORS_MESSAGE, { id: 0, code: v.centre_code, mode: 'add', errors });

    let created: { centreId: number; tempPassword: string };
    try {
      created = await this.prisma.$transaction(async (tx) => {
        // Re-checked inside the write to narrow the window between two adds; it is not a
        // lock (centres.centre_id has no UNIQUE index), so two adds in the same instant
        // could still both pass.
        if (await isCentreCodeTaken(tx, v.centre_code)) throw new CodeTakenError();
        return createCentreInTx(tx, {
          centreCode: v.centre_code,
          centreName: v.centre_name,
          contactPerson: v.contact_person,
          designation: v.designation,
          countryCode: v.country_code,
          phone: v.phone,
          email: v.email,
          address: v.address,
          country: v.country,
          state: v.state,
          district: v.district,
          registrationDoc: v.registration_doc,
          registrationDate: istToday(this.now().getTime()),
          expiryDate: v.affiliation_expiry ? ymdOfText(v.affiliation_expiry) : null,
          status: 1,
          kyc: kycInput(v),
          actorUserId: actor,
        });
      });
    } catch (error: unknown) {
      if (error instanceof CodeTakenError) {
        return failWith(FIELD_ERRORS_MESSAGE, { id: 0, code: v.centre_code, mode: 'add', errors: { centre_code: 'Centre ID already exists' } });
      }
      if (isMissingTable(error)) return fail(NOT_SET_UP_MESSAGE);
      throw error;
    }

    // Email only after the transaction committed (never for a rolled-back add).
    const send = this.deps.emailCredentials ?? emailCentreCredentials;
    const sent = await send({ contactPerson: v.contact_person, centreName: v.centre_name, email: v.email }, created.tempPassword);
    const data: SaveResult = { id: created.centreId, code: v.centre_code, mode: 'add', email_delivered: sent.emailDelivered };
    if (sent.emailError !== undefined) data.email_error = sent.emailError;
    const message = sent.emailDelivered
      ? `Centre "${v.centre_name}" added`
      : `Centre "${v.centre_name}" added, but the login email could not be sent. Use Resend Login Email.`;
    return { status: 1, message, data };
  }

  private async edit(actor: number | null, centreId: number, payload: Record<string, unknown>): Promise<Outcome<SaveResult>> {
    const centre = await this.prisma.centres.findFirst({ where: { id: centreId, deleted_at: null }, select: CENTRE_SELECT });
    if (!centre) return fail('Centre not found');
    const kycReady = await this.kycReady();
    const submitted = readSubmitted(payload);
    if (!kycReady && hasKycInput(submitted)) return fail(NOT_SET_UP_MESSAGE);
    const kyc = kycReady ? await this.prisma.centre_kyc.findUnique({ where: { centre_id: centreId } }) : null;

    const stored = storedValues(centre, kyc);
    const merged = mergeForSave('edit', submitted, stored);
    const v: CentreValues = { ...merged, country_code: merged.country_code || (isIndia(merged.country) ? '+91' : '') };
    const login = await this.prisma.users.findFirst({
      where: { role_id: CENTRE_ROLE_ID, centre_id: String(centreId), deleted_at: null },
      orderBy: { id: 'asc' },
      select: { id: true, name: true, phone: true, country_code: true, user_email: true, email: true },
    });
    const unchangedFiles = FILE_FIELDS.filter((f) => v[f] !== '' && v[f] === stored[f]);
    const errors = { ...validateCentre(v, { mode: 'edit', kycReady, unchangedFiles }) };
    const clash = await this.conflicts(v, {
      centreId, code: stored.centre_code, phone: stored.phone, email: stored.email, loginUserId: login?.id ?? null,
    });
    Object.assign(errors, Object.fromEntries(Object.entries(clash).filter(([k]) => !(k in errors))));
    if (Object.keys(errors).length > 0) return failWith(FIELD_ERRORS_MESSAGE, { id: centreId, code: v.centre_code, mode: 'edit', errors });

    const now = this.now();
    const phoneChanged = digitsOnly(stored.phone) !== digitsOnly(v.phone);
    const centreData: Prisma.centresUncheckedUpdateInput = {
      centre_id: v.centre_code,
      centre_name: v.centre_name,
      contact_person: v.contact_person,
      contact_person_designation: v.designation || null,
      country_code: v.country_code,
      phone: v.phone,
      // whatsapp mirrors the phone when it was never set apart from it.
      ...(phoneChanged && (!text(centre.whatsapp) || digitsOnly(centre.whatsapp) === digitsOnly(centre.phone)) ? { whatsapp: v.phone } : {}),
      email: v.email,
      address: v.address || null,
      country_id: v.country || null,
      state_id: v.state || null,
      district_id: v.district || null,
      // An unchanged file keeps its stored value (a legacy relative path stays relative).
      registraion_certificate: unchangedFiles.includes('registration_doc') ? centre.registraion_certificate : v.registration_doc || null,
      date_of_expiry: v.affiliation_expiry ? ymdOfText(v.affiliation_expiry) : null,
      updated_by: actor,
      updated_at: now,
    };
    const { logo: _logo, ...kycNew } = kycColumns(kycInput(v));
    const kycCols = {
      ...kycNew,
      ...(kyc && unchangedFiles.includes('id_doc') ? { id_doc: kyc.id_doc } : {}),
      ...(kyc && unchangedFiles.includes('pan_doc') ? { pan_doc: kyc.pan_doc } : {}),
    };

    try {
      await this.prisma.$transaction(async (tx) => {
        if (!sameCentreCode(stored.centre_code, v.centre_code) && await isCentreCodeTaken(tx, v.centre_code, { centreId })) {
          throw new CodeTakenError();
        }
        await tx.centres.update({ where: { id: centreId }, data: centreData });
        if (kycReady) {
          await tx.centre_kyc.upsert({
            where: { centre_id: centreId },
            create: { centre_id: centreId, ...kycCols, created_by: actor, updated_by: actor, created_at: now, updated_at: now },
            update: { ...kycCols, updated_by: actor, updated_at: now },
          });
        }
        if (login) {
          const loginData = loginUpdate(login, v, { name: stored.centre_name, phone: stored.phone, email: stored.email });
          if (loginData) await tx.users.update({ where: { id: login.id }, data: { ...loginData, updated_by: actor, updated_at: now } });
        }
      });
    } catch (error: unknown) {
      if (error instanceof CodeTakenError) {
        return failWith(FIELD_ERRORS_MESSAGE, { id: centreId, code: v.centre_code, mode: 'edit', errors: { centre_code: 'Centre ID already exists' } });
      }
      if (isMissingTable(error)) return fail(NOT_SET_UP_MESSAGE);
      throw error;
    }
    return { status: 1, message: `Centre "${v.centre_name}" updated`, data: { id: centreId, code: v.centre_code, mode: 'edit' } };
  }

  // ─── Status, documents, logo ──────────────────────────────────────────────

  /** Active / Inactive on centres.status only. The centre login is left as it is. */
  async setStatus(actor: number | null, centreId: number, status: string): Promise<Outcome<{ status: 'active' | 'inactive' }>> {
    const next = status.trim().toLowerCase();
    if (next !== 'active' && next !== 'inactive') return fail('Choose Active or Inactive.');
    const centre = centreId
      ? await this.prisma.centres.findFirst({ where: { id: centreId, deleted_at: null }, select: { id: true, centre_name: true } })
      : null;
    if (!centre) return fail('Centre not found');
    await this.prisma.centres.update({
      where: { id: centreId },
      data: { status: next === 'active' ? 1 : 0, updated_by: actor, updated_at: this.now() },
    });
    const label = next === 'active' ? 'Active' : 'Inactive';
    return { status: 1, message: `${text(centre.centre_name) || 'Centre'} marked ${label}`, data: { status: next } };
  }

  async addDocument(actor: number | null, payload: Record<string, unknown>): Promise<Outcome<{ id: number }>> {
    const centreId = intOf(payload.centre_id);
    const title = text(payload.title);
    const fileUrl = text(payload.file_url);
    const docType = text(payload.doc_type) || DOC_TYPE_UPLOADED;
    if (!title) return fail('Give the document a name.');
    if (title.length > 250) return fail('The document name is too long (250 characters at most).');
    if (!fileUrl || !isHttpUrl(fileUrl) || fileUrl.length > 500) return fail('Upload the file again: the file link is missing or invalid.');
    if (docType.length > 60) return fail('The document type is too long (60 characters at most).');
    const centre = centreId ? await this.prisma.centres.findFirst({ where: { id: centreId, deleted_at: null }, select: { id: true } }) : null;
    if (!centre) return fail('Centre not found');
    try {
      const row = await this.prisma.centre_documents.create({
        data: { centre_id: centreId, title, doc_type: docType, file_url: fileUrl, created_by: actor, created_at: this.now() },
        select: { id: true },
      });
      return { status: 1, message: 'Document uploaded', data: { id: row.id } };
    } catch (error: unknown) {
      if (isMissingTable(error)) return fail(NOT_SET_UP_MESSAGE);
      throw error;
    }
  }

  /** Soft delete of an UPLOADED document (centre_documents). Registration / KYC files are changed through Edit Centre. */
  async deleteDocument(actor: number | null, documentId: number, centreId = 0): Promise<Outcome> {
    if (!documentId || !centreId) return fail('Document not found');
    try {
      const res = await this.prisma.centre_documents.updateMany({
        where: { id: documentId, deleted_at: null, centre_id: centreId },
        data: { deleted_at: this.now(), deleted_by: actor },
      });
      return res.count > 0 ? { status: 1, message: 'Document deleted' } : fail('Document not found');
    } catch (error: unknown) {
      if (isMissingTable(error)) return fail(NOT_SET_UP_MESSAGE);
      throw error;
    }
  }

  /** centre_kyc.logo; an empty url removes the logo. */
  async setLogo(actor: number | null, centreId: number, url: string): Promise<Outcome<{ logo: string }>> {
    const logo = url.trim();
    if (logo && (!isHttpUrl(logo) || logo.length > 500)) return fail('Upload the logo again: the file link is invalid.');
    const centre = centreId ? await this.prisma.centres.findFirst({ where: { id: centreId, deleted_at: null }, select: { id: true } }) : null;
    if (!centre) return fail('Centre not found');
    const now = this.now();
    try {
      await this.prisma.centre_kyc.upsert({
        where: { centre_id: centreId },
        create: { centre_id: centreId, logo: logo || null, created_by: actor, updated_by: actor, created_at: now, updated_at: now },
        update: { logo: logo || null, updated_by: actor, updated_at: now },
      });
      return { status: 1, message: logo ? 'Logo updated' : 'Logo removed', data: { logo } };
    } catch (error: unknown) {
      if (isMissingTable(error)) return fail(NOT_SET_UP_MESSAGE);
      throw error;
    }
  }
}

/**
 * What changes on the centre's role-7 login when its centre is edited; null
 * when nothing does. A login value follows the centre ONLY when the centre's
 * value changed in this edit AND the login still held the old centre value
 * (or nothing): a login deliberately set apart from the centre is left alone.
 */
export function loginUpdate(
  login: { name: string | null; phone: string | null; country_code: string | null; user_email: string | null; email: string | null },
  v: CentreValues,
  previous: { name: string; phone: string; email: string },
): Prisma.usersUncheckedUpdateInput | null {
  const data: Prisma.usersUncheckedUpdateInput = {};
  const followed = (current: string | null, old: string, eq: (a: string, b: string) => boolean) => {
    const c = text(current);
    return c === '' || eq(c, old);
  };
  const same = (a: string, b: string) => a === b;
  const sameEmail = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  const samePhone = (a: string, b: string) => digitsOnly(a) === digitsOnly(b);

  if (v.centre_name !== previous.name && followed(login.name, previous.name, same)) data.name = v.centre_name;
  if (!samePhone(v.phone, previous.phone) && followed(login.phone, previous.phone, samePhone)) {
    data.phone = v.phone;
    if (v.country_code) data.country_code = v.country_code;
  }
  if (!sameEmail(v.email, previous.email)) {
    if (followed(login.user_email, previous.email, sameEmail)) data.user_email = v.email;
    const legacy = text(login.email);
    if (legacy && sameEmail(legacy, previous.email)) data.email = v.email;
  }
  return Object.keys(data).length > 0 ? data : null;
}
