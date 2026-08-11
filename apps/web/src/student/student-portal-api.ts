import { ApiError, type AuthSession, type LegacyApiClient, type QueryValue } from '@ttii/frontend-core';

interface LegacyEnvelope<T> {
  data?: T;
  message?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  // Numeric IDs come straight from Prisma as `number`; without this
  // coercion, the loadLearning fan-out maps subject.id (Int) to '',
  // filters them out, and never fires /course/get_lessons — the page
  // shows "0/0 lessons" for every subject even when content exists.
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

// Naji UAT 2026-08-11 — the exam clock is SERVER-owned, and 0 is a real value
// there ("your time is up"), so a missing field must NOT read as 0: asNumber()
// coerces absent/garbled to 0, which an API build without `remaining_seconds`
// (or a proxy that dropped it) would turn into "auto-submit this exam right
// now". Anything that is not a finite number comes back as null so the caller
// can fall back to its own duration maths instead.
function asFiniteNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

/** Server verdict on the exam window at the moment it answered. */
export type ExamWindowState = 'open' | 'closing' | 'closed';

function asExamWindowState(value: unknown): ExamWindowState {
  const raw = asString(value);
  return raw === 'closed' || raw === 'closing' ? raw : 'open';
}

/** One drafted answer as autosaved by the player: the 0-based MCQ option index
 * (as a string) or the descriptive text, in a single-entry array. Always an
 * array — an empty one means "not answered". */
export interface ExamDraftAnswer {
  questionId: string;
  answer: string[];
}

function toDraftAnswers(value: unknown): ExamDraftAnswer[] {
  return asArray(value)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .map((entry) => ({
      questionId: asString(entry.question_id),
      answer: asArray(entry.answer)
        .map((one) => asString(one))
        .filter((one) => one !== ''),
    }))
    .filter((entry) => entry.questionId !== '');
}

/** What /exams/exam_save_progress tells the player back. `remainingSeconds` is
 * authoritative — it counts down to the EARLIER of the attempt deadline and the
 * exam window close, both computed on the server in IST. */
export interface ExamProgressSaveResult {
  saved: boolean;
  remainingSeconds: number | null;
  windowState: ExamWindowState;
  serverTime: string;
}

// Group a student's exams by the backend-derived `state` for the Exams tab.
// Only exams the student is assigned to (is_allocated) are shown, so the tab
// reflects "your exams", not every exam on the course.
function groupExamsByState(exams: Record<string, unknown>[]): {
  available: Record<string, unknown>[];
  upcoming: Record<string, unknown>[];
  expired: Record<string, unknown>[];
} {
  const available: Record<string, unknown>[] = [];
  const upcoming: Record<string, unknown>[] = [];
  const expired: Record<string, unknown>[] = [];
  for (const exam of exams) {
    if (asNumber(exam.is_allocated) !== 1) continue;
    const state = asString(exam.state);
    if (state === 'available') available.push(exam);
    else if (state === 'upcoming') upcoming.push(exam);
    else expired.push(exam); // 'closed' | 'submitted' | legacy
  }
  return { available, upcoming, expired };
}

function asBooleanFromLegacy(value: unknown): boolean {
  if (value === 1 || value === true || value === '1' || value === 'true' || value === 'on') {
    return true;
  }

  return false;
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function dayOffset(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return toDateOnly(date);
}

function toAnswerFiles(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => asString(entry))
      .filter((entry) => entry !== '');
  }

  const single = asString(value);
  return single === '' ? [] : [single];
}

function firstRecord(value: unknown): Record<string, unknown> | null {
  const values = asArray(value);
  if (values.length === 0) {
    return null;
  }

  return asRecord(values[0]);
}

export interface StudentDashboardSnapshot {
  coursesCount: number;
  currentAssignments: number;
  upcomingAssignments: number;
  completedAssignments: number;
  upcomingExams: number;
  expiredExams: number;
  notificationsCount: number;
  scheduledTasks: number;
  overdueTasks: number;
  streakTotal: number;
  streakCurrent: number;
  primaryCourseTitle: string;
  courseProgress: number;
  recentPaymentAmount: number;
  recentPaymentDate: string;
}

export interface StudentProfileSnapshot {
  userId: string;
  roleId: number;
  name: string;
  email: string;
  phone: string;
  studentId: string;
  courseId: string;
  image: string;
  academicYear: string;
  username: string;
  dateOfBirth: string;
  gender: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  source: 'profile' | 'session';
}

// The lesson file the student last watched (Resume Learning deep-link target).
export interface StudentLastWatched {
  courseId: string;
  lessonFileId: string;
  lessonId: string;
  title: string;
}

export interface StudentLearningSnapshot {
  courses: Record<string, unknown>[];
  catalogCourses: Record<string, unknown>[];
  subjects: Record<string, unknown>[];
  lessons: Record<string, unknown>[];
  lessonFiles: Record<string, unknown>[];
  selectedCourseId: string;
  selectedSubjectId: string;
  selectedLessonId: string;
  streakTotal: number;
  streakCurrent: number;
}

export interface StudentAssessmentSnapshot {
  assignments: {
    current: Record<string, unknown>[];
    upcoming: Record<string, unknown>[];
    completed: Record<string, unknown>[];
  };
  exams: {
    available: Record<string, unknown>[];
    upcoming: Record<string, unknown>[];
    expired: Record<string, unknown>[];
  };
  examCalendar: Record<string, unknown>;
  quizLessonFileId: string;
  quizLessonId: string;
}

export interface StudentPaymentSnapshot {
  studentCourses: Record<string, unknown>[];
  packages: Record<string, unknown>[];
  paymentDetails: Record<string, unknown>;
  selectedCourseId: string;
  selectedPackageId: string;
}

export interface StudentNotificationsSnapshot {
  notifications: Record<string, unknown>[];
  notificationList: Record<string, unknown>[];
}

