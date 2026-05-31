import type { PrismaClient, content_asset, quiz_question } from '@prisma/client';
import { getPrismaClient } from '../data/prisma-client.js';

// Legacy lesson_files content was uploaded by the old PHP LMS and lives at
// `lms.teachersindia.in/uploads/...`. APP_BASE_URL on the new droplet
// points at the dead `api.teachersindia.in` host (per the note in
// CLAUDE.md), so we don't use it here. Anything matching `uploads/...` or
// `uploads/lesson_files/...` resolves against the legacy files host;
// anything else (Vimeo, YouTube, S3 CDN, full URLs already in the DB)
// passes through unchanged.
const LEGACY_FILES_BASE_URL = 'https://lms.teachersindia.in';

function toFileUrl(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // Defensive: if a row was previously stamped with the dead api host,
    // rewrite it on the way out so downstream UIs don't break.
    if (trimmed.startsWith('https://api.teachersindia.in/') || trimmed.startsWith('http://api.teachersindia.in/')) {
      return trimmed.replace(/^https?:\/\/api\.teachersindia\.in/, LEGACY_FILES_BASE_URL);
    }
    return trimmed;
  }
  if (trimmed.startsWith('//')) return trimmed;
  return `${LEGACY_FILES_BASE_URL}/${trimmed.replace(/^\/+/, '')}`;
}

/** Rewrite embedded asset references inside HTML content (article bodies)
 * so any <img src> / <a href> / <video src> pointing at the dead
 * api.teachersindia.in host or at a relative `uploads/...` path resolves
 * against the live legacy files host. Leaves all other URLs untouched. */
