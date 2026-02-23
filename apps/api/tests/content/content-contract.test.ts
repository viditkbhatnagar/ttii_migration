import { Prisma } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { resetAuthRateLimitersForTests } from '../../src/auth/auth-service.js';
import { hashPassword } from '../../src/auth/password.js';
import { buildApp } from '../../src/app.js';
import { prisma, resetParityTables } from '../data/test-db.js';

const COURSE_ID = 101;
const CATEGORY_ID = 1;
const SUBJECT_ID = 201;
const LESSON_ONE_ID = 301;
const LESSON_TWO_ID = 302;
const LESSON_FILE_VIDEO_ONE = 401;
const LESSON_FILE_PDF_ONE = 402;

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

async function seedContentFixture(app: ReturnType<typeof buildApp>): Promise<{ authToken: string; userId: number }> {
  const passwordHash = await hashPassword('LearnerPass#2026');

  const learner = await prisma.users.create({
    data: {
      name: 'Learner One',
      email: 'learner1@example.test',
      user_email: 'learner1@example.test',
      role_id: 2,
      password: passwordHash,
      status: 1,
    },
  });

  const instructor = await prisma.users.create({
    data: {
      name: 'Instructor One',
      email: 'instructor1@example.test',
      user_email: 'instructor1@example.test',
      role_id: 4,
      password: passwordHash,
      status: 1,
    },
  });

  await prisma.$executeRaw(Prisma.sql`
    UPDATE users
    SET course_id = ${COURSE_ID}, image = ${'uploads/users/learner.png'}, premium = 0
    WHERE id = ${learner.id}
  `);

  await prisma.$executeRaw(Prisma.sql`
    UPDATE users
    SET image = ${'uploads/users/instructor.png'}
    WHERE id = ${instructor.id}
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO category (id, code, name, description, short_description, thumbnail, category_icon, video_type, video_url, created_at)
    VALUES (${CATEGORY_ID}, ${'mind'}, ${'Mindfulness'}, ${'Mindfulness category'}, ${'Mind short'}, ${'uploads/category/mind.png'}, ${'uploads/category/mind-icon.png'}, ${'youtube'}, ${'https://video.example/mind'}, ${new Date().toISOString()})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO course (
      id,
      category_id,
      title,
      label,
      status,
      price,
      sale_price,
      description,
      duration,
      thumbnail,
      course_icon,
      features,
      is_free_course,
      created_at
    ) VALUES (
      ${COURSE_ID},
      ${CATEGORY_ID},
      ${'Mindfulness Foundations'},
      ${'Core'},
      ${'active'},
      ${1999},
      ${999},
      ${'<p>Build <b>focus</b> with daily practice.</p>'},
      ${'30 Days'},
      ${'uploads/course/mind-course.png'},
      ${'uploads/course/mind-cover.png'},
      ${'<li>Focus</li><li>Breathing</li><li>Calm</li>'},
      0,
      ${new Date().toISOString()}
    )
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO subject (id, course_id, master_subject_id, title, description, thumbnail, "order", created_at)
    VALUES
      (${SUBJECT_ID}, ${COURSE_ID}, NULL, ${'Breath Basics'}, ${'Subject one'}, ${'uploads/subject/breath.png'}, 1, ${new Date().toISOString()}),
      (${202}, ${COURSE_ID}, ${SUBJECT_ID}, ${'Breath Basics (Mirror)'}, ${'Subject mirror'}, ${'uploads/subject/breath-2.png'}, 2, ${new Date().toISOString()})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO lesson (id, course_id, subject_id, title, summary, free, "order", created_at)
    VALUES
      (${LESSON_ONE_ID}, ${COURSE_ID}, ${SUBJECT_ID}, ${'Lesson 1'}, ${'Start with breath'}, ${'off'}, 1, ${new Date().toISOString()}),
      (${LESSON_TWO_ID}, ${COURSE_ID}, ${SUBJECT_ID}, ${'Lesson 2'}, ${'Continue breath'}, ${'off'}, 2, ${new Date().toISOString()})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO lesson_files (
      id,
      lesson_id,
      parent_file_id,
      sub_title,
      title,
      summary,
      duration,
      lesson_provider,
      video_type,
      video_url,
      download_url,
      lesson_type,
      attachment_type,
      attachment,
      audio_file,
      thumbnail,
      free,
      "order",
      created_at
    ) VALUES
      (
        ${LESSON_FILE_VIDEO_ONE},
        ${LESSON_ONE_ID},
        NULL,
        ${'Intro Video'},
        ${'Breathing Video 1'},
        ${'Watch and breathe'},
        ${'00:10:00'},
        ${'youtube'},
        ${'youtube'},
        ${'https://video.example/1'},
        ${'https://download.example/1'},
        ${'video'},
        ${'url'},
        NULL,
        NULL,
        ${'uploads/lesson/video-1.png'},
        ${'off'},
        1,
        ${new Date().toISOString()}
      ),
      (
        ${LESSON_FILE_PDF_ONE},
        ${LESSON_ONE_ID},
        ${LESSON_FILE_VIDEO_ONE},
        ${'Worksheet'},
        ${'Breathing Sheet'},
        ${'Read this worksheet'},
        ${'00:01:00'},
        ${''},
        ${''},
        ${''},
        ${''},
        ${'other'},
        ${'pdf'},
        ${'uploads/materials/breath-sheet.pdf'},
        NULL,
        ${'uploads/lesson/sheet-1.png'},
        ${'off'},
        2,
        ${new Date().toISOString()}
      ),
      (
        ${403},
        ${LESSON_TWO_ID},
        NULL,
        ${'Second Video'},
        ${'Breathing Video 2'},
        ${'Next video'},
        ${'00:05:00'},
        ${'youtube'},
        ${'youtube'},
        ${'https://video.example/2'},
        ${'https://download.example/2'},
        ${'video'},
        ${'url'},
        NULL,
        NULL,
        ${'uploads/lesson/video-2.png'},
        ${'off'},
        1,
        ${new Date().toISOString()}
      ),
      (
        ${404},
        ${LESSON_TWO_ID},
        ${403},
        ${'Article'},
        ${'Breathing Notes'},
        ${'Read article'},
        ${'00:02:00'},
        ${''},
        ${''},
        ${''},
        ${''},
        ${'other'},
        ${'article'},
        NULL,
        NULL,
        ${'uploads/lesson/article-2.png'},
        ${'off'},
        2,
        ${new Date().toISOString()}
      )
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO quiz (lesson_file_id, question, created_at)
    VALUES (${403}, ${'Q1'}, ${new Date().toISOString()})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO demo_video (id, course_id, title, video_type, video_url, thumbnail, "order", created_at)
    VALUES (${501}, ${COURSE_ID}, ${'Course Demo'}, ${'youtube'}, ${'https://demo.example/1'}, ${'uploads/demo/course-demo.png'}, 1, ${new Date().toISOString()})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO review (id, course_id, user_id, rating, review, created_at)
    VALUES (${601}, ${COURSE_ID}, ${learner.id}, 5, ${'Great course'}, ${new Date().toISOString()})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO review_like (review_id, user_id, created_at)
    VALUES (${601}, ${learner.id}, ${new Date().toISOString()})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO instructor_enrol (instructor_id, course_id, created_at)
    VALUES (${instructor.id}, ${COURSE_ID}, ${new Date().toISOString()})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO cohorts (id, subject_id, title, created_at)
    VALUES (${701}, ${SUBJECT_ID}, ${'Morning Cohort'}, ${new Date().toISOString()})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO cohort_students (cohort_id, user_id, created_at)
    VALUES (${701}, ${learner.id}, ${new Date().toISOString()})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO payment_info (user_id, course_id, expiry_date, payment_date, created_at)
    VALUES (${learner.id}, ${COURSE_ID}, ${'2099-12-31'}, ${new Date().toISOString()}, ${new Date().toISOString()})
  `);

  await prisma.enrol.create({
    data: {
      user_id: learner.id,
      course_id: COURSE_ID,
      enrollment_status: 'active',
    },
  });

  const loginResponse = await app.inject({
    method: 'GET',
    url: '/api/login/index',
    query: {
      email: 'learner1@example.test',
      password: 'LearnerPass#2026',
      role_id: '2',
    },
  });

  expect(loginResponse.statusCode).toBe(200);

  const loginPayload = loginResponse.json<{
    userdata: {
      auth_token: string;
    };
  }>();

  return {
    authToken: loginPayload.userdata.auth_token,
    userId: learner.id,
  };
}