// A single real learner action for the dashboard's Recent Activity feed.
export interface StudentActivityItem {
  id: string;
  type: string;
  title: string;
  detail: string;
  created_at: string;
}

export interface StudentSupportSnapshot {
  messages: Record<string, unknown>[];
}

export interface StudentPaymentHistoryItem {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMode: string;
  status: string;
  courseTitle: string;
}

export interface StudentInstallmentItem {
  id: string;
  installmentNo: number;
  installmentDetails: string;
  amount: number;
  dueDate: string;
  paidDate: string;
  paymentMode: string;
  status: string;
}

export interface StudentProfileUpdateInput {
  name: string;
  email: string;
  phone: string;
  academicYear?: string | undefined;
  image?: string | undefined;
  dateOfBirth?: string | undefined;
  gender?: string | undefined;
  addressLine1?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  pincode?: string | undefined;
}

export interface StudentPasswordUpdateInput {
  password: string;
  confirmPassword: string;
}

export interface StudentCouponInput {
  courseId: string;
  packageId: string;
  couponCode: string;
}

export class StudentPortalApi {
  private readonly apiClient: LegacyApiClient;

  constructor(apiClient: LegacyApiClient) {
    this.apiClient = apiClient;
  }

  private async get<T>(path: string, authToken: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.apiClient.request<T>({
      method: 'GET',
      path,
      authToken,
      ...(query ? { query } : {}),
    });
  }

  private async post<T>(
    path: string,
    authToken: string,
    body?: Record<string, unknown>,
    query?: Record<string, QueryValue>,
  ): Promise<T> {
    return this.apiClient.request<T>({
      method: 'POST',
      path,
      authToken,
      ...(body ? { body } : {}),
      ...(query ? { query } : {}),
    });
  }

  async loadDashboard(authToken: string): Promise<StudentDashboardSnapshot> {
    const [coursesPayload, assignmentsPayload, examsPayload, notificationsPayload, tasksPayload, streakPayload, studentCoursesPayload, paymentHistoryPayload] =
      await Promise.all([
        this.get<LegacyEnvelope<unknown[]>>('/course/all_course', authToken),
        this.get<LegacyEnvelope<Record<string, unknown>>>('/assignment/index', authToken),
        this.get<LegacyEnvelope<Record<string, unknown>>>('/exams/index', authToken),
        this.get<LegacyEnvelope<unknown[]>>('/home/get_notification', authToken),
        this.get<LegacyEnvelope<Record<string, unknown>>>('/my_task/index', authToken, {
          date: toDateOnly(new Date()),
        }),
        this.get<LegacyEnvelope<Record<string, unknown>>>('/lesson_file/streak_data', authToken, {
          from_date: dayOffset(-30),
          to_date: toDateOnly(new Date()),
        }),
        this.get<LegacyEnvelope<unknown[]>>('/payment/get_student_courses', authToken),
        this.get<LegacyEnvelope<unknown[]>>('/payment/get_payment_history', authToken),
      ]);

    const courseRows = asArray(coursesPayload.data);
    const assignmentData = asRecord(assignmentsPayload.data) ?? {};
    const examsData = asRecord(examsPayload.data) ?? {};
    const taskData = asRecord(tasksPayload.data) ?? {};
    const streakData = asRecord(streakPayload.data) ?? {};

    const scheduledData = asRecord(taskData.scheduled) ?? {};
    const overdueData = asRecord(taskData.overdue) ?? {};

    const scheduledTasks = asArray(scheduledData.live_classes).length + asArray(scheduledData.assignments).length;
    const overdueTasks = asArray(overdueData.live_classes).length + asArray(overdueData.assignments).length;

    const studentCourses = asArray(studentCoursesPayload.data);
    const firstStudentCourse = asRecord(studentCourses[0]) ?? {};
    const courseProgress = asNumber(firstStudentCourse.payment_percentage);

    const paymentHistory = asArray(paymentHistoryPayload.data);
    const recentPayment = asRecord(paymentHistory[0]) ?? {};

    return {
      coursesCount: courseRows.length,
      currentAssignments: asArray(assignmentData.current).length,
      upcomingAssignments: asArray(assignmentData.upcoming).length,
      completedAssignments: asArray(assignmentData.completed).length,
      upcomingExams: asArray(examsData.upcoming_exams).length,
      expiredExams: asArray(examsData.expired_exams).length,
      notificationsCount: asArray(notificationsPayload.data).length,
      scheduledTasks,
      overdueTasks,
      streakTotal: asNumber(streakData.total_streak),
      streakCurrent: asNumber(streakData.current_streak),
      primaryCourseTitle: asString(firstRecord(courseRows)?.title),
      courseProgress,
      recentPaymentAmount: asNumber(recentPayment.amount),
      recentPaymentDate: asString(recentPayment.payment_date),
    };
  }

  async loadProfile(authToken: string, session: AuthSession): Promise<StudentProfileSnapshot> {
    try {
      const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/profile/index', authToken);
      const profile = asRecord(payload.data) ?? {};

      const dobRaw = asString(profile.date_of_birth);
      const dobFormatted = dobRaw ? dobRaw.slice(0, 10) : '';

      return {
        userId: asString(profile.id) || String(session.userId),
        roleId: asNumber(profile.role_id) || session.roleId,
        name: asString(profile.name),
        email: asString(profile.user_email) || asString(profile.email),
        phone: asString(profile.phone),
        studentId: asString(profile.student_id),
        courseId: asString(profile.course_id),
        image: asString(profile.image),
        academicYear: asString(profile.academic_year),
        username: asString(profile.username),
        dateOfBirth: dobFormatted,
        gender: asString(profile.gender),
        addressLine1: asString(profile.address_line_1),
        city: asString(profile.city),
        state: asString(profile.state),
        pincode: asString(profile.pincode),
        source: 'profile',
      };
    } catch (error: unknown) {
      if (error instanceof ApiError && error.statusCode === 404) {
        return {
          userId: String(session.userId),
          roleId: session.roleId,
          name: '',
          email: '',
          phone: '',
          studentId: '',
          courseId: '',
          image: '',
          academicYear: '',
          username: '',
          dateOfBirth: '',
          gender: '',
          addressLine1: '',
          city: '',
          state: '',
          pincode: '',
          source: 'session',
        };
      }

      throw error;
    }
  }

