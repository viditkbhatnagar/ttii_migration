/**
 * Seed MongoDB from MySQL dump (lms_ttii.sql).
 *
 * Parses the MySQL dump file, extracts INSERT statements, maps integer IDs to
 * MongoDB ObjectIds, and inserts records via Prisma Client.
 *
 * Uses Prisma DMMF to filter out unknown columns and coerce types.
 *
 * Usage:  cd apps/api && npx tsx prisma/seed-from-sql.ts
 */
import { randomBytes, scryptSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Prisma } from '@prisma/client';

import { createPrismaClient } from '../src/data/prisma-client.js';

const DATABASE_URL = process.env.DATABASE_URL ?? 'mongodb://localhost:27017/ttii_lms';
const SQL_FILE = process.env.SQL_FILE ?? resolve(import.meta.dirname, '../../../lms_ttii.sql');

const prisma = createPrismaClient(DATABASE_URL);

// ─── Prisma DMMF: valid fields + types per model ────────────────────────────

type FieldInfo = { name: string; type: string; isList: boolean; isRequired: boolean };

const MODEL_FIELDS = new Map<string, Map<string, FieldInfo>>();
const MODEL_PRISMA_NAME = new Map<string, string>(); // dbName/name → prisma delegate name
const MODEL_UNIQUE_FIELDS = new Map<string, Set<string>>(); // fields with @unique

for (const model of Prisma.dmmf.datamodel.models) {
  const fields = new Map<string, FieldInfo>();
  const uniqueFields = new Set<string>();

  for (const f of model.fields) {
    if (f.relationName) continue;
    if (f.name === 'id') continue;
    fields.set(f.name, { name: f.name, type: f.type, isList: f.isList, isRequired: f.isRequired });
    if (f.isUnique) uniqueFields.add(f.name);
  }

  MODEL_FIELDS.set(model.name, fields);
  MODEL_PRISMA_NAME.set(model.name, model.name);
  MODEL_UNIQUE_FIELDS.set(model.name, uniqueFields);

  if (model.dbName && model.dbName !== model.name) {
    MODEL_FIELDS.set(model.dbName, fields);
    MODEL_PRISMA_NAME.set(model.dbName, model.name);
    MODEL_UNIQUE_FIELDS.set(model.dbName, uniqueFields);
  }
}

// ─── ID Mapping ─────────────────────────────────────────────────────────────
const idMap = new Map<string, Map<number, string>>();

function setMappedId(table: string, oldId: number, newId: string): void {
  if (!idMap.has(table)) idMap.set(table, new Map());
  idMap.get(table)!.set(oldId, newId);
}

function getMappedId(table: string, oldId: number | null | undefined): string | null {
  if (oldId == null || oldId === 0) return null;
  return idMap.get(table)?.get(oldId) ?? null;
}

// ─── SQL Parsing ────────────────────────────────────────────────────────────

type ParsedInsert = { table: string; columns: string[]; rows: Array<Array<string | number | null>> };

