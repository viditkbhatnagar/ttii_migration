import { Prisma } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { resetAuthRateLimitersForTests } from '../../src/auth/auth-service.js';
import { hashPassword } from '../../src/auth/password.js';
import { buildApp } from '../../src/app.js';
import { prisma, resetParityTables } from '../data/test-db.js';

const COURSE_ID = 3101;
const FEED_COURSE_ID = 3301;
const FEED_GLOBAL_ID = 3302;
const REVIEW_ID = 3401;
const NOTIFICATION_GLOBAL_ID = 3501;
const NOTIFICATION_COURSE_ID = 3502;
const LIVE_EVENT_ID = 3601;
const FUTURE_EVENT_ID = 3602;
const COHORT_ID = 3701;
const LIVE_CLASS_ID = 3801;
const ASSIGNMENT_ID = 3901;

function parseJsonBody<T>(body: string): T {
  return JSON.parse(body) as T;
}

function localDate(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localTimeOffset(offsetMinutes: number): string {
  const date = new Date(Date.now() + offsetMinutes * 60 * 1000);
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}:00`;
}

async function seedEngagementFixture(
  app: ReturnType<typeof buildApp>,
): Promise<{ authToken: string; userId: number; instructorId: number }> {
  const password = 'EngagementPass#2026';
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();
  const today = localDate();

  const learner = await prisma.users.create({
    data: {
      name: 'Engagement Learner',
      email: 'engagement.learner@example.test',
      user_email: 'engagement.learner@example.test',
      phone: '9000011111',
      role_id: 2,
      password: passwordHash,
      status: 1,
    },
  });

  const instructor = await prisma.users.create({
    data: {
      name: 'Engagement Instructor',
      email: 'engagement.instructor@example.test',
      user_email: 'engagement.instructor@example.test',
      phone: '9000022222',
      role_id: 4,
      password: passwordHash,
      status: 1,
    },
  });

  const supportAgent = await prisma.users.create({
    data: {
      name: 'Support Agent',
      email: 'engagement.support@example.test',
      user_email: 'engagement.support@example.test',
      phone: '9000033333',
      role_id: 1,
      password: passwordHash,
      status: 1,
    },
  });

  await prisma.$executeRaw(Prisma.sql`
    UPDATE users
    SET course_id = ${COURSE_ID}, image = ${'uploads/users/learner-phase09.png'}
    WHERE id = ${learner.id}
  `);

  await prisma.$executeRaw(Prisma.sql`
    UPDATE users
    SET image = ${'uploads/users/instructor-phase09.png'}
    WHERE id = ${instructor.id}
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO course (id, category_id, title, status, created_at)
    VALUES (${COURSE_ID}, 1, ${'Engagement Course'}, ${'active'}, ${now})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO feed (id, title, content, feed_category_id, course_id, image, instructor_id, created_at)
    VALUES
      (
        ${FEED_COURSE_ID},
        ${'Course Feed'},
        ${'Course feed content'},
        1,
        ${COURSE_ID},
        ${'uploads/feed/course.png'},
        ${instructor.id},
        ${now}
      ),
      (
        ${FEED_GLOBAL_ID},
        ${'Global Feed'},
        ${'Global feed content'},
        1,
        0,
        ${'uploads/feed/global.png'},
        ${instructor.id},
        ${now}
      )
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO review (id, course_id, user_id, rating, review, created_at)
    VALUES (${REVIEW_ID}, ${COURSE_ID}, ${instructor.id}, 4, ${'Helpful review'}, ${now})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO notification (id, title, description, course_id, created_at)
    VALUES
      (
        ${NOTIFICATION_GLOBAL_ID},
        ${'Global Alert'},
        ${'&lt;b&gt;Platform&lt;/b&gt; &amp; update'},
        0,
        ${now}
      ),
      (
        ${NOTIFICATION_COURSE_ID},
        ${'Course Alert'},
        ${'<b>Course</b> update'},
        ${COURSE_ID},
        ${now}
      )
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO events (
      id,
      title,
      description,
      event_date,
      from_time,
      to_time,
      image,
      objectives,
      duration,
      is_recording_available,
      instructor_id,
      created_at
    ) VALUES
      (
        ${LIVE_EVENT_ID},
        ${'Live Event'},
        ${'Live event description'},
        ${today},
        ${localTimeOffset(-30)},
        ${localTimeOffset(30)},
        ${'uploads/events/live.png'},
        ${JSON.stringify(['Objective A', 'Objective B'])},
        ${'60 min'},
        1,
        ${instructor.id},
        ${now}
      ),
      (
        ${FUTURE_EVENT_ID},
        ${'Future Event'},
        ${'Future event description'},
        ${localDate(1)},
        ${'10:00:00'},
        ${'11:00:00'},
        ${'uploads/events/future.png'},
        ${JSON.stringify(['Objective C'])},
        ${'60 min'},
        0,
        ${instructor.id},
        ${now}
      )
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO recorded_events (id, event_id, title, video_url, duration, summary, created_at)
    VALUES
      (
        3651,
        ${LIVE_EVENT_ID},
        ${'Live Recording'},
        ${'https://video.example/live-recording'},
        ${'55 min'},
        ${'Recording summary'},
        ${now}
      )
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO cohorts (
      id,
      subject_id,
      course_id,
      cohort_id,
      title,
      start_date,
      end_date,
      instructor_id,
      created_at
    ) VALUES
      (
        ${COHORT_ID},
        1,
        ${COURSE_ID},
        ${'COH-ENG-01'},
        ${'Engagement Cohort'},
        ${today},
        ${localDate(30)},
        ${instructor.id},
        ${now}
      )
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO cohort_students (cohort_id, user_id, created_at)
    VALUES (${COHORT_ID}, ${learner.id}, ${now})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO live_class (
      id,
      cohort_id,
      session_id,
      title,
      date,
      fromTime,
      toTime,
      repeat_dates,
      zoom_id,
      password,
      video_url,
      created_at
    ) VALUES (
      ${LIVE_CLASS_ID},
      ${COHORT_ID},
      ${'sess-eng-01'},
      ${'Live Class Engagement'},
      ${today},
      ${'07:00:00'},
      ${'08:00:00'},
      ${''},
      ${'zoom-eng-01'},
      ${'pass123'},
      ${'https://zoom.example/live'},
      ${now}
    )
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO assignment (
      id,
      title,
      description,
      added_date,
      due_date,
      from_time,
      to_time,
      instructions,
      cohort_id,
      course_id,
      created_at
    ) VALUES (
      ${ASSIGNMENT_ID},
      ${'Engagement Assignment'},
      ${'Submit reflection'},
      ${today},
      ${today},
      ${'09:00:00'},
      ${'10:00:00'},
      ${'Use PDF template'},
      ${COHORT_ID},
      ${COURSE_ID},
      ${now}
    )
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO support_chat (chat_id, sender_id, message, created_at, created_by, updated_at, updated_by)
    VALUES (${learner.id}, ${supportAgent.id}, ${'Hello learner'}, ${now}, ${supportAgent.id}, ${now}, ${supportAgent.id})
  `);

  const loginResponse = await app.inject({
    method: 'GET',
    url: '/api/login/index',
    query: {
      email: 'engagement.learner@example.test',
      password,
      role_id: '2',
    },
  });

  expect(loginResponse.statusCode).toBe(200);

  return {
    authToken: parseJsonBody<{ userdata: { auth_token: string } }>(loginResponse.body).userdata.auth_token,
    userId: learner.id,
    instructorId: instructor.id,
  };
}

describe('Phase 09 engagement and communication parity contracts', () => {
  const app = buildApp();

  beforeEach(async () => {
    resetAuthRateLimitersForTests();
    await resetParityTables();
  });

  afterAll(async () => {
    await app.close();
  });

  it('supports feed listing, watch markers, likes, and comments parity', async () => {
    const fixture = await seedEngagementFixture(app);

    const unauthorized = await app.inject({
      method: 'GET',
      url: '/api/feed/index',
    });
    expect(unauthorized.statusCode).toBe(401);

    const feedResponse = await app.inject({
      method: 'GET',
      url: '/api/feed/index',
      query: {
        auth_token: fixture.authToken,
      },
    });

    expect(feedResponse.statusCode).toBe(200);
    const feedPayload = parseJsonBody<{
      status: number;
      data: {
        feed: Array<{ id: number; is_liked: number; likes: number; instructor_name: string; instructor_image: string }>;
      };
    }>(feedResponse.body);

    expect(feedPayload.status).toBe(1);
    expect(feedPayload.data.feed.length).toBe(2);
    const courseFeed = feedPayload.data.feed.find((entry) => entry.id === FEED_COURSE_ID);
    expect(courseFeed?.is_liked).toBe(0);
    expect(courseFeed?.likes).toBe(0);
    expect(courseFeed?.instructor_name).toBe('Engagement Instructor');
    expect(courseFeed?.instructor_image.includes('/uploads/users/instructor-phase09.png')).toBe(true);

    const likeResponse = await app.inject({
      method: 'GET',
      url: '/api/feed/feed_like',
      query: {
        auth_token: fixture.authToken,
        feed_id: FEED_COURSE_ID,
      },
    });
    expect(parseJsonBody<{ status: number }>(likeResponse.body).status).toBe(1);

    const watchedResponse = await app.inject({
      method: 'GET',
      url: '/api/feed/feed_watched',
      query: {
        auth_token: fixture.authToken,
        feed_id: FEED_COURSE_ID,
      },
    });
    expect(parseJsonBody<{ status: number }>(watchedResponse.body).status).toBe(1);

    const watchedCountRows = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM feed_watched
      WHERE user_id = ${fixture.userId}
        AND feed_id = ${FEED_COURSE_ID}
        AND deleted_at IS NULL
    `);
    expect(Number(watchedCountRows[0]?.count ?? 0)).toBe(1);

    const commentResponse = await app.inject({
      method: 'GET',
      url: '/api/feed/add_feed_comment',
      query: {
        auth_token: fixture.authToken,
        feed_id: FEED_COURSE_ID,
        comment: 'Very useful update',
      },
    });
    expect(parseJsonBody<{ status: number }>(commentResponse.body).status).toBe(1);

    const feedAfterLike = await app.inject({
      method: 'GET',
      url: '/api/feed/index',
      query: {
        auth_token: fixture.authToken,
      },
    });

    const feedAfterLikePayload = parseJsonBody<{
      data: {
        feed: Array<{ id: number; is_liked: number; likes: number }>;
      };
    }>(feedAfterLike.body);
    const likedFeed = feedAfterLikePayload.data.feed.find((entry) => entry.id === FEED_COURSE_ID);
    expect(likedFeed?.is_liked).toBe(1);
    expect(likedFeed?.likes).toBe(1);

    const feedCommentsResponse = await app.inject({
      method: 'GET',
      url: '/api/feed/feed_comments',
      query: {
        auth_token: fixture.authToken,
        feed_id: FEED_COURSE_ID,
      },
    });

    const commentsPayload = parseJsonBody<{
      status: number;
      data: Array<{ comment: string; user_name: string; profile: string }>;
    }>(feedCommentsResponse.body);

    expect(commentsPayload.status).toBe(1);
    expect(commentsPayload.data.length).toBe(1);
    expect(commentsPayload.data[0]?.comment).toBe('Very useful update');
    expect(commentsPayload.data[0]?.user_name).toBe('Engagement Learner');
    expect(commentsPayload.data[0]?.profile.includes('/uploads/users/learner-phase09.png')).toBe(true);
  });

  it('supports review add/get and reaction toggle parity', async () => {
    const fixture = await seedEngagementFixture(app);

    const addReviewResponse = await app.inject({
      method: 'GET',
      url: '/api/review/add_review',
      query: {
        auth_token: fixture.authToken,
        course_id: COURSE_ID,
        rating: 5,
        review: 'Great progression content',
      },
    });

    expect(parseJsonBody<{ status: number }>(addReviewResponse.body).status).toBe(1);

    const getReviewResponse = await app.inject({
      method: 'GET',
      url: '/api/review/get_user_review',
      query: {
        auth_token: fixture.authToken,
        course_id: COURSE_ID,
      },
    });

    const getReviewPayload = parseJsonBody<{
      status: number;
      data: { course_id: number; user_id: number; rating: number; review: string } | null;
    }>(getReviewResponse.body);

    expect(getReviewPayload.status).toBe(1);
    expect(getReviewPayload.data?.course_id).toBe(COURSE_ID);
    expect(getReviewPayload.data?.user_id).toBe(fixture.userId);
    expect(getReviewPayload.data?.rating).toBe(5);
    expect(getReviewPayload.data?.review).toBe('Great progression content');

    const likeOnceResponse = await app.inject({
      method: 'GET',
      url: '/api/review/like_review',
      query: {
        auth_token: fixture.authToken,
        review_id: REVIEW_ID,
      },
    });
    expect(parseJsonBody<{ status: number }>(likeOnceResponse.body).status).toBe(1);

    const activeLikeRows = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM review_like
      WHERE review_id = ${REVIEW_ID}
        AND user_id = ${fixture.userId}
        AND deleted_at IS NULL
    `);
    expect(Number(activeLikeRows[0]?.count ?? 0)).toBe(1);

    const likeTwiceResponse = await app.inject({
      method: 'GET',
      url: '/api/review/like_review',
      query: {
        auth_token: fixture.authToken,
        review_id: REVIEW_ID,
      },
    });
    expect(parseJsonBody<{ status: number }>(likeTwiceResponse.body).status).toBe(1);

    const activeLikeRowsAfterToggle = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM review_like
      WHERE review_id = ${REVIEW_ID}
        AND user_id = ${fixture.userId}
        AND deleted_at IS NULL
    `);
    expect(Number(activeLikeRowsAfterToggle[0]?.count ?? 0)).toBe(0);
  });

  it('supports notification list, read-state, and token persistence parity', async () => {
    const fixture = await seedEngagementFixture(app);

    const notificationResponse = await app.inject({
      method: 'GET',
      url: '/api/home/get_notification',
      query: {
        auth_token: fixture.authToken,
      },
    });

    const notificationPayload = parseJsonBody<{
      status: number;
      data: Array<{ id: number; title: string; description: string }>;
    }>(notificationResponse.body);

    expect(notificationPayload.status).toBe(1);
    expect(notificationPayload.data.length).toBe(2);
    expect(notificationPayload.data[0]?.id).toBe(NOTIFICATION_COURSE_ID);
    expect(notificationPayload.data[0]?.description).toBe('Course update');

    const markReadResponse = await app.inject({
      method: 'GET',
      url: '/api/home/mark_notification_as_read',
      query: {
        auth_token: fixture.authToken,
        notification_id: NOTIFICATION_COURSE_ID,
      },
    });

    const markReadPayload = parseJsonBody<{ status: number }>(markReadResponse.body);
    expect(markReadPayload.status).toBe(1);

    const notificationReadRows = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM notification_read
      WHERE notification_id = ${NOTIFICATION_COURSE_ID}
        AND user_id = ${fixture.userId}
        AND deleted_at IS NULL
    `);
    expect(Number(notificationReadRows[0]?.count ?? 0)).toBe(1);

    const notificationListResponse = await app.inject({
      method: 'GET',
      url: '/api/home/get_notification_list',
      query: {
        auth_token: fixture.authToken,
      },
    });

    const notificationListPayload = parseJsonBody<{
      status: boolean;
      data: Array<{ id: number; description: string }>;
    }>(notificationListResponse.body);

    expect(notificationListPayload.status).toBe(true);
    const globalNotification = notificationListPayload.data.find((entry) => entry.id === NOTIFICATION_GLOBAL_ID);
    expect(globalNotification?.description).toBe('Platform & update');

    const tokenResponse = await app.inject({
      method: 'GET',
      url: '/api/home/save_notification_token',
      query: {
        auth_token: fixture.authToken,
        notification_token: 'expo-device-token-phase09',
      },
    });
    expect(parseJsonBody<{ status: number }>(tokenResponse.body).status).toBe(1);

    const updatedUser = await prisma.users.findUnique({
      where: {
        id: fixture.userId,
      },
      select: {
        notification_token: true,
      },
    });
    expect(updatedUser?.notification_token).toBe('expo-device-token-phase09');
  });

  it('supports events lifecycle parity including registration and feedback', async () => {
    const fixture = await seedEngagementFixture(app);

    const eventsIndexResponse = await app.inject({
      method: 'GET',
      url: '/api/events/index',
      query: {
        auth_token: fixture.authToken,
      },
    });

    const eventsIndexPayload = parseJsonBody<{
      status: number;
      data: {
        live: unknown[];
        upcoming: unknown[];
        expired: unknown[];
      };
    }>(eventsIndexResponse.body);

    expect(eventsIndexPayload.status).toBe(1);
    expect(eventsIndexPayload.data.live.length).toBe(1);
    expect(eventsIndexPayload.data.upcoming.length).toBe(0);
    expect(eventsIndexPayload.data.expired.length).toBe(1);

    const eventDetailsResponse = await app.inject({
      method: 'GET',
      url: '/api/events/get_event_details',
      query: {
        auth_token: fixture.authToken,
        event_id: LIVE_EVENT_ID,
      },
    });

    const eventDetailsPayload = parseJsonBody<{
      status: string;
      data: {
        id: number;
        recordings: unknown[];
        instructor_name: string;
      };
    }>(eventDetailsResponse.body);

    expect(eventDetailsPayload.status).toBe('success');
    expect(eventDetailsPayload.data.id).toBe(LIVE_EVENT_ID);
    expect(eventDetailsPayload.data.recordings.length).toBe(1);
    expect(eventDetailsPayload.data.instructor_name).toBe('Engagement Instructor');

    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/events/register_event',
      payload: {
        auth_token: fixture.authToken,
        event_id: LIVE_EVENT_ID,
        name: 'Engagement Learner',
        phone: '9000011111',
        attend_status: 'yes',
      },
    });

    const registerPayload = parseJsonBody<{ status: number }>(registerResponse.body);
    expect(registerPayload.status).toBe(1);

    const duplicateRegisterResponse = await app.inject({
      method: 'POST',
      url: '/api/events/register_event',
      payload: {
        auth_token: fixture.authToken,
        event_id: LIVE_EVENT_ID,
        name: 'Engagement Learner',
        phone: '9000011111',
        attend_status: 'yes',
      },
    });

    const duplicatePayload = parseJsonBody<{ status: boolean; message: string }>(duplicateRegisterResponse.body);
    expect(duplicatePayload.status).toBe(false);
    expect(duplicatePayload.message).toBe('You are already registered..!');

    const feedbackResponse = await app.inject({
      method: 'GET',
      url: '/api/events/add_feedback',
      query: {
        auth_token: fixture.authToken,
        event_id: LIVE_EVENT_ID,
        rating: 4,
        review: 'Great session',
      },
    });

    expect(parseJsonBody<{ status: number }>(feedbackResponse.body).status).toBe(1);

    const duplicateFeedbackResponse = await app.inject({
      method: 'GET',
      url: '/api/events/add_feedback',
      query: {
        auth_token: fixture.authToken,
        event_id: LIVE_EVENT_ID,
        rating: 5,
        review: 'Second review',
      },
    });

    expect(parseJsonBody<{ status: number }>(duplicateFeedbackResponse.body).status).toBe(0);

    const registrationRows = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM event_registration
      WHERE event_id = ${LIVE_EVENT_ID}
        AND user_id = ${fixture.userId}
        AND deleted_at IS NULL
    `);
    expect(Number(registrationRows[0]?.count ?? 0)).toBe(1);

    const feedbackRows = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM review
      WHERE event_id = ${LIVE_EVENT_ID}
        AND user_id = ${fixture.userId}
        AND item_type = 2
        AND deleted_at IS NULL
    `);
    expect(Number(feedbackRows[0]?.count ?? 0)).toBe(1);
  });

  it('supports my-task and support chat communication parity', async () => {
    const fixture = await seedEngagementFixture(app);

    const myTaskResponse = await app.inject({
      method: 'GET',
      url: '/api/my_task/index',
      query: {
        auth_token: fixture.authToken,
        date: localDate(),
      },
    });

    const myTaskPayload = parseJsonBody<{
      status: number;
      data: {
        cohort: { cohort_id: number; course_id: number } | [];
        scheduled: {
          live_classes: unknown[];
          assignments: unknown[];
        };
        overdue: {
          live_classes: unknown[];
          assignments: unknown[];
        };
      };
    }>(myTaskResponse.body);

    expect(myTaskPayload.status).toBe(1);
    expect(Array.isArray(myTaskPayload.data.cohort)).toBe(false);
    expect((myTaskPayload.data.cohort as { cohort_id: number }).cohort_id).toBe(COHORT_ID);
    expect((myTaskPayload.data.cohort as { course_id: number }).course_id).toBe(COURSE_ID);
    expect(myTaskPayload.data.scheduled.live_classes.length).toBe(1);
    expect(myTaskPayload.data.scheduled.assignments.length).toBe(1);
    expect(myTaskPayload.data.overdue.live_classes.length).toBe(0);
    expect(myTaskPayload.data.overdue.assignments.length).toBe(0);

    const supportMessagesResponse = await app.inject({
      method: 'GET',
      url: '/api/support/get_messages',
      query: {
        auth_token: fixture.authToken,
      },
    });

    const supportMessagesPayload = parseJsonBody<{
      status: number;
      data: Array<{ message: string }>;
    }>(supportMessagesResponse.body);

    expect(supportMessagesPayload.status).toBe(1);
    expect(supportMessagesPayload.data.length).toBe(1);
    expect(supportMessagesPayload.data[0]?.message).toBe('Hello learner');

    const submitMessageResponse = await app.inject({
      method: 'POST',
      url: '/api/support/submit_message',
      payload: {
        auth_token: fixture.authToken,
        message: 'Need help with assignment timeline',
      },
    });

    const submitMessagePayload = parseJsonBody<{ status: number; message: string }>(submitMessageResponse.body);
    expect(submitMessagePayload.status).toBe(1);
    expect(submitMessagePayload.message).toBe('message send successfully');

    const supportMessagesAfterSubmit = await app.inject({
      method: 'GET',
      url: '/api/support/get_messages',
      query: {
        auth_token: fixture.authToken,
      },
    });

    const supportMessagesAfterSubmitPayload = parseJsonBody<{
      data: Array<{ message: string }>;
    }>(supportMessagesAfterSubmit.body);

    expect(supportMessagesAfterSubmitPayload.data.length).toBe(2);
    expect(supportMessagesAfterSubmitPayload.data[1]?.message).toBe('Need help with assignment timeline');
  });
});