function rewriteHtmlAssetUrls(html: string | null | undefined): string {
  if (!html) return '';
  const s = String(html);
  return s
    .replace(/https?:\/\/api\.teachersindia\.in/g, LEGACY_FILES_BASE_URL)
    .replace(/(src|href)=("|')\/?(uploads\/)/g, `$1=$2${LEGACY_FILES_BASE_URL}/$3`);
}

export type QuizQuestionInput = {
  id?: string | undefined;
  question: string;
  option_a?: string | undefined;
  option_b?: string | undefined;
  option_c?: string | undefined;
  option_d?: string | undefined;
  correct_answer: string;
  sort_order?: number | undefined;
};

export type ContentAssetInput = {
  title: string;
  summary?: string | undefined;
  asset_type: string;
  subject_tag?: string | undefined;
  lesson_tag?: string | undefined;
  lesson_id?: number | null | undefined;
  language?: string | undefined;
  duration?: string | undefined;
  provider?: string | undefined;
  video_url?: string | undefined;
  download_url?: string | undefined;
  attachment?: string | undefined;
  audio_file?: string | undefined;
  thumbnail?: string | undefined;
  tags?: string | undefined;
  time_limit_seconds?: number | undefined;
  attempts_allowed?: number | undefined;
  pass_marks?: number | undefined;
  shuffle_questions?: boolean | undefined;
  questions?: QuizQuestionInput[] | undefined;
};

export type ContentAssetFilters = {
  assetType?: string;
  search?: string;
  subjectTag?: string;
  lessonTag?: string;
  language?: string;
};

function toIntId(id: string | number | null | undefined): number {
  if (typeof id === 'number') return id;
  if (!id) return 0;
  const n = parseInt(String(id), 10);
  return Number.isFinite(n) ? n : 0;
}

function toNullableIntId(id: string | number | null | undefined): number | null {
  if (id === null || id === undefined || id === '') return null;
  if (typeof id === 'number') return id;
  const n = parseInt(String(id), 10);
  return Number.isFinite(n) ? n : null;
}

function serializeQuestion(row: quiz_question): Record<string, unknown> {
  return {
    id: String(row.id),
    asset_id: String(row.asset_id),
    question: row.question,
    option_a: row.option_a ?? '',
    option_b: row.option_b ?? '',
    option_c: row.option_c ?? '',
    option_d: row.option_d ?? '',
    correct_answer: row.correct_answer,
    sort_order: row.sort_order ?? 0,
  };
}

function serializeAsset(
  row: content_asset,
  extras: {
    question_count?: number | undefined;
    questions?: Record<string, unknown>[] | undefined;
    created_by_name?: string | undefined;
  } = {},
): Record<string, unknown> {
  const { question_count, questions, created_by_name } = extras;
  const out: Record<string, unknown> = {
    id: String(row.id),
    content_id: `CA-${String(row.id).padStart(5, '0')}`,
    title: row.title,
    summary: rewriteHtmlAssetUrls(row.summary),
    asset_type: row.asset_type,
    subject_tag: row.subject_tag ?? '',
    lesson_tag: row.lesson_tag ?? '',
    lesson_id: row.lesson_id ?? null,
    sort_order: row.sort_order ?? 0,
    language: row.language ?? '',
    duration: row.duration ?? '',
    provider: row.provider ?? '',
    video_url: toFileUrl(row.video_url),
    download_url: toFileUrl(row.download_url),
    attachment: toFileUrl(row.attachment),
    audio_file: toFileUrl(row.audio_file),
    thumbnail: toFileUrl(row.thumbnail),
    tags: row.tags ?? '',
    time_limit_seconds: row.time_limit_seconds ?? null,
    attempts_allowed: row.attempts_allowed ?? null,
    pass_marks: row.pass_marks ?? null,
    shuffle_questions: Boolean(row.shuffle_questions),
    created_by: row.created_by,
    created_by_name: created_by_name ?? '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  if (question_count !== undefined) out.question_count = question_count;
  if (questions !== undefined) out.questions = questions;
  return out;
}

function normalizeCorrectAnswer(v: string): string {
  const upper = (v || '').toUpperCase();
  return ['A', 'B', 'C', 'D'].includes(upper) ? upper : 'A';
}

export class ContentAssetService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  async listAssets(filters?: ContentAssetFilters): Promise<Record<string, unknown>[]> {
    const where: Record<string, unknown> = { deleted_at: null };
    if (filters?.assetType) where.asset_type = filters.assetType;
    if (filters?.subjectTag) where.subject_tag = filters.subjectTag;
    if (filters?.lessonTag) where.lesson_tag = filters.lessonTag;
    if (filters?.language) where.language = filters.language;
    if (filters?.search) where.title = { contains: filters.search };

    const rows = await this.prisma.content_asset.findMany({
      where,
      orderBy: { id: 'desc' },
    });
    if (rows.length === 0) return [];

    const quizIds = rows.filter((r) => r.asset_type === 'quiz').map((r) => r.id);
    const userIds = Array.from(
      new Set(rows.map((r) => r.created_by).filter((v): v is number => typeof v === 'number')),
    );

    const [questionCounts, users] = await Promise.all([
      quizIds.length
        ? this.prisma.quiz_question.groupBy({
            by: ['asset_id'],
            where: { asset_id: { in: quizIds } },
            _count: { id: true },
          })
        : Promise.resolve([] as { asset_id: number; _count: { id: number } }[]),
      userIds.length
        ? this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
        : Promise.resolve([] as { id: number; name: string | null }[]),
    ]);

    const questionCountMap = new Map<number, number>();
    for (const q of questionCounts) questionCountMap.set(q.asset_id, q._count.id);
    const userMap = new Map<number, string>();
    for (const u of users) userMap.set(u.id, u.name ?? '');

    return rows.map((r) =>
      serializeAsset(r, {
        question_count: r.asset_type === 'quiz' ? questionCountMap.get(r.id) ?? 0 : undefined,
        created_by_name: r.created_by ? userMap.get(r.created_by) ?? '' : '',
      }),
    );
  }

  async getAsset(assetId: string): Promise<Record<string, unknown> | null> {
    const id = toIntId(assetId);
    if (!id) return null;
    const row = await this.prisma.content_asset.findFirst({ where: { id, deleted_at: null } });
    if (!row) return null;
    let questions: Record<string, unknown>[] = [];
    if (row.asset_type === 'quiz') {
      const qs = await this.prisma.quiz_question.findMany({
        where: { asset_id: id },
        orderBy: { sort_order: 'asc' },
      });
      questions = qs.map(serializeQuestion);
    }
    const createdByName = row.created_by
      ? (await this.prisma.users.findFirst({ where: { id: row.created_by }, select: { name: true } }))?.name ?? ''
      : '';
    return serializeAsset(row, {
      questions,
      question_count: questions.length,
      created_by_name: createdByName,
    });
  }

  async createAsset(actorUserId: string, input: ContentAssetInput): Promise<Record<string, unknown>> {
    const actor = toNullableIntId(actorUserId);
    const now = new Date();
    const created = await this.prisma.$transaction(async (tx) => {
      const asset = await tx.content_asset.create({
        data: {
          title: input.title,
          summary: input.summary ?? null,
          asset_type: input.asset_type,
          subject_tag: input.subject_tag ?? null,
          lesson_tag: input.lesson_tag ?? null,
          lesson_id: input.lesson_id ?? null,
          language: input.language ?? null,
          duration: input.duration ?? null,
          provider: input.provider ?? null,
          video_url: input.video_url ?? null,
          download_url: input.download_url ?? null,
          attachment: input.attachment ?? null,
          audio_file: input.audio_file ?? null,
          thumbnail: input.thumbnail ?? null,
          tags: input.tags ?? null,
          time_limit_seconds: input.time_limit_seconds ?? null,
          attempts_allowed: input.attempts_allowed ?? null,
          pass_marks: input.pass_marks ?? null,
          shuffle_questions: input.shuffle_questions ? 1 : 0,
          created_by: actor,
          updated_by: actor,
          created_at: now,
          updated_at: now,
        },
      });
      if (input.asset_type === 'quiz' && input.questions && input.questions.length > 0) {
        await tx.quiz_question.createMany({
          data: input.questions.map((q, idx) => ({
            asset_id: asset.id,
            question: q.question,
            option_a: q.option_a ?? null,
            option_b: q.option_b ?? null,
            option_c: q.option_c ?? null,
            option_d: q.option_d ?? null,
            correct_answer: normalizeCorrectAnswer(q.correct_answer),
            sort_order: q.sort_order ?? idx,
            created_at: now,
            updated_at: now,
          })),
        });
      }
      return asset;
    });
    return serializeAsset(created);
  }

  async updateAsset(actorUserId: string, assetId: string, input: ContentAssetInput): Promise<void> {
    const id = toIntId(assetId);
    if (!id) throw new Error('Invalid asset id');
    const actor = toNullableIntId(actorUserId);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.content_asset.update({
        where: { id },
        data: {
          title: input.title,
          summary: input.summary ?? null,
          asset_type: input.asset_type,
          subject_tag: input.subject_tag ?? null,
          lesson_tag: input.lesson_tag ?? null,
          lesson_id: input.lesson_id ?? null,
          language: input.language ?? null,
          duration: input.duration ?? null,
          provider: input.provider ?? null,
          video_url: input.video_url ?? null,
          download_url: input.download_url ?? null,
          attachment: input.attachment ?? null,
          audio_file: input.audio_file ?? null,
          thumbnail: input.thumbnail ?? null,
          tags: input.tags ?? null,
          time_limit_seconds: input.time_limit_seconds ?? null,
          attempts_allowed: input.attempts_allowed ?? null,
          pass_marks: input.pass_marks ?? null,
          shuffle_questions: input.shuffle_questions ? 1 : 0,
          updated_by: actor,
          updated_at: now,
        },
      });
      if (input.asset_type === 'quiz' && input.questions) {
        await tx.quiz_question.deleteMany({ where: { asset_id: id } });
        if (input.questions.length > 0) {
          await tx.quiz_question.createMany({
            data: input.questions.map((q, idx) => ({
              asset_id: id,
              question: q.question,
              option_a: q.option_a ?? null,
              option_b: q.option_b ?? null,
              option_c: q.option_c ?? null,
              option_d: q.option_d ?? null,
              correct_answer: normalizeCorrectAnswer(q.correct_answer),
              sort_order: q.sort_order ?? idx,
              created_at: now,
              updated_at: now,
            })),
          });
        }
      }
    });
  }

  async deleteAsset(actorUserId: string, assetId: string): Promise<void> {
    const id = toIntId(assetId);
    if (!id) throw new Error('Invalid asset id');
    await this.prisma.content_asset.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: toNullableIntId(actorUserId),
      },
    });
  }

  // Content Library assets linked to a lesson via content_asset.lesson_id,
  // in display order. (Replaces the old lesson_content-junction stub — the
  // M:N table was never created; a single asset belongs to one lesson.)
  async listLessonAssets(lessonId: string): Promise<Record<string, unknown>[]> {
    const id = toIntId(lessonId);
    if (!id) return [];
    const rows = await this.prisma.content_asset.findMany({
      where: { lesson_id: id, deleted_at: null },
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
    });
    const quizIds = rows.filter((r) => r.asset_type === 'quiz').map((r) => r.id);
    const counts = quizIds.length
      ? await this.prisma.quiz_question.groupBy({
          by: ['asset_id'],
          where: { asset_id: { in: quizIds } },
          _count: { id: true },
        })
      : [];
    const countMap = new Map(counts.map((c) => [c.asset_id, c._count?.id ?? 0] as const));
    return rows.map((r) =>
      serializeAsset(r, {
        question_count: r.asset_type === 'quiz' ? countMap.get(r.id) ?? 0 : undefined,
      }),
    );
  }

  // Link an existing Content Library asset to a lesson (sets lesson_id and
  // appends it to the end of that lesson's content order).
  async linkAssetToLesson(
    actorUserId: string,
    lessonId: string,
    assetId: string,
  ): Promise<Record<string, unknown>> {
    const lid = toIntId(lessonId);
    const aid = toIntId(assetId);
    if (!lid || !aid) throw new Error('Invalid lesson or asset id');
    const max = await this.prisma.content_asset.aggregate({
      where: { lesson_id: lid, deleted_at: null },
      _max: { sort_order: true },
    });
    await this.prisma.content_asset.update({
      where: { id: aid },
      data: {
        lesson_id: lid,
        sort_order: (max._max?.sort_order ?? 0) + 1,
        updated_by: toNullableIntId(actorUserId),
        updated_at: new Date(),
      },
    });
    return { id: String(aid), lesson_id: String(lid) };
  }

  // Unlink an asset from a lesson (clears lesson_id). The asset stays in the
  // Content Library, just no longer attached to the lesson.
  async unlinkAssetFromLesson(lessonId: string, assetId: string): Promise<void> {
    const lid = toIntId(lessonId);
    const aid = toIntId(assetId);
    if (!aid) throw new Error('Invalid asset id');
    await this.prisma.content_asset.updateMany({
      where: { id: aid, lesson_id: lid },
      data: { lesson_id: null, updated_at: new Date() },
    });
  }

  // Persist a new display order for content within a lesson. Takes the asset
  // ids in the desired order; writes sequential sort_order values.
  async reorderLessonAssets(lessonId: string, assetIds: string[]): Promise<void> {
    const lid = toIntId(lessonId);
    if (!lid) throw new Error('Invalid lesson id');
    const now = new Date();
    await this.prisma.$transaction(
      assetIds
        .map((aid) => toIntId(aid))
        .filter((aid) => aid > 0)
        .map((aid, index) =>
          this.prisma.content_asset.updateMany({
            where: { id: aid, lesson_id: lid },
            data: { sort_order: index, updated_at: now },
          }),
        ),
    );
  }

  // Subject Detail page payload: the subject, its lessons (in order), and for
  // each lesson the Content Library assets attached to it (in order). One
  // round-trip drives the whole "click a subject, see/manage everything" view.
  async getSubjectContentTree(subjectId: string): Promise<Record<string, unknown>> {
    const sid = toIntId(subjectId);
    if (!sid) throw new Error('Invalid subject id');

    const subject = await this.prisma.subject.findFirst({
      where: { id: sid, deleted_at: null },
    });
    if (!subject) throw new Error('Subject not found');

    const lessons = await this.prisma.lesson.findMany({
      where: { subject_id: sid, deleted_at: null },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
    const lessonIds = lessons.map((l) => l.id);

    const assets = lessonIds.length
      ? await this.prisma.content_asset.findMany({
          where: { lesson_id: { in: lessonIds }, deleted_at: null },
          orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
        })
      : [];

    // Quiz question counts in one query.
    const quizIds = assets.filter((a) => a.asset_type === 'quiz').map((a) => a.id);
    const counts = quizIds.length
      ? await this.prisma.quiz_question.groupBy({
          by: ['asset_id'],
          where: { asset_id: { in: quizIds } },
          _count: { id: true },
        })
      : [];
    const countMap = new Map(counts.map((c) => [c.asset_id, c._count?.id ?? 0] as const));

    const assetsByLesson = new Map<number, Record<string, unknown>[]>();
    for (const a of assets) {
      const list = assetsByLesson.get(a.lesson_id!) ?? [];
      list.push(
        serializeAsset(a, {
          question_count: a.asset_type === 'quiz' ? countMap.get(a.id) ?? 0 : undefined,
        }),
      );
      assetsByLesson.set(a.lesson_id!, list);
    }

    return {
      subject: {
        id: String(subject.id),
        title: subject.title ?? '',
        subject_code: subject.subject_code ?? '',
        subject_type: subject.subject_type ?? '',
        duration_hours: subject.duration_hours ?? null,
        status: subject.status ?? '',
        course_id: subject.course_id ?? null,
      },
      lessons: lessons.map((l) => ({
        id: String(l.id),
        title: l.title ?? '',
        summary: l.summary ?? '',
        order: l.order ?? 0,
        free: l.free ?? 'off',
        content: assetsByLesson.get(l.id) ?? [],
      })),
    };
  }
}