function parseSqlDump(sql: string): ParsedInsert[] {
  const inserts: ParsedInsert[] = [];
  const insertRegex = /INSERT\s+INTO\s+`?(\w+)`?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);\s*$/gm;

  let match: RegExpExecArray | null;
  while ((match = insertRegex.exec(sql)) !== null) {
    const table = match[1];
    const columns = match[2].split(',').map((c) => c.trim().replace(/`/g, ''));
    const rows = parseValueRows(match[3]);
    inserts.push({ table, columns, rows });
  }
  return inserts;
}

function parseValueRows(valuesStr: string): Array<Array<string | number | null>> {
  const rows: Array<Array<string | number | null>> = [];
  let i = 0;
  const len = valuesStr.length;

  while (i < len) {
    while (i < len && valuesStr[i] !== '(') i++;
    if (i >= len) break;
    i++;

    const values: Array<string | number | null> = [];
    while (i < len && valuesStr[i] !== ')') {
      while (i < len && valuesStr[i] === ' ') i++;
      if (valuesStr[i] === ')') break;
      if (valuesStr[i] === ',') { i++; continue; }

      if (valuesStr.slice(i, i + 4) === 'NULL') {
        values.push(null); i += 4;
      } else if (valuesStr[i] === "'") {
        i++;
        let str = '';
        while (i < len) {
          if (valuesStr[i] === '\\' && i + 1 < len) {
            const next = valuesStr[i + 1];
            if (next === "'") { str += "'"; i += 2; }
            else if (next === '\\') { str += '\\'; i += 2; }
            else if (next === 'n') { str += '\n'; i += 2; }
            else if (next === 'r') { str += '\r'; i += 2; }
            else if (next === 't') { str += '\t'; i += 2; }
            else if (next === '0') { str += '\0'; i += 2; }
            else { str += next; i += 2; }
          } else if (valuesStr[i] === "'" && i + 1 < len && valuesStr[i + 1] === "'") {
            str += "'"; i += 2;
          } else if (valuesStr[i] === "'") { i++; break; }
          else { str += valuesStr[i]; i++; }
        }
        values.push(str);
      } else {
        let numStr = '';
        while (i < len && valuesStr[i] !== ',' && valuesStr[i] !== ')' && valuesStr[i] !== ' ') {
          numStr += valuesStr[i]; i++;
        }
        const num = Number(numStr);
        values.push(Number.isFinite(num) ? num : numStr);
      }
    }
    if (valuesStr[i] === ')') i++;
    rows.push(values);
  }
  return rows;
}

function rowToRecord(columns: string[], values: Array<string | number | null>): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (let i = 0; i < columns.length && i < values.length; i++) {
    record[columns[i]] = values[i];
  }
  return record;
}

// ─── FK Mappings ────────────────────────────────────────────────────────────

const FK_MAPPINGS: Record<string, Record<string, string>> = {
  users: { centre_id: 'centres', course_id: 'course' },
  auth_session: { user_id: 'users' },
  password_reset_token: { user_id: 'users' },
  otp_challenge: { user_id: 'users' },
  auth_audit_log: { user_id: 'users' },
  permission_relationship: { permission_id: 'permission', role_id: 'role' },
  wallet_transactions: { centre_id: 'centres' },
  centre_fundrequests: { centre_id: 'centres', user_id: 'users' },
  centre_course_plans: { centre_id: 'centres', course_id: 'course' },
  applications: { pipeline_user: 'users', course_id: 'course', batch_id: 'batch' },
  qualification: { user_id: 'users' },
  student_document: { student_id: 'users' },
  folder: { parent_id: 'folder', centre_id: 'centres' },
  file: { folder_id: 'folder', centre_id: 'centres' },
  course: { category_id: 'category' },
  course_package: { category_id: 'category', course_id: 'course' },
  subject_package: { package_id: 'package', subject_id: 'subject' },
  package_features: { package_id: 'package' },
  coupon_code: { package_id: 'package', user_id: 'users' },
  create_order: { user_id: 'users', course_id: 'course' },
  subject: { course_id: 'course', master_subject_id: 'subject' },
  lesson: { course_id: 'course', subject_id: 'subject' },
  lesson_files: { lesson_id: 'lesson', parent_file_id: 'lesson_files' },
  demo_video: { course_id: 'course' },
  vimeo_videolinks: { lesson_file_id: 'lesson_files' },
  books_chapters: { book_id: 'books' },
  short_videos: { course_id: 'course' },
  stories: { course_id: 'course' },
  events: { instructor_id: 'users' },
  recorded_events: { event_id: 'events' },
  event_registration: { user_id: 'users', event_id: 'events' },
  feed: { feed_category_id: 'feed_category', course_id: 'course', instructor_id: 'users' },
  feed_watched: { feed_id: 'feed', user_id: 'users' },
  feed_like: { feed_id: 'feed', user_id: 'users' },
  feed_comments: { feed_id: 'feed', user_id: 'users' },
  feed_bookmarks: { user_id: 'users', feed_id: 'feed' },
  review: { course_id: 'course', event_id: 'events', user_id: 'users' },
  review_like: { review_id: 'review', user_id: 'users' },
  instructor_enrol: { instructor_id: 'users', course_id: 'course' },
  instructor_students: { student_id: 'users', instructor_id: 'users', course_id: 'course' },
  cohorts: { subject_id: 'subject', course_id: 'course', language_id: 'language', centre_id: 'centres', instructor_id: 'users' },
  live_class: { cohort_id: 'cohorts' },
  cohort_students: { cohort_id: 'cohorts', user_id: 'users' },
  batch_students: { batch_id: 'batch', user_id: 'users' },
  enrol: { user_id: 'users', course_id: 'course', package_id: 'package', batch_id: 'batch', pipeline_user: 'users' },
  payment_info: { user_id: 'users', course_id: 'course', account_id: 'users', package_id: 'package', coupon_id: 'coupon_code' },
  student_fee: { user_id: 'users', course_id: 'course' },
  student_payments: { user_id: 'users', course_id: 'course' },
  orders: { user_id: 'users' },
  salary_settings: { course_id: 'course' },
  video_progress_status: { user_id: 'users', course_id: 'course', lesson_file_id: 'lesson_files' },
  material_progress: { user_id: 'users', course_id: 'course', lesson_file_id: 'lesson_files' },
  last_video: { user_id: 'users', section_id: 'subject', video_id: 'lesson_files' },
  quiz: { lesson_file_id: 'lesson_files' },
  practice_attempt: { user_id: 'users', lesson_file_id: 'lesson_files' },
  practice_answer: { user_id: 'users', attempt_id: 'practice_attempt', question_id: 'quiz' },
  exam: { course_id: 'course', subject_id: 'subject', lesson_id: 'lesson', batch_id: 'batch' },
  question_bank: { lesson_id: 'lesson', subject_id: 'subject', course_id: 'course', category_id: 'category' },
  exam_questions: { exam_id: 'exam', question_id: 'question_bank' },
  exam_attempt: { user_id: 'users', exam_id: 'exam' },
  exam_answer: { user_id: 'users', exam_id: 'exam', attempt_id: 'exam_attempt', question_id: 'question_bank' },
  tasks: { lesson_id: 'lesson' },
  assignment: { course_id: 'course', cohort_id: 'cohorts' },
  saved_assignments: { user_id: 'users', assignment_id: 'assignment' },
  assignment_submissions: { user_id: 'users', cohort_id: 'cohorts', assignment_id: 'assignment', course_id: 'course' },
  notification: { course_id: 'course' },
  notification_read: { notification_id: 'notification', user_id: 'users' },
  support_chat: { chat_id: 'users', sender_id: 'users' },
  zoom_history: { user_id: 'users', live_id: 'live_class' },
  enquiry_form: { abroad_course_id: 'course', course_category_id: 'category' },
  contact_form: { course_id: 'course' },
  refer_a_friend: { user_id: 'users' },
  user_details: { user_id: 'users' },
  students: { user_id: 'users', course_id: 'course', batch_id: 'batch' },
  premium: { user_id: 'users', course_id: 'course' },
  banners: { course_id: 'course' },
  entrance_exam: { course_id: 'course' },
  entrance_exam_registration: { entrance_exam_id: 'entrance_exam', course_id: 'course' },
  entrance_exam_result: { entrance_exam_id: 'entrance_exam', registration_id: 'entrance_exam_registration' },
  counsellor_target: { user_id: 'users' },
  associate_target: { user_id: 'users' },
  document_request: { student_id: 'users' },
  mentorship_session: { student_id: 'users' },
  testimonial: { course_id: 'course' },
  favourites: { item_id: 'users', user_id: 'users', course_id: 'course' },
  flag: { user_id: 'users' },
  flag_lesson: { lesson_files_id: 'lesson_files', user_id: 'users' },
  assignment_reminders: { assignment_id: 'assignment', user_id: 'users' },
  payment_reminders: { user_id: 'users', course_id: 'course' },
  live_class_reminders: { live_class_id: 'live_class', user_id: 'users' },
  message: { thread_id: 'message_thread', sender_id: 'users' },
  message_thread: { user_one: 'users', user_two: 'users' },
  message_read_status: { message_id: 'message', user_id: 'users' },
};

const AUDIT_FIELDS = new Set(['created_by', 'updated_by', 'deleted_by']);

const DATETIME_FIELDS = new Set([
  'created_at', 'updated_at', 'deleted_at', 'created_on', 'updated_on',
  'date_added', 'last_modified', 'datetime', 'start_date', 'end_date',
  'from_date', 'to_date', 'enrollment_date', 'date_of_birth', 'due_date',
  'event_date', 'publish_date', 'expiry_date', 'exam_date', 'dispatch_date',
  'delivery_date', 'added_date', 'date', 'expires_at', 'used_at',
  'revoked_at', 'join_date', 'paid_date', 'order_date', 'date_time',
  'date_of_registration', 'date_of_expiry', 'payment_date', 'sent_at',
  'read_at', 'create_date', 'dob', 'followup_date', 'date_of_joining',
  'drop_out_at',
]);

// ─── Table ordering ─────────────────────────────────────────────────────────

const TABLE_ORDER = [
  'role', 'permission', 'category', 'batch', 'language', 'settings',
  'frontend_settings', 'app_version', 'faq', 'source', 'about',
  'features', 'countries', 'state', 'districts', 'currency',
  'module', 'live_settings', 'zoom_settings', 'feed_category',
  'users', 'centres', 'course', 'notification', 'permission_relationship',
  'applications', 'subject', 'enrol', 'cohorts', 'exam',
  'assignment', 'events', 'feed', 'training_videos', 'banners',
  'demo_video', 'centre_course_plans', 'wallet_transactions',
  'centre_fundrequests', 'qualification', 'student_document',
  'user_details', 'students', 'books', 'enquiry', 'enquiry_form',
  'contact_form', 'testimonial', 'short_videos', 'stories',
  'circular', 'entrance_exam', 'mentorship_session', 'premium',
  'folder', 'coupon_code', 'refer_a_friend', 'counsellor_target',
  'associate_target', 'document_request', 'salary_settings',
  'instructor_enrol', 'instructor_students', 'review',
  'notification_read', 'support_chat', 'message_thread',
  'batch_students', 'flag', 'favourites', 'orders',
  'lesson', 'cohort_students', 'live_class', 'student_fee',
  'student_payments', 'payment_info', 'create_order',
  'course_package', 'question_bank', 'exam_questions',
  'event_registration', 'recorded_events', 'books_chapters',
  'subject_package', 'entrance_exam_registration', 'saved_assignments',
  'assignment_submissions', 'feed_watched', 'feed_like',
  'feed_comments', 'feed_bookmarks', 'review_like', 'file',
  'message', 'message_read_status',
  'lesson_files', 'topic', 'tasks',
  'exam_attempt', 'exam_answer', 'practice_attempt', 'practice_answer',
  'vimeo_videolinks', 'quiz', 'video_progress_status',
  'material_progress', 'last_video', 'lesson_files_report',
  'zoom_history', 'assignment_reminders', 'payment_reminders',
  'live_class_reminders', 'flag_lesson', 'package_features',
  'entrance_exam_result',
];

// SQL table → Prisma model delegate name (when they differ)
const SQL_TO_PRISMA_MODEL: Record<string, string> = {
  package: 'course_package',
  state: 'india_state',
};

function getPrismaModelName(sqlTable: string): string {
  return SQL_TO_PRISMA_MODEL[sqlTable] ?? sqlTable;
}

const SKIP_TABLES = new Set([
  'ci_sessions', 'country',
  'languages',     // SQL languages table = phrase translations, not our language model
  'language',       // SQL language table = phrase translations (phrase_id, phrase, english, Bengali)
  'files', 'folders', 'feed_likes', 'associates_target',
  'cohort_announcements', 'coupon_code_apply', 'coupon_code_new',
  'course_fees', 'enrol_ins', 'event_register_create_order',
  'event_register_payment_info', 'google_form_registration',
  'question', 'resources', 'tag',
]);

const TABLE_NAME_MAP: Record<string, string> = {
  files: 'file',
  folders: 'folder',
  feed_likes: 'feed_like',
  associates_target: 'associate_target',
};

// ─── Type coercion ──────────────────────────────────────────────────────────

function toDateValue(val: string | number | null): Date | null {
  if (val === null || val === '0000-00-00 00:00:00' || val === '0000-00-00') return null;
  if (typeof val === 'number') {
    if (val > 1_000_000_000 && val < 3_000_000_000) return new Date(val * 1000);
    return null;
  }
  if (typeof val === 'string') {
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function coerceValue(val: unknown, fieldInfo: FieldInfo): unknown {
  if (val === null) return null;

  switch (fieldInfo.type) {
    case 'String':
      if (typeof val === 'number') return String(val);
      if (typeof val === 'boolean') return String(val);
      return val;

    case 'Int':
      if (typeof val === 'string') {
        const parsed = Number.parseInt(val, 10);
        return Number.isFinite(parsed) ? parsed : null;
      }
      if (typeof val === 'number') return Math.trunc(val);
      return val;

    case 'Float':
      if (typeof val === 'string') {
        const parsed = Number.parseFloat(val);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return val;

    case 'Boolean':
      if (typeof val === 'number') return val !== 0;
      if (typeof val === 'string') return val === '1' || val.toLowerCase() === 'true';
      return val;

    case 'DateTime':
      return toDateValue(val as string | number | null);

    default:
      return val;
  }
}

// ─── Transform & Filter ─────────────────────────────────────────────────────

function transformRecord(
  table: string,
  columns: string[],
  values: Array<string | number | null>,
  fieldMap: Map<string, FieldInfo>,
): Record<string, unknown> {
  const raw = rowToRecord(columns, values);
  const result: Record<string, unknown> = {};
  const tableFks = FK_MAPPINGS[table] ?? {};
  const uniqueFields = MODEL_UNIQUE_FIELDS.get(table) ?? new Set();

  for (const [col, val] of Object.entries(raw)) {
    if (col === 'id' || col === 'student_document_id' || col === 'book_id') continue;

    const fieldInfo = fieldMap.get(col);
    if (!fieldInfo) continue;

    // Map FK fields to ObjectIds
    if (col in tableFks && typeof val === 'number') {
      result[col] = getMappedId(tableFks[col], val);
      continue;
    }

    // Map audit fields to user ObjectIds
    if (AUDIT_FIELDS.has(col) && typeof val === 'number') {
      result[col] = getMappedId('users', val);
      continue;
    }

    // Datetime coercion
    if (fieldInfo.type === 'DateTime' || DATETIME_FIELDS.has(col)) {
      result[col] = toDateValue(val as string | number | null);
      continue;
    }

    // Type coercion
    let coerced = coerceValue(val, fieldInfo);

    // Convert empty strings to null for unique fields (prevents constraint violations)
    if (uniqueFields.has(col) && typeof coerced === 'string' && coerced.trim() === '') {
      coerced = null;
    }

    // Skip null values for required fields — let Prisma apply defaults
    if (coerced === null && fieldInfo.isRequired) {
      continue;
    }

    result[col] = coerced;
  }

  return result;
}

// ─── Seed a single table ────────────────────────────────────────────────────

async function seedTable(table: string, inserts: ParsedInsert[]): Promise<number> {
  const normalizedTable = TABLE_NAME_MAP[table] ?? table;
  const prismaModel = getPrismaModelName(normalizedTable);

  const fieldMap = MODEL_FIELDS.get(prismaModel);
  if (!fieldMap) {
    console.log(`  [skip] ${table} — no Prisma field info for '${prismaModel}'`);
    return 0;
  }

  const delegate = (prisma as Record<string, unknown>)[prismaModel] as {
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  } | undefined;

  if (!delegate) {
    console.log(`  [skip] ${table} — no Prisma delegate '${prismaModel}'`);
    return 0;
  }

  let count = 0;
  let errors = 0;
  let dupes = 0;

  for (const insert of inserts) {
    for (const row of insert.rows) {
      try {
        const data = transformRecord(normalizedTable, insert.columns, row, fieldMap);
        const created = await delegate.create({ data });

        const oldIdIdx = insert.columns.indexOf('id');
        const oldIdValue = oldIdIdx >= 0 ? row[oldIdIdx] : row[0];
        if (typeof oldIdValue === 'number') {
          setMappedId(normalizedTable, oldIdValue, created.id);
        }

        count++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isDupe = msg.includes('E11000') || msg.includes('Unique constraint');
        if (isDupe) { dupes++; continue; }
        errors++;
        if (errors <= 1) {
          // Show the last 400 chars (actual error reason is at the end)
          console.error(`  [error] ${table}: ...${msg.slice(-400)}`);
        }
      }
    }
  }

  if (errors > 2) {
    console.log(`  [${table}] ... and ${errors - 2} more errors suppressed`);
  }
  if (dupes > 0) {
    console.log(`  [${table}] ${dupes} duplicate key errors skipped`);
  }

  return count;
}

// ─── Test users ─────────────────────────────────────────────────────────────

function hashPasswordSync(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const key = scryptSync(plain, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt}$${key.toString('hex')}`;
}

async function createTestUsers(): Promise<void> {
  const now = new Date();
  const testUsers = [
    { name: 'Admin',   email: 'admin@ttii.test',   password: 'Admin@123',   role_id: 1, phone: '9000000001' },
    { name: 'Student', email: 'student@ttii.test', password: 'Student@123', role_id: 2, phone: '9000000002', student_id: 'TT00TEST01' },
    { name: 'Centre',  email: 'centre@ttii.test',  password: 'Centre@123',  role_id: 7, phone: '9000000003' },
  ];

  for (const user of testUsers) {
    try {
      const created = await prisma.users.create({
        data: {
          name: user.name,
          email: user.email,
          user_email: user.email,
          password: hashPasswordSync(user.password),
          role_id: user.role_id,
          phone: user.phone,
          student_id: 'student_id' in user ? user.student_id : null,
          status: 1,
          premium: 0,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
      console.log(`  [created] ${user.email} (role_id=${user.role_id}, id=${created.id})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [error] ${user.email}: ${msg.slice(0, 200)}`);
    }
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('=== TTII MongoDB Seed from SQL Dump ===\n');
  console.log(`Reading SQL dump: ${SQL_FILE}`);

  const sql = readFileSync(SQL_FILE, 'utf-8');
  console.log(`File size: ${(sql.length / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Prisma models loaded: ${MODEL_FIELDS.size}`);

  console.log('\nParsing INSERT statements...');
  const allInserts = parseSqlDump(sql);

  const insertsByTable = new Map<string, ParsedInsert[]>();
  for (const insert of allInserts) {
    if (!insertsByTable.has(insert.table)) insertsByTable.set(insert.table, []);
    insertsByTable.get(insert.table)!.push(insert);
  }

  console.log(`Found ${allInserts.length} INSERT statements across ${insertsByTable.size} tables.\n`);

  let totalRows = 0;
  const seeded: string[] = [];

  for (const table of TABLE_ORDER) {
    if (SKIP_TABLES.has(table)) continue;
    const tableInserts = insertsByTable.get(table);
    if (!tableInserts || tableInserts.length === 0) continue;

    const count = await seedTable(table, tableInserts);
    if (count > 0) {
      console.log(`  [seeded] ${table}: ${count} records`);
      seeded.push(`${table} (${count})`);
      totalRows += count;
    }
  }

  for (const [table, tableInserts] of insertsByTable) {
    if (SKIP_TABLES.has(table)) continue;
    if (TABLE_ORDER.includes(table)) continue;
    const count = await seedTable(table, tableInserts);
    if (count > 0) {
      console.log(`  [seeded] ${table}: ${count} records (unordered)`);
      seeded.push(`${table} (${count})`);
      totalRows += count;
    }
  }

  console.log('\nCreating test users...');
  await createTestUsers();

  console.log('\n=== Seed Complete ===');
  console.log(`Total records: ${totalRows}`);
  console.log(`Tables seeded: ${seeded.length}`);
}

main()
  .catch((err: unknown) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