describe('Phase 06 catalog + content parity contracts', () => {
  const app = buildApp();

  beforeEach(async () => {
    resetAuthRateLimitersForTests();
    await resetParityTables();
  });

  afterAll(async () => {
    await app.close();
  });

  it('keeps /api/category/index public while protected content routes require auth', async () => {
    await seedContentFixture(app);

    const categoryResponse = await app.inject({
      method: 'GET',
      url: '/api/category/index',
    });

    expect(categoryResponse.statusCode).toBe(200);
    const categoryPayload = categoryResponse.json<{
      status: number;
      data: Array<{ id: number; name: string }>;
    }>();

    expect(categoryPayload.status).toBe(1);
    expect(categoryPayload.data[0]?.id).toBe(CATEGORY_ID);
    expect(categoryPayload.data[0]?.name).toBe('Mindfulness');

    const protectedResponse = await app.inject({
      method: 'GET',
      url: '/api/course/all_course',
    });

    expect(protectedResponse.statusCode).toBe(401);
    const protectedPayload = protectedResponse.json<{ status: boolean; message: string }>();
    expect(protectedPayload.status).toBe(false);
    expect(protectedPayload.message).toBe('User not authenticated!');
  });

  it('serves category, catalog, and course detail contracts for authenticated users', async () => {
    const fixture = await seedContentFixture(app);

    const categoryDetailsResponse = await app.inject({
      method: 'GET',
      url: '/api/category/get_category_details',
      query: {
        auth_token: fixture.authToken,
        category_id: String(CATEGORY_ID),
      },
    });

    expect(categoryDetailsResponse.statusCode).toBe(200);
    const categoryDetailsPayload = categoryDetailsResponse.json<{
      status: string;
      data: {
        enroll_count: number;
        courses: Array<{ total_reviews: number }>;
      };
    }>();

    expect(categoryDetailsPayload.status).toBe('success');
    expect(categoryDetailsPayload.data.enroll_count).toBeGreaterThanOrEqual(1);
    expect(categoryDetailsPayload.data.courses[0]?.total_reviews).toBe(1);

    const allCourseResponse = await app.inject({
      method: 'GET',
      url: '/api/course/all_course',
      query: {
        auth_token: fixture.authToken,
      },
    });

    expect(allCourseResponse.statusCode).toBe(200);
    const allCoursePayload = allCourseResponse.json<{
      status: number;
      data: Array<{ id: number; is_enrolled: number; subject_count: number }>;
    }>();

    expect(allCoursePayload.status).toBe(1);
    expect(allCoursePayload.data[0]?.id).toBe(COURSE_ID);
    expect(allCoursePayload.data[0]?.is_enrolled).toBe(1);
    expect(allCoursePayload.data[0]?.subject_count).toBe(2);

    const courseDetailsResponse = await app.inject({
      method: 'GET',
      url: '/api/course/get_course_details',
      query: {
        auth_token: fixture.authToken,
        course_id: String(COURSE_ID),
      },
    });

    expect(courseDetailsResponse.statusCode).toBe(200);
    const courseDetailsPayload = courseDetailsResponse.json<{
      status: number;
      data: {
        course: { id: number };
        is_purchased: number;
        subjects: Array<{ id: number }>;
        rating_data: { '5_star': number };
      };
    }>();

    expect(courseDetailsPayload.status).toBe(1);
    expect(courseDetailsPayload.data.course.id).toBe(COURSE_ID);
    expect(courseDetailsPayload.data.is_purchased).toBe(1);
    expect(courseDetailsPayload.data.subjects.length).toBe(2);
    expect(courseDetailsPayload.data.rating_data['5_star']).toBe(100);
  });

  it('applies sequential lesson unlock logic and returns grouped lesson file/content lists', async () => {
    const fixture = await seedContentFixture(app);

    const initialLessonsResponse = await app.inject({
      method: 'GET',
      url: '/api/course/get_lessons',
      query: {
        auth_token: fixture.authToken,
        subject_id: String(SUBJECT_ID),
      },
    });

    expect(initialLessonsResponse.statusCode).toBe(200);
    const initialLessonsPayload = initialLessonsResponse.json<{
      data: Array<{ id: number; lock: number; lesson_files: Array<{ lock?: number }> }>;
    }>();

    expect(initialLessonsPayload.data[0]?.id).toBe(LESSON_ONE_ID);
    expect(initialLessonsPayload.data[0]?.lock).toBe(0);
    expect(initialLessonsPayload.data[1]?.id).toBe(LESSON_TWO_ID);
    expect(initialLessonsPayload.data[1]?.lock).toBe(1);

    const groupedLessonFilesResponse = await app.inject({
      method: 'GET',
      url: '/api/lesson_file/index',
      query: {
        auth_token: fixture.authToken,
        lesson_id: String(LESSON_ONE_ID),
      },
    });

    expect(groupedLessonFilesResponse.statusCode).toBe(200);
    const groupedLessonFilesPayload = groupedLessonFilesResponse.json<{
      status: number;
      data: Array<{ id: number; related_files: Array<{ id: number }> }>;
    }>();

    expect(groupedLessonFilesPayload.status).toBe(1);
    expect(groupedLessonFilesPayload.data.length).toBe(1);
    expect(groupedLessonFilesPayload.data[0]?.id).toBe(LESSON_FILE_VIDEO_ONE);
    expect(groupedLessonFilesPayload.data[0]?.related_files[0]?.id).toBe(LESSON_FILE_PDF_ONE);

    const videosResponse = await app.inject({
      method: 'GET',
      url: '/api/lesson_file/videos',
      query: {
        auth_token: fixture.authToken,
        lesson_id: String(LESSON_ONE_ID),
      },
    });

    expect(videosResponse.statusCode).toBe(200);
    const videosPayload = videosResponse.json<{
      data: {
        video_list: Array<{ id: number }>;
      };
    }>();
    expect(videosPayload.data.video_list[0]?.id).toBe(LESSON_FILE_VIDEO_ONE);

    const materialsResponse = await app.inject({
      method: 'GET',
      url: '/api/lesson_file/materials',
      query: {
        auth_token: fixture.authToken,
        course_id: String(COURSE_ID),
      },
    });

    expect(materialsResponse.statusCode).toBe(200);
    const materialsPayload = materialsResponse.json<{
      data: {
        material_list: Array<{ id: number }>;
      };
    }>();

    expect(materialsPayload.data.material_list[0]?.id).toBe(LESSON_FILE_PDF_ONE);

    await app.inject({
      method: 'GET',
      url: '/api/lesson_file/save_video_progress',
      query: {
        auth_token: fixture.authToken,
        course_id: String(COURSE_ID),
        lesson_file_id: String(LESSON_FILE_VIDEO_ONE),
        lesson_duration: '00:10:00',
        user_progress: '00:10:00',
      },
    });

    await app.inject({
      method: 'GET',
      url: '/api/lesson_file/save_material_progress',
      query: {
        auth_token: fixture.authToken,
        course_id: String(COURSE_ID),
        lesson_file_id: String(LESSON_FILE_PDF_ONE),
        attachment_type: 'pdf',
      },
    });

    const unlockedLessonsResponse = await app.inject({
      method: 'GET',
      url: '/api/course/get_lessons',
      query: {
        auth_token: fixture.authToken,
        subject_id: String(SUBJECT_ID),
      },
    });

    expect(unlockedLessonsResponse.statusCode).toBe(200);
    const unlockedLessonsPayload = unlockedLessonsResponse.json<{
      data: Array<{ id: number; lock: number; completed_percentage: number }>;
    }>();

    expect(unlockedLessonsPayload.data[0]?.completed_percentage).toBe(100);
    expect(unlockedLessonsPayload.data[1]?.lock).toBe(0);
  });

  it('persists progress and returns streak analytics with legacy GET mutating behavior', async () => {
    const fixture = await seedContentFixture(app);

    const saveProgressResponse = await app.inject({
      method: 'GET',
      url: '/api/lesson_file/save_video_progress',
      query: {
        auth_token: fixture.authToken,
        lesson_file_id: String(LESSON_FILE_VIDEO_ONE),
        lesson_duration: '00:10:00',
        user_progress: '00:10:00',
      },
    });

    expect(saveProgressResponse.statusCode).toBe(200);

    const progressRow = await prisma.$queryRaw<Array<{ status: number; user_progress: string }>>(Prisma.sql`
      SELECT status, user_progress
      FROM video_progress_status
      WHERE user_id = ${fixture.userId}
        AND lesson_file_id = ${LESSON_FILE_VIDEO_ONE}
      LIMIT 1
    `);

    expect(progressRow[0]?.status).toBe(1);
    expect(progressRow[0]?.user_progress).toBe('00:10:00');

    const saveLowerProgressResponse = await app.inject({
      method: 'GET',
      url: '/api/lesson_file/save_video_progress',
      query: {
        auth_token: fixture.authToken,
        lesson_file_id: String(LESSON_FILE_VIDEO_ONE),
        lesson_duration: '00:10:00',
        user_progress: '00:05:00',
      },
    });

    expect(saveLowerProgressResponse.statusCode).toBe(200);

    const progressRowAfterLowerUpdate = await prisma.$queryRaw<Array<{ status: number; user_progress: string }>>(Prisma.sql`
      SELECT status, user_progress
      FROM video_progress_status
      WHERE user_id = ${fixture.userId}
        AND lesson_file_id = ${LESSON_FILE_VIDEO_ONE}
      LIMIT 1
    `);

    expect(progressRowAfterLowerUpdate[0]?.status).toBe(1);
    expect(progressRowAfterLowerUpdate[0]?.user_progress).toBe('00:10:00');

    const streakResponse = await app.inject({
      method: 'GET',
      url: '/api/lesson_file/streak_data',
      query: {
        auth_token: fixture.authToken,
        from_date: todayDateString(),
        to_date: todayDateString(),
      },
    });

    expect(streakResponse.statusCode).toBe(200);
    const streakPayload = streakResponse.json<{
      status: number;
      data: { total_streak: number; current_streak: number };
    }>();

    expect(streakPayload.status).toBe(1);
    expect(streakPayload.data.total_streak).toBe(10);
    expect(streakPayload.data.current_streak).toBe(10);
  });
});