  async updateProfile(authToken: string, input: StudentProfileUpdateInput, session: AuthSession): Promise<StudentProfileSnapshot> {
    await this.post<LegacyEnvelope<Record<string, unknown>>>('/profile/update', authToken, {
      name: input.name,
      email: input.email,
      user_email: input.email,
      phone: input.phone,
      academic_year: input.academicYear ?? '',
      image: input.image ?? '',
      date_of_birth: input.dateOfBirth ?? '',
      gender: input.gender ?? '',
      address_line_1: input.addressLine1 ?? '',
      city: input.city ?? '',
      state: input.state ?? '',
      pincode: input.pincode ?? '',
    });

    return this.loadProfile(authToken, session);
  }

  async changePassword(authToken: string, input: StudentPasswordUpdateInput): Promise<void> {
    await this.post<LegacyEnvelope<Record<string, unknown>>>('/profile/change_password', authToken, {
      password: input.password,
      confirm_password: input.confirmPassword,
    });
  }

  async requestEnrolment(authToken: string, courseId: string): Promise<{ status: number; message: string }> {
    const payload = await this.post<{ status?: number; message?: string }>(
      '/student/leads/request-enrolment',
      authToken,
      { course_id: courseId },
    );
    return {
      status: asNumber(payload?.status),
      message: asString(payload?.message),
    };
  }

  // Course detail (full info page). `/course/get_course_details` returns the
  // course meta under `course`, plus subjects + reviews. Subjects + lessons for
  // the curriculum accordion come from the dedicated endpoints (lessons fetched
  // lazily per subject so we don't hammer the API up front).
  async getCourseDetail(authToken: string, courseId: string): Promise<Record<string, unknown> | null> {
    const payload = await this.get<LegacyEnvelope<unknown>>('/course/get_course_details', authToken, { course_id: courseId });
    return asRecord(payload.data);
  }

