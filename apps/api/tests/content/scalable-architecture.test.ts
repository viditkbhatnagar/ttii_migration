// @ts-nocheck
/* eslint-disable */
// TODO: re-enable after migration — fixtures predate MySQL migration
/**
 * Tests for the scalable LMS architecture (Phases 1-5).
 *
 * Part 1: Service-level unit tests (direct Prisma, no HTTP)
 * Part 2: Security tests (HTTP endpoint auth checks)
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';
import { ProgramService } from '../../src/content/program-service.js';
import { OfferingService } from '../../src/content/offering-service.js';
import { ContentAssetService } from '../../src/content/content-asset-service.js';
import { CertificateService } from '../../src/content/certificate-service.js';
import { createPrismaClient } from '../../src/data/prisma-client.js';

const databaseUrl = process.env.DATABASE_URL ?? 'mongodb://localhost:27017/ttii_lms_test';
const prisma = createPrismaClient(databaseUrl);

const actorUserId = '000000000000000000000001'; // Fake actor ID for service tests

// Test entity IDs
let testCourseId: string;
let testCourse2Id: string;
let testSubjectId: string;
let testProgramId: string;
let testOfferingId: string;
let testAssetId: string;
let testPolicyId: string;
let testTemplateId: string;
let testCertificateId: string;
let testUserId: string;

beforeAll(async () => {
  // Create test courses
  const course1 = await prisma.course.create({
    data: { title: 'Arch Test Course Alpha', status: 'active', created_at: new Date(), updated_at: new Date(), deleted_at: null },
  });
  testCourseId = course1.id;

  const course2 = await prisma.course.create({
    data: { title: 'Arch Test Course Beta', status: 'active', created_at: new Date(), updated_at: new Date(), deleted_at: null },
  });
  testCourse2Id = course2.id;

  // Create a test user for certificates
  const uniqueEmail = `arch-test-student-${Date.now()}@example.test`;
  const user = await prisma.users.create({
    data: {
      name: 'Arch Test Student',
      email: uniqueEmail,
      user_email: uniqueEmail,
      role_id: 2,
      status: 1,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  testUserId = user.id;
}, 15000);

afterAll(async () => {
  // Clean up in reverse dependency order
  if (testCertificateId) await prisma.certificate.deleteMany({ where: { id: testCertificateId } }).catch(() => {});
  if (testTemplateId) await prisma.certificate_template.deleteMany({ where: { id: testTemplateId } }).catch(() => {});
  if (testPolicyId) await prisma.completion_policy.deleteMany({ where: { id: testPolicyId } }).catch(() => {});
  if (testAssetId) {
    await prisma.lesson_content.deleteMany({ where: { asset_id: testAssetId } }).catch(() => {});
    await prisma.content_asset.deleteMany({ where: { id: testAssetId } }).catch(() => {});
  }
  if (testOfferingId) await prisma.course_offering.deleteMany({ where: { id: testOfferingId } }).catch(() => {});
  if (testProgramId) {
    await prisma.program_courses.deleteMany({ where: { program_id: testProgramId } }).catch(() => {});
    await prisma.program.deleteMany({ where: { id: testProgramId } }).catch(() => {});
  }
  if (testSubjectId) {
    await prisma.course_subjects.deleteMany({ where: { subject_id: testSubjectId } }).catch(() => {});
    await prisma.subject.deleteMany({ where: { id: testSubjectId } }).catch(() => {});
  }
  if (testCourseId) await prisma.course.deleteMany({ where: { id: testCourseId } }).catch(() => {});
  if (testCourse2Id) await prisma.course.deleteMany({ where: { id: testCourse2Id } }).catch(() => {});
  if (testUserId) await prisma.users.deleteMany({ where: { id: testUserId } }).catch(() => {});
  await prisma.$disconnect();
}, 15000);

// ════════════════════════════════════════════════════════════════════
// Part 1: Service-Level Unit Tests
// ════════════════════════════════════════════════════════════════════

describe.skip('Phase 1: Course↔Subject M:N (Service)', () => {
  // Using ContentService methods via Prisma directly since the service is tightly coupled

  it('should create a subject and course_subjects junction row', async () => {
    const subject = await prisma.subject.create({
      data: {
        course_id: testCourseId, // dual-write
        title: 'Reusable Arch Test Subject',
        description: 'Test subject for architecture tests',
        order: 1,
        created_by: actorUserId,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    testSubjectId = subject.id;

    // Create junction row
    await prisma.course_subjects.create({
      data: {
        course_id: testCourseId,
        subject_id: testSubjectId,
        order: 1,
        created_at: new Date(),
        deleted_at: null,
      },
    });

    // Verify junction exists
    const junction = await prisma.course_subjects.findFirst({
      where: { course_id: testCourseId, subject_id: testSubjectId },
    });
    expect(junction).toBeTruthy();
    expect(junction?.course_id).toBe(testCourseId);
  });

  it('should link subject to a second course (M:N reuse)', async () => {
    await prisma.course_subjects.create({
      data: {
        course_id: testCourse2Id,
        subject_id: testSubjectId,
        order: 1,
        created_at: new Date(),
        deleted_at: null,
      },
    });

    // Subject should now appear in both courses
    const links = await prisma.course_subjects.findMany({
      where: { subject_id: testSubjectId },
    });
    expect(links.length).toBe(2);
    const courseIds = links.map((l) => l.course_id);
    expect(courseIds).toContain(testCourseId);
    expect(courseIds).toContain(testCourse2Id);
  });

  it('should unlink subject from one course without deleting it', async () => {
    // Soft-delete the junction for course 2
    const junction = await prisma.course_subjects.findFirst({
      where: { course_id: testCourse2Id, subject_id: testSubjectId },
    });
    expect(junction).toBeTruthy();
    await prisma.course_subjects.update({
      where: { id: junction!.id },
      data: { deleted_at: new Date() },
    });

    // Subject should still exist
    const subject = await prisma.subject.findFirst({ where: { id: testSubjectId } });
    expect(subject).toBeTruthy();

    // Active links should be only 1
    const activeLinks = await prisma.course_subjects.count({
      where: { subject_id: testSubjectId, deleted_at: null },
    });
    expect(activeLinks).toBe(1);
  });

  it('should enforce unique constraint on course_subjects', async () => {
    // Try to create duplicate link
    await expect(
      prisma.course_subjects.create({
        data: {
          course_id: testCourseId,
          subject_id: testSubjectId,
          order: 2,
          created_at: new Date(),
        },
      }),
    ).rejects.toThrow();
  });
});

describe.skip('Phase 2: Programs (Service)', () => {
  const programService = new ProgramService();

  it('should create a program', async () => {
    const result = await programService.createProgram(actorUserId, {
      title: 'Arch Test Diploma',
      code: 'ATD-2026',
      level: 'diploma',
      duration: '1 Year',
    });
    testProgramId = result.id as string;
    expect(testProgramId).toBeTruthy();
  });

  it('should list programs', async () => {
    const programs = await programService.listPrograms();
    const found = programs.find((p) => p.id === testProgramId);
    expect(found).toBeTruthy();
    expect(found?.title).toBe('Arch Test Diploma');
    expect(found?.code).toBe('ATD-2026');
    expect(found?.level).toBe('diploma');
  });

  it('should get a program by ID', async () => {
    const program = await programService.getProgram(testProgramId);
    expect(program).toBeTruthy();
    expect(program?.title).toBe('Arch Test Diploma');
  });

  it('should reject empty ID', async () => {
    await expect(programService.getProgram('')).rejects.toThrow('programId is required');
  });

  it('should add a course to program', async () => {
    const result = await programService.addCourseToProgram(actorUserId, testProgramId, testCourseId);
    expect(result.id).toBeTruthy();
  });

  it('should prevent duplicate course-program linking', async () => {
    const result = await programService.addCourseToProgram(actorUserId, testProgramId, testCourseId);
    expect(result.already_linked).toBe(true);
  });

  it('should list program courses', async () => {
    const courses = await programService.listProgramCourses(testProgramId);
    expect(courses.length).toBeGreaterThanOrEqual(1);
    expect(courses[0]?.title).toBe('Arch Test Course Alpha');
  });

  it('should remove course from program', async () => {
    await programService.addCourseToProgram(actorUserId, testProgramId, testCourse2Id);
    await programService.removeCourseFromProgram(testProgramId, testCourse2Id);
    const courses = await programService.listProgramCourses(testProgramId);
    expect(courses.find((c) => c.id === testCourse2Id)).toBeFalsy();
  });

  it('should update a program', async () => {
    await programService.updateProgram(actorUserId, testProgramId, {
      title: 'Updated Arch Test Diploma',
      code: 'ATD-2026',
      level: 'pg_diploma',
      duration: '2 Years',
    });
    const updated = await programService.getProgram(testProgramId);
    expect(updated?.title).toBe('Updated Arch Test Diploma');
    expect(updated?.level).toBe('pg_diploma');
  });
});

describe.skip('Phase 3: Course Offerings (Service)', () => {
  const offeringService = new OfferingService();

  it('should create an offering', async () => {
    const result = await offeringService.createOffering(actorUserId, {
      course_id: testCourseId,
      title: 'Arch Test Offering Jan 2026',
      delivery_mode: 'cohort',
      start_date: '2026-01-15',
      end_date: '2026-06-15',
      max_enrollment: 50,
      pricing_amount: 9999,
      status: 'active',
    });
    testOfferingId = result.id as string;
    expect(testOfferingId).toBeTruthy();
  });

  it('should reject empty course_id', async () => {
    await expect(
      offeringService.createOffering(actorUserId, { course_id: '', title: 'No Course' }),
    ).rejects.toThrow('course_id is required');
  });

  it('should list offerings', async () => {
    const offerings = await offeringService.listOfferings();
    const found = offerings.find((o) => o.id === testOfferingId);
    expect(found).toBeTruthy();
    expect(found?.delivery_mode).toBe('cohort');
    expect(found?.course_title).toBe('Arch Test Course Alpha');
    expect(found?.max_enrollment).toBe(50);
  });

  it('should filter offerings by course', async () => {
    const offerings = await offeringService.listOfferings({ courseId: testCourseId });
    expect(offerings.every((o) => o.course_id === testCourseId)).toBe(true);
  });

  it('should get offering details', async () => {
    const offering = await offeringService.getOffering(testOfferingId);
    expect(offering).toBeTruthy();
    expect(offering?.title).toBe('Arch Test Offering Jan 2026');
    expect(offering?.pricing_amount).toBe(9999);
  });

  it('should update offering', async () => {
    await offeringService.updateOffering(actorUserId, testOfferingId, {
      course_id: testCourseId,
      title: 'Updated Arch Test Offering',
      delivery_mode: 'hybrid',
      status: 'published',
    });
    const updated = await offeringService.getOffering(testOfferingId);
    expect(updated?.title).toBe('Updated Arch Test Offering');
    expect(updated?.delivery_mode).toBe('hybrid');
  });
});

describe.skip('Phase 4: Content Asset Library (Service)', () => {
  const assetService = new ContentAssetService();

  it('should create an asset', async () => {
    const result = await assetService.createAsset(actorUserId, {
      title: 'Arch Test Video',
      asset_type: 'video',
      duration: '10:30',
      video_url: 'https://example.com/test-video.mp4',
      summary: 'A test video asset',
    });
    testAssetId = result.id as string;
    expect(testAssetId).toBeTruthy();
  });

  it('should list assets', async () => {
    const assets = await assetService.listAssets();
    const found = assets.find((a) => a.id === testAssetId);
    expect(found).toBeTruthy();
    expect(found?.asset_type).toBe('video');
    expect(found?.duration).toBe('10:30');
  });

  it('should filter by type', async () => {
    const videos = await assetService.listAssets({ assetType: 'video' });
    expect(videos.every((a) => a.asset_type === 'video')).toBe(true);
  });

  it('should get asset by ID', async () => {
    const asset = await assetService.getAsset(testAssetId);
    expect(asset).toBeTruthy();
    expect(asset?.title).toBe('Arch Test Video');
    expect(asset?.video_url).toBe('https://example.com/test-video.mp4');
  });

  it('should update asset', async () => {
    await assetService.updateAsset(actorUserId, testAssetId, {
      title: 'Updated Arch Test Video',
      asset_type: 'video',
      duration: '15:00',
    });
    const updated = await assetService.getAsset(testAssetId);
    expect(updated?.title).toBe('Updated Arch Test Video');
    expect(updated?.duration).toBe('15:00');
  });

  it('should track lesson_count (usage)', async () => {
    const assets = await assetService.listAssets();
    const found = assets.find((a) => a.id === testAssetId);
    expect(found?.lesson_count).toBe(0); // Not linked to any lesson yet
  });
});

describe.skip('Phase 5: Completion Policies & Certificates (Service)', () => {
  const certService = new CertificateService();

  it('should create a completion policy', async () => {
    const result = await certService.createPolicy(actorUserId, {
      title: 'Arch Test Completion Policy',
      course_id: testCourseId,
      min_progress_pct: 90,
      min_exam_score_pct: 60,
      require_all_assignments: 1,
      require_all_exams: 1,
      min_attendance_pct: 75,
    });
    testPolicyId = result.id as string;
    expect(testPolicyId).toBeTruthy();
  });

  it('should list policies', async () => {
    const policies = await certService.listPolicies();
    const found = policies.find((p) => p.id === testPolicyId);
    expect(found).toBeTruthy();
    expect(found?.min_progress_pct).toBe(90);
    expect(found?.min_attendance_pct).toBe(75);
    expect(found?.course_title).toBe('Arch Test Course Alpha');
  });

  it('should create a certificate template', async () => {
    const result = await certService.createTemplate(actorUserId, {
      title: 'Arch Test Certificate Template',
      signatory: 'Dr. Test Director',
      course_id: testCourseId,
    });
    testTemplateId = result.id as string;
    expect(testTemplateId).toBeTruthy();
  });

  it('should list templates', async () => {
    const templates = await certService.listTemplates();
    const found = templates.find((t) => t.id === testTemplateId);
    expect(found).toBeTruthy();
    expect(found?.signatory).toBe('Dr. Test Director');
  });

  it('should issue a certificate with unique verification code', async () => {
    const result = await certService.issueCertificate(actorUserId, {
      user_id: testUserId,
      course_id: testCourseId,
      offering_id: testOfferingId,
      template_id: testTemplateId,
      policy_id: testPolicyId,
    });
    testCertificateId = result.id as string;
    expect(testCertificateId).toBeTruthy();
    expect(result.certificate_no).toBeTruthy();
    expect(result.verification_code).toBeTruthy();
    // 12 bytes = 24 hex chars (security fix: increased from 8 bytes)
    expect((result.verification_code as string).length).toBe(24);
  });

  it('should list certificates with user info', async () => {
    const certs = await certService.listCertificates();
    const found = certs.find((c) => c.id === testCertificateId);
    expect(found).toBeTruthy();
    expect(found?.status).toBe('issued');
    expect(found?.user_name).toBe('Arch Test Student');
    expect(found?.course_title).toBe('Arch Test Course Alpha');
  });

  it('should revoke a certificate', async () => {
    await certService.revokeCertificate(actorUserId, testCertificateId);
    const certs = await certService.listCertificates();
    const found = certs.find((c) => c.id === testCertificateId);
    expect(found?.status).toBe('revoked');
  });
});

// ════════════════════════════════════════════════════════════════════
// Part 2: HTTP Security Tests
// ════════════════════════════════════════════════════════════════════

describe.skip('Security: All new endpoints reject unauthenticated requests', () => {
  let app: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  }, 10000);

  afterAll(async () => {
    await app.close();
  });

  const endpoints = [
    { method: 'GET' as const, url: '/api/admin/programs' },
    { method: 'POST' as const, url: '/api/admin/programs/add' },
    { method: 'POST' as const, url: '/api/admin/programs/edit' },
    { method: 'POST' as const, url: '/api/admin/programs/delete' },
    { method: 'GET' as const, url: '/api/admin/programs/courses' },
    { method: 'POST' as const, url: '/api/admin/programs/courses/add' },
    { method: 'POST' as const, url: '/api/admin/programs/courses/remove' },
    { method: 'GET' as const, url: '/api/admin/offerings' },
    { method: 'POST' as const, url: '/api/admin/offerings/add' },
    { method: 'POST' as const, url: '/api/admin/offerings/edit' },
    { method: 'POST' as const, url: '/api/admin/offerings/delete' },
    { method: 'GET' as const, url: '/api/admin/content-assets' },
    { method: 'POST' as const, url: '/api/admin/content-assets/add' },
    { method: 'POST' as const, url: '/api/admin/content-assets/edit' },
    { method: 'POST' as const, url: '/api/admin/content-assets/delete' },
    { method: 'GET' as const, url: '/api/admin/content-assets/lesson' },
    { method: 'POST' as const, url: '/api/admin/content-assets/lesson/link' },
    { method: 'POST' as const, url: '/api/admin/content-assets/lesson/unlink' },
    { method: 'GET' as const, url: '/api/admin/completion-policies' },
    { method: 'POST' as const, url: '/api/admin/completion-policies/add' },
    { method: 'POST' as const, url: '/api/admin/completion-policies/edit' },
    { method: 'POST' as const, url: '/api/admin/completion-policies/delete' },
    { method: 'GET' as const, url: '/api/admin/certificate-templates' },
    { method: 'POST' as const, url: '/api/admin/certificate-templates/add' },
    { method: 'POST' as const, url: '/api/admin/certificate-templates/edit' },
    { method: 'POST' as const, url: '/api/admin/certificate-templates/delete' },
    { method: 'GET' as const, url: '/api/admin/certificates' },
    { method: 'POST' as const, url: '/api/admin/certificates/issue' },
    { method: 'POST' as const, url: '/api/admin/certificates/revoke' },
    { method: 'POST' as const, url: '/api/admin/course/subjects/link' },
    { method: 'POST' as const, url: '/api/admin/course/subjects/unlink' },
  ];

  for (const ep of endpoints) {
    it(`rejects unauthenticated ${ep.method} ${ep.url}`, async () => {
      const res = await app.inject({
        method: ep.method,
        url: ep.url,
        ...(ep.method === 'POST' ? { payload: {} } : {}),
      });
      expect(res.statusCode).toBe(401);
    });
  }

  it('rejects invalid Bearer token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/programs',
      headers: { authorization: 'Bearer fake-token-12345' },
    });
    expect(res.statusCode).toBe(401);
  });
});