  async getCourseSubjects(authToken: string, courseId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/course/get_subjects', authToken, { course_id: courseId });
    return asArray(payload.data)
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => entry !== null);
  }

  async getCourseLessons(authToken: string, subjectId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/course/get_lessons', authToken, { subject_id: subjectId });
    return asArray(payload.data)
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => entry !== null);
  }

  // Lesson-wise courses (structure_type=2): lessons hang directly off the
  // course, no subject layer. Used instead of get_subjects→get_lessons.
  async getCourseLessonsDirect(authToken: string, courseId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/course/get_lessons_direct', authToken, { course_id: courseId });
    return asArray(payload.data)
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => entry !== null);
  }

  // Auth token rides on the URL because @fastify/multipart isn't configured
  // with attachFieldsToBody — body fields are invisible to the auth
  // middleware on multipart requests. Mirrors AdminPortalApi.uploadFile.
  async uploadProfileImage(authToken: string, file: File): Promise<{ key: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const url = `${this.apiClient.getBaseUrl()}profile/upload_image?auth_token=${encodeURIComponent(authToken)}`;
    const response = await fetch(url, { method: 'POST', body: formData });
    const payload = (await response.json()) as Record<string, unknown>;
    if (!payload || payload.status !== 1) {
      throw new Error((payload?.message as string) || 'Upload failed');
    }
    return payload.data as { key: string; url: string };
  }

  async loadStudentLiveClasses(
    authToken: string,
    courseId: string,
  ): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>(
      '/student/live_classes',
      authToken,
      courseId ? { course_id: courseId } : {},
    );
    return asArray(payload.data)
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => entry !== null);
  }

  // Live classes across ALL the student's enrolled courses (for the standalone
  // Live Classes page). Fans out per enrolled course and dedupes by id.
  async loadAllLiveClasses(authToken: string): Promise<Record<string, unknown>[]> {
    // A single call returns the student's live classes across ALL enrolled
    // cohorts/courses — the backend (listStudentLiveClasses) already aggregates
    // by the student's cohorts when no course_id is given. This replaces a 1+N
    // waterfall (/course/all_course, then one /student/live_classes per course)
    // that fired dozens of redundant requests and gated the whole dashboard.
    // (Naji 2026-06-05: dashboard was loading very slowly.)
    return this.loadStudentLiveClasses(authToken, '');
  }

  async getLiveRecordingUrl(authToken: string, liveClassId: string): Promise<string> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>(
      '/student/live_classes/recording-url',
      authToken,
      { id: liveClassId },
    );
    const data = asRecord(payload.data) ?? {};
    return asString(data.url);
  }

  // ─── Native quiz player (Naji 2026-05-05) ────────────────────────
  async loadQuiz(authToken: string, lessonFileId: string): Promise<{
    title: string;
    description: string;
    questions: Array<{ id: number; question: string; options: string[]; question_type: number }>;
  }> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>(
      '/student/quiz/index',
      authToken,
      { lesson_file_id: lessonFileId },
    );
    const data = asRecord(payload.data) ?? {};
    const rawQuestions = asArray(data.questions);
    return {
      title: asString(data.title),
      description: asString(data.description),
      questions: rawQuestions
        .map((entry) => asRecord(entry))
        .filter((entry): entry is Record<string, unknown> => entry !== null)
        .map((q) => ({
          id: asNumber(q.id),
          question: asString(q.question),
          question_type: asNumber(q.question_type),
          options: asArray(q.options).map((o) => asString(o)),
        })),
    };
  }

  async startStudentQuiz(authToken: string, lessonFileId: string): Promise<string> {
    const payload = await this.post<LegacyEnvelope<Record<string, unknown>>>(
      '/student/quiz/start',
      authToken,
      { lesson_file_id: lessonFileId },
    );
    const data = asRecord(payload.data) ?? {};
    return asString(data.attempt_id);
  }

  async submitStudentQuiz(
    authToken: string,
    input: { lessonFileId: string; attemptId: string; answers: Array<{ question_id: number; selected: number | null }> },
  ): Promise<{
    correct: number;
    incorrect: number;
    skip: number;
    score: number;
    total_questions: number;
    review: Array<{ question_id: number; selected: number | null; correct: number[]; isCorrect: boolean | null }>;
  }> {
    const payload = await this.post<LegacyEnvelope<Record<string, unknown>>>(
      '/student/quiz/submit',
      authToken,
      {
        lesson_file_id: input.lessonFileId,
        attempt_id: input.attemptId,
        answers: input.answers,
      },
    );
    const data = asRecord(payload.data) ?? {};
    const review = asArray(data.review)
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => entry !== null)
      .map((r) => ({
        question_id: asNumber(r.question_id),
        selected: r.selected === null || r.selected === undefined ? null : asNumber(r.selected),
        correct: asArray(r.correct).map((v) => asNumber(v)),
        isCorrect: r.isCorrect === null || r.isCorrect === undefined ? null : Boolean(r.isCorrect),
      }));
    return {
      correct: asNumber(data.correct),
      incorrect: asNumber(data.incorrect),
      skip: asNumber(data.skip),
      score: asNumber(data.score),
      total_questions: asNumber(data.total_questions),
      review,
    };
  }

  async loadLearning(
    authToken: string,
    options?: { includeFiles?: boolean; coursesOnly?: boolean },
  ): Promise<StudentLearningSnapshot> {
    // coursesOnly: the caller only needs courses[] (and their progress) — skip
    // the catalog, streak, and the entire subject → lesson → lesson-file
    // fan-out (the heaviest part of this loader). Used by the Certificates
    // page, which renders only course progress. Perf 2026-07-04.
    if (options?.coursesOnly) {
      const coursesPayload = await this.get<LegacyEnvelope<unknown[]>>('/course/all_course', authToken);
      const coursesOnly = asArray(coursesPayload.data)
        .map((entry) => asRecord(entry))
        .filter((entry): entry is Record<string, unknown> => entry !== null);
      return {
        courses: coursesOnly,
        catalogCourses: [],
        subjects: [],
        lessons: [],
        lessonFiles: [],
        selectedCourseId: asString(firstRecord(coursesOnly)?.id),
        selectedSubjectId: '',
        selectedLessonId: '',
        streakTotal: 0,
        streakCurrent: 0,
      };
    }

    // Streak only depends on a date window, not on courses/lessons — fire it
    // up front so it resolves in parallel instead of tacking an extra
    // round-trip onto the end of the subjects/lessons fan-out.
    const streakPromise = this.get<LegacyEnvelope<Record<string, unknown>>>('/lesson_file/streak_data', authToken, {
      from_date: dayOffset(-30),
      to_date: toDateOnly(new Date()),
    });
    const [coursesPayload, catalogPayload] = await Promise.all([
      this.get<LegacyEnvelope<unknown[]>>('/course/all_course', authToken),
      this.get<LegacyEnvelope<unknown[]>>('/course/catalog', authToken),
    ]);
    const courses = asArray(coursesPayload.data)
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => entry !== null);
    const catalogCourses = asArray(catalogPayload.data)
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => entry !== null);

    const selectedCourseId = asString(firstRecord(courses)?.id);

    // Fan out across EVERY enrolled course. Earlier code only loaded the
    // first course's subjects, so a student enrolled in two courses saw
    // content for one and an empty section for the other. Tag each
    // subject with its course_id so the page can group accordions per
    // course.
    const courseIds = courses
      .map((c) => asString(c.id))
      .filter((id): id is string => id !== '');

    // Lesson-wise courses (structure_type===2) have NO subjects — their
    // lessons hang directly off the course (Naji 2026-06-23). Split the
    // enrolled set so type-1 keeps the subject→lesson fan-out exactly as
    // before, while type-2 skips get_subjects and reads lessons directly.
    // structure_type rides on the /course/all_course rows (buildCourseData);
    // a missing value is treated as type 1.
    const structureTypeById = new Map<string, number>(
      courses.map((c) => [asString(c.id), asNumber(c.structure_type) === 2 ? 2 : 1]),
    );
    const isLessonWise = (courseId: string): boolean => structureTypeById.get(courseId) === 2;

    // A stable sentinel id for the single synthetic "subject-less" grouping we
    // attach to each lesson-wise course. Keeping the snapshot's subjects[] /
    // lessons[] shape valid means all the existing per-course subject-keyed
    // filtering in the page keeps working untouched.
    const directSubjectId = (courseId: string): string => `__direct__${courseId}`;

    const subjectWiseCourseIds = courseIds.filter((id) => !isLessonWise(id));
    const lessonWiseCourseIds = courseIds.filter((id) => isLessonWise(id));

    const subjectsByCourse = await Promise.all(
      subjectWiseCourseIds.map(async (courseId) => {
        const payload = await this.get<LegacyEnvelope<unknown[]>>('/course/get_subjects', authToken, { course_id: courseId });
        return asArray(payload.data)
          .map((entry) => asRecord(entry))
          .filter((entry): entry is Record<string, unknown> => entry !== null)
          .map((entry): Record<string, unknown> => ({ ...entry, course_id: entry.course_id ?? courseId }));
      }),
    );
    const realSubjects: Record<string, unknown>[] = subjectsByCourse.flat();

    // Synthetic subject-less grouping per lesson-wise course, so the rest of
    // the snapshot pipeline (which filters lessons through subjects) stays valid.
    const syntheticSubjects: Record<string, unknown>[] = lessonWiseCourseIds.map((courseId) => ({
      id: directSubjectId(courseId),
      course_id: courseId,
      title: '',
      __direct: true,
    }));
    const subjects: Record<string, unknown>[] = [...realSubjects, ...syntheticSubjects];

    const selectedSubjectId = asString(firstRecord(subjects)?.id);

    // For every REAL subject across every subject-wise course, fetch lessons in
    // parallel. (Synthetic subjects don't have real subject ids to query.)
    const subjectIds = realSubjects
      .map((s) => asString(s.id))
      .filter((id): id is string => id !== '');

    const lessonsBySubject = await Promise.all(
      subjectIds.map(async (subjectId) => {
        const payload = await this.get<LegacyEnvelope<unknown[]>>('/course/get_lessons', authToken, { subject_id: subjectId });
        return asArray(payload.data)
          .map((entry) => asRecord(entry))
          .filter((entry): entry is Record<string, unknown> => entry !== null);
      }),
    );

    // Lesson-wise courses: read lessons directly off the course and re-tag each
    // with the synthetic subject id (and its course_id) so subject-keyed
    // filtering downstream resolves them to that course's grouping.
    const lessonsByDirectCourse = await Promise.all(
      lessonWiseCourseIds.map(async (courseId) => {
        const rows = await this.getCourseLessonsDirect(authToken, courseId);
        const syntheticId = directSubjectId(courseId);
        return rows.map((row): Record<string, unknown> => ({
          ...row,
          course_id: asString(row.course_id) || courseId,
          subject_id: syntheticId,
        }));
      }),
    );
    const lessons = [...lessonsBySubject.flat(), ...lessonsByDirectCourse.flat()];

    const selectedLessonId = asString(firstRecord(lessons)?.id);

    const lessonIds = lessons
      .map((l) => asString(l.id))
      .filter((id): id is string => id !== '');

    // The per-lesson files fan-out (one /lesson_file/index per lesson) is the
    // deepest, most expensive level — only the Lesson Player needs it. Callers
    // that just need course/lesson progress (e.g. the dashboard) pass
    // includeFiles:false to skip it entirely. (Naji 2026-06-05: dashboard slow.)
    const includeFiles = options?.includeFiles ?? true;
    const lessonFiles = includeFiles
      ? (
          await Promise.all(
            lessonIds.map(async (lessonId) => {
              const payload = await this.get<LegacyEnvelope<unknown[]>>('/lesson_file/index', authToken, {
                lesson_id: lessonId,
              });
              return asArray(payload.data)
                .map((entry) => asRecord(entry))
                .filter((entry): entry is Record<string, unknown> => entry !== null);
            }),
          )
        ).flat()
      : [];

    const streakPayload = await streakPromise;
    const streak = asRecord(streakPayload.data) ?? {};

    return {
      courses,
      catalogCourses,
      subjects,
      lessons,
      lessonFiles,
      selectedCourseId,
      selectedSubjectId,
      selectedLessonId,
      streakTotal: asNumber(streak.total_streak),
      streakCurrent: asNumber(streak.current_streak),
    };
  }

  async saveVideoProgress(
    authToken: string,
    input: { courseId: string; lessonFileId: string; lessonDuration: string; userProgress: string },
  ): Promise<void> {
    await this.get<LegacyEnvelope<Record<string, unknown>>>('/lesson_file/save_video_progress', authToken, {
      course_id: input.courseId,
      lesson_file_id: input.lessonFileId,
      lesson_duration: input.lessonDuration,
      user_progress: input.userProgress,
    });
  }

  // Resolve the last lesson the student watched (global, or scoped to a course)
  // for the Resume Learning deep-link. Resilient: returns null on any failure.
  async loadLastWatchedLesson(authToken: string, courseId?: string): Promise<StudentLastWatched | null> {
    try {
      const payload = await this.get<LegacyEnvelope<Record<string, unknown> | null>>(
        '/student/last-watched-lesson',
        authToken,
        courseId ? { course_id: courseId } : {},
      );
      const data = asRecord(payload.data);
      const lessonFileId = data ? asString(data.lessonFileId) : '';
      if (!data || !lessonFileId) return null;
      return {
        courseId: asString(data.courseId),
        lessonFileId,
        lessonId: asString(data.lessonId),
        title: asString(data.title),
      };
    } catch {
      return null;
    }
  }

  async saveMaterialProgress(
    authToken: string,
    input: { courseId: string; lessonFileId: string; attachmentType: string },
  ): Promise<void> {
    await this.get<LegacyEnvelope<Record<string, unknown>>>('/lesson_file/save_material_progress', authToken, {
      course_id: input.courseId,
      lesson_file_id: input.lessonFileId,
      attachment_type: input.attachmentType,
    });
  }

  private async resolveQuizCandidate(authToken: string): Promise<{ lessonId: string; lessonFileId: string }> {
    const learning = await this.loadLearning(authToken);

    for (const lesson of learning.lessons) {
      const lessonId = asString(lesson.id);
      const lessonFiles = asArray(lesson.lesson_files);

      for (const lessonFile of lessonFiles) {
        const file = asRecord(lessonFile);
        if (!file) {
          continue;
        }

        const attachmentType = asString(file.attachment_type).toLowerCase();
        if (attachmentType === 'quiz') {
          return {
            lessonId,
            lessonFileId: asString(file.id),
          };
        }
      }
    }

    return {
      lessonId: '',
      lessonFileId: '',
    };
  }

  async loadAssessments(authToken: string): Promise<StudentAssessmentSnapshot> {
    const [assignmentsPayload, examsPayload, examCalendarPayload, quizCandidate] = await Promise.all([
      this.get<LegacyEnvelope<Record<string, unknown>>>('/assignment/index', authToken),
      this.get<LegacyEnvelope<Record<string, unknown>>>('/exams/index', authToken),
      this.get<LegacyEnvelope<Record<string, unknown>>>('/exams/exam_calendar', authToken),
      this.resolveQuizCandidate(authToken),
    ]);

    const assignments = asRecord(assignmentsPayload.data) ?? {};
    const exams = asRecord(examsPayload.data) ?? {};

    return {
      assignments: {
        current: asArray(assignments.current).map((entry) => asRecord(entry)).filter((entry): entry is Record<string, unknown> => entry !== null),
        upcoming: asArray(assignments.upcoming).map((entry) => asRecord(entry)).filter((entry): entry is Record<string, unknown> => entry !== null),
        completed: asArray(assignments.completed).map((entry) => asRecord(entry)).filter((entry): entry is Record<string, unknown> => entry !== null),
      },
      exams: groupExamsByState([
        ...asArray(exams.upcoming_exams).map((entry) => asRecord(entry)).filter((entry): entry is Record<string, unknown> => entry !== null),
        ...asArray(exams.expired_exams).map((entry) => asRecord(entry)).filter((entry): entry is Record<string, unknown> => entry !== null),
      ]),
      examCalendar: asRecord(examCalendarPayload.data) ?? {},
      quizLessonFileId: quizCandidate.lessonFileId,
      quizLessonId: quizCandidate.lessonId,
    };
  }

  async toggleSavedAssignment(authToken: string, assignmentId: string): Promise<void> {
    await this.get<LegacyEnvelope<Record<string, unknown>>>('/assignment/save_assignment', authToken, {
      assignment_id: assignmentId,
    });
  }

  async submitAssignment(authToken: string, assignmentId: string, answerFiles: unknown): Promise<void> {
    await this.post<LegacyEnvelope<Record<string, unknown>>>('/assignment/submit_assignment', authToken, {
      assignment_id: assignmentId,
      answer_file: toAnswerFiles(answerFiles),
    });
  }

  // Upload the student's work and submit it. The backend /assignment/submit_assignment
  // route accepts multipart: it stores each file and records its URL. Auth rides
  // on the URL (multipart body fields are invisible to the auth middleware),
  // mirroring uploadProfileImage.
  async submitAssignmentFiles(authToken: string, assignmentId: string, files: File[]): Promise<void> {
    const formData = new FormData();
    formData.append('assignment_id', assignmentId);
    for (const file of files) formData.append('file', file);
    const url = `${this.apiClient.getBaseUrl()}assignment/submit_assignment?auth_token=${encodeURIComponent(authToken)}`;
    const response = await fetch(url, { method: 'POST', body: formData });
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok || (payload && (payload.status === 0 || payload.status === false))) {
      throw new Error((payload?.message as string) || 'Submission failed');
    }
  }

  /**
   * The permanent practice exam, or null when none is configured. Unlimited
   * retakes — the server skips allocation, window and already-submitted gates
   * for a practice exam, so each visit starts a fresh attempt.
   */
  async loadPracticeExam(authToken: string): Promise<{
    id: string;
    title: string;
    description: string;
    duration: string;
    totalQuestions: number;
  } | null> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown> | null>>('/exams/practice', authToken);
    const data = asRecord(payload.data);
    if (!data || asString(data.id) === '') return null;
    return {
      id: asString(data.id),
      title: asString(data.title),
      description: asString(data.description),
      duration: asString(data.duration),
      totalQuestions: asNumber(data.total_questions),
    };
  }

  async startExamAttempt(authToken: string, examId: string): Promise<string> {
    const payload = await this.post<Record<string, unknown>>('/exams/exam_save_start', authToken, {
      exam_id: examId,
    });

    return asString(payload.attempt_id);
  }

  async submitExamAttempt(authToken: string, attemptId: string, userAnswers: unknown[] = []): Promise<void> {
    await this.post<LegacyEnvelope<Record<string, unknown>>>('/exams/exam_save_result', authToken, {
      attempt_id: attemptId,
      user_answers: userAnswers,
    });
  }

  // Native in-portal exam taking (Naji 2026-06-01). Loads an eligible exam's
  // questions (no answer keys) and starts/resumes the attempt. Returns an
  // `error` string when the exam isn't takeable (not assigned, closed, etc.).
  //
  // Naji UAT 2026-08-11 — the payload now also carries the autosaved draft and
  // the server clock, so a student whose session/laptop/browser died mid-exam
  // resumes with their answers instead of starting again from question one
  // ("both of them started over from the beginning" — 10 Aug exam).
  async loadExamForTaking(
    authToken: string,
    examId: string,
  ): Promise<{
    attemptId: string;
    examId: string;
    title: string;
    duration: string;
    totalQuestions: number;
    questions: Array<{ questionId: string; qType: number; question: string; options: string[] }>;
    draftAnswers: ExamDraftAnswer[];
    /** Seconds left per the SERVER (attempt deadline vs window close, whichever
     * is earlier). null when the API build predates the field — the player then
     * falls back to its own duration countdown. */
    remainingSeconds: number | null;
    serverTime: string;
    /** Naji UAT 2026-08-11 — this tab's claim on the server-side draft. Sent
     * back on every autosave; a tab opened EARLIER than the one holding the
     * claim has its saves ignored, so a forgotten window stops overwriting the
     * one the student is sitting at. '' when the API build predates the field,
     * which simply means no claim is enforced. */
    draftToken: string;
    error?: string;
  }> {
    const payload = await this.post<Record<string, unknown>>('/exams/exam_take', authToken, {
      exam_id: examId,
    });
    const data = asRecord(payload.data);
    if (asNumber(payload.status) !== 1 || !data) {
      return {
        attemptId: '',
        examId,
        title: '',
        duration: '',
        totalQuestions: 0,
        questions: [],
        draftAnswers: [],
        remainingSeconds: null,
        serverTime: '',
        draftToken: '',
        error: asString(payload.message) || 'This exam is not available right now.',
      };
    }
    const questions = asArray(data.questions)
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => entry !== null)
      .map((q) => ({
        questionId: asString(q.question_id),
        // Risha UAT 2026-08-06 — q_type 0 is MCQ and 1 is Descriptive, so the
        // old `|| 1` turned every MCQ (a falsy 0) into Descriptive and the
        // player's type badge was permanently wrong. Only an explicit 1 is
        // descriptive; everything else is an MCQ.
        qType: asNumber(q.q_type) === 1 ? 1 : 0,
        question: asString(q.question),
        options: asArray(q.options).map((o) => asString(o)),
      }));
    return {
      attemptId: asString(data.attempt_id),
      examId: asString(data.exam_id) || examId,
      title: asString(data.title),
      duration: asString(data.duration),
      totalQuestions: asNumber(data.total_questions) || questions.length,
      questions,
      draftAnswers: toDraftAnswers(data.draft_answers),
      remainingSeconds: asFiniteNumberOrNull(data.remaining_seconds),
      serverTime: asString(data.server_time),
      draftToken: asString(data.draft_token),
    };
  }

  // Naji UAT 2026-08-11 — periodic best-effort autosave of an in-progress
  // attempt. Two jobs in one request: it puts the answers on the SERVER (they
  // used to live only in React state, so a 401 / refresh / dead battery wiped
  // every one of them), and it is an authenticated call every ~25s, which is
  // what keeps the session sliding through a 75-minute exam. It never scores
  // anything; the reply carries the server's own remaining time so the client
  // countdown cannot drift away from the deadline the server will enforce.
  //
  // `draftToken` says WHICH open tab this save is coming from (see
  // loadExamForTaking). A save from a tab that was superseded by a later resume
  // comes back `saved: false` with the window still open — the caller must
  // treat that as a silent no-op, never as an error a student can see.
  async saveExamProgress(
    authToken: string,
    attemptId: string,
    userAnswers: unknown[],
    draftToken: string,
  ): Promise<ExamProgressSaveResult> {
    const payload = await this.post<Record<string, unknown>>('/exams/exam_save_progress', authToken, {
      attempt_id: attemptId,
      user_answers: userAnswers,
      draft_token: draftToken,
    });
    const data = asRecord(payload.data) ?? {};
    return {
      saved: asBooleanFromLegacy(data.saved),
      remainingSeconds: asFiniteNumberOrNull(data.remaining_seconds),
      windowState: asExamWindowState(data.window_state),
      serverTime: asString(data.server_time),
    };
  }

  async startQuizAttempt(authToken: string, lessonFileId: string): Promise<string> {
    const payload = await this.post<Record<string, unknown>>('/quiz/start_quiz', authToken, {
      exam_id: lessonFileId,
    });

    return asString(payload.attempt_id);
  }

  async submitQuizAttempt(
    authToken: string,
    input: { attemptId: string; lessonFileId: string; userAnswers?: unknown[] },
  ): Promise<void> {
    await this.post<LegacyEnvelope<Record<string, unknown>>>('/quiz/save_quiz_result', authToken, {
      attempt_id: input.attemptId,
      exam_id: input.lessonFileId,
      user_answers: input.userAnswers ?? [],
    });
  }

  async startPracticeAttempt(
    authToken: string,
    input: { lessonId: string; lessonFileId: string; questionNo?: number },
  ): Promise<string> {
    const payload = await this.post<LegacyEnvelope<Record<string, unknown>>>('/practice/start_practice', authToken, {
      lesson_id: input.lessonId,
      lesson_file_id: input.lessonFileId,
      question_no: input.questionNo ?? 1,
    });

    const data = asRecord(payload.data) ?? {};
    return asString(data.attempt_id);
  }

  async submitPracticeAttempt(authToken: string, attemptId: string, userAnswers: unknown[] = []): Promise<void> {
    await this.post<LegacyEnvelope<Record<string, unknown>>>('/practice/save_practice_result', authToken, {
      attempt_id: attemptId,
      user_answers: userAnswers,
    });
  }

  async loadPayments(authToken: string, preferredCourseId = ''): Promise<StudentPaymentSnapshot> {
    const studentCoursesPayload = await this.get<LegacyEnvelope<unknown[]>>('/payment/get_student_courses', authToken);
    const studentCourses = asArray(studentCoursesPayload.data)
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => entry !== null);

    const firstCourse = preferredCourseId || asString(firstRecord(studentCourses)?.course_id);

    const [packagesPayload, paymentDetailsPayload] = await Promise.all([
      firstCourse
        ? this.get<LegacyEnvelope<Record<string, unknown>>>('/packages/index', authToken, {
            course_id: firstCourse,
          })
        : Promise.resolve({ data: { packages: [] } as Record<string, unknown> }),
      firstCourse
        ? this.get<LegacyEnvelope<Record<string, unknown>>>('/payment/get_payment_details', authToken, {
            course_id: firstCourse,
          })
        : Promise.resolve({ data: {} as Record<string, unknown> }),
    ]);

    const packageData = asRecord(packagesPayload.data) ?? {};
    const packages = asArray(packageData.packages)
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => entry !== null);

    return {
      studentCourses,
      packages,
      paymentDetails: asRecord(paymentDetailsPayload.data) ?? {},
      selectedCourseId: firstCourse,
      selectedPackageId: asString(firstRecord(packages)?.id),
    };
  }

  async loadPaymentHistory(authToken: string, courseId?: string  ): Promise<StudentPaymentHistoryItem[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/payment/get_payment_history', authToken, {
      ...(courseId ? { course_id: courseId } : {}),
    });

    return asArray(payload.data).map((entry) => {
      const row = asRecord(entry) ?? {};
      return {
        id: asString(row.id),
        amount: asNumber(row.amount),
        paymentDate: asString(row.payment_date),
        paymentMode: asString(row.payment_mode),
        status: asString(row.status) || 'Success',
        courseTitle: asString(row.course_title),
      };
    });
  }

  async loadInstallments(authToken: string, courseId?: string  ): Promise<StudentInstallmentItem[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/payment/get_installments', authToken, {
      ...(courseId ? { course_id: courseId } : {}),
    });

    return asArray(payload.data).map((entry) => {
      const row = asRecord(entry) ?? {};
      return {
        id: asString(row.id),
        installmentNo: asNumber(row.installment_no),
        installmentDetails: asString(row.installment_details),
        amount: asNumber(row.amount),
        dueDate: asString(row.due_date),
        paidDate: asString(row.paid_date),
        paymentMode: asString(row.payment_mode),
        status: asString(row.status),
      };
    });
  }

  async loadAssignmentEvaluation(authToken: string, assignmentId: string): Promise<Record<string, unknown>> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/assignment/get_assignment_evaluation', authToken, {
      assignment_id: assignmentId,
    });

    return asRecord(payload.data) ?? {};
  }

  async applyCoupon(authToken: string, input: StudentCouponInput): Promise<Record<string, unknown>> {
    const response = await this.get<Record<string, unknown>>('/payment/apply_coupon', authToken, {
      course_id: input.courseId,
      package_id: input.packageId,
      coupon_code: input.couponCode,
    });

    return response;
  }

  async createOrder(authToken: string, courseId: string): Promise<Record<string, unknown>> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/payment/create_order', authToken, {
      course_id: courseId,
    });

    return asRecord(payload.data) ?? {};
  }

  /**
   * Verifies a Razorpay payment server-side after the checkout popup
   * resolves. Returns true on success, false otherwise — the caller should
   * reload the payments view either way (server has already mutated the
   * fee_installment / payment rows).
   */
  async completeOrder(
    authToken: string,
    input: { courseId: string; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
  ): Promise<{ ok: boolean; message: string }> {
    const payload = await this.get<{ status?: number | string; message?: string }>('/payment/complete_order', authToken, {
      course_id: input.courseId,
      razorpay_order_id: input.razorpayOrderId,
      razorpay_payment_id: input.razorpayPaymentId,
      razorpay_signature: input.razorpaySignature,
    });
    const ok = payload.status === 1 || payload.status === '1';
    return { ok, message: typeof payload.message === 'string' ? payload.message : '' };
  }

  async loadNotifications(authToken: string): Promise<StudentNotificationsSnapshot> {
    const [notificationsPayload, notificationListPayload] = await Promise.all([
      this.get<LegacyEnvelope<unknown[]>>('/home/get_notification', authToken),
      this.get<LegacyEnvelope<unknown[]>>('/home/get_notification_list', authToken),
    ]);

    const notifications = asArray(notificationsPayload.data)
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => entry !== null);

    const notificationList = asArray(notificationListPayload.data)
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => entry !== null);

    return {
      notifications,
      notificationList,
    };
  }

  // The learner's own recent actions (submissions, payments, exam attempts,
  // attendance, lessons) — powers the dashboard Recent Activity feed. Resilient
  // by design: a failure here degrades to an empty feed instead of breaking the
  // whole dashboard bundle (it shares a Promise.all with the core loaders).
  async loadRecentActivity(authToken: string): Promise<StudentActivityItem[]> {
    try {
      const payload = await this.get<LegacyEnvelope<unknown[]>>('/student/recent_activity', authToken);
      return asArray(payload.data)
        .map((entry) => asRecord(entry))
        .filter((entry): entry is Record<string, unknown> => entry !== null)
        .map((r) => ({
          id: asString(r.id),
          type: asString(r.type),
          title: asString(r.title),
          detail: asString(r.detail),
          created_at: asString(r.created_at),
        }));
    } catch {
      return [];
    }
  }

  async markNotificationAsRead(authToken: string, notificationId: string): Promise<void> {
    await this.get<LegacyEnvelope<Record<string, unknown>>>('/home/mark_notification_as_read', authToken, {
      notification_id: notificationId,
    });
  }

  async saveNotificationToken(authToken: string, token: string): Promise<void> {
    await this.get<LegacyEnvelope<Record<string, unknown>>>('/home/save_notification_token', authToken, {
      notification_token: token,
    });
  }

  async loadSupport(authToken: string): Promise<StudentSupportSnapshot> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/support/get_messages', authToken);
    const messages = asArray(payload.data)
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => entry !== null);

    return {
      messages,
    };
  }

  async submitSupportMessage(authToken: string, message: string): Promise<void> {
    await this.post<Record<string, unknown>>('/support/submit_message', authToken, {
      message,
    });
  }

  static getCourseId(value: Record<string, unknown>): number {
    return asNumber(value.course_id) || asNumber(value.id);
  }

  static getAssignmentId(value: Record<string, unknown>): number {
    return asNumber(value.id);
  }

  static getExamId(value: Record<string, unknown>): number {
    return asNumber(value.id);
  }

  static getNotificationId(value: Record<string, unknown>): number {
    return asNumber(value.id);
  }

  static getMessage(value: Record<string, unknown>): string {
    return asString(value.message);
  }

  static getTitle(value: Record<string, unknown>): string {
    return asString(value.title);
  }

  static getDescription(value: Record<string, unknown>): string {
    return asString(value.description);
  }

  static isEnrolled(value: Record<string, unknown>): boolean {
    return asBooleanFromLegacy(value.is_enrolled);
  }
}
