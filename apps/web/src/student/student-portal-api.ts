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
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
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
}

export interface StudentProfileSnapshot {
  userId: number;
  roleId: number;
  name: string;
  email: string;
  phone: string;
  studentId: string;
  courseId: number;
  image: string;
  academicYear: string;
  source: 'profile' | 'session';
}

export interface StudentLearningSnapshot {
  courses: Record<string, unknown>[];
  subjects: Record<string, unknown>[];
  lessons: Record<string, unknown>[];
  lessonFiles: Record<string, unknown>[];
  selectedCourseId: number;
  selectedSubjectId: number;
  selectedLessonId: number;
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
    upcoming: Record<string, unknown>[];
    expired: Record<string, unknown>[];
  };
  examCalendar: Record<string, unknown>;
  quizLessonFileId: number;
  quizLessonId: number;
}

export interface StudentPaymentSnapshot {
  studentCourses: Record<string, unknown>[];
  packages: Record<string, unknown>[];
  paymentDetails: Record<string, unknown>;
  selectedCourseId: number;
  selectedPackageId: number;
}

export interface StudentNotificationsSnapshot {
  notifications: Record<string, unknown>[];
  notificationList: Record<string, unknown>[];
}

export interface StudentSupportSnapshot {
  messages: Record<string, unknown>[];
}

export interface StudentProfileUpdateInput {
  name: string;
  email: string;
  phone: string;
  academicYear?: string;
  image?: string;
}

export interface StudentPasswordUpdateInput {
  password: string;
  confirmPassword: string;
}

export interface StudentCouponInput {
  courseId: number;
  packageId: number;
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
    const [coursesPayload, assignmentsPayload, examsPayload, notificationsPayload, tasksPayload, streakPayload] =
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
    };
  }

  async loadProfile(authToken: string, session: AuthSession): Promise<StudentProfileSnapshot> {
    try {
      const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/profile/index', authToken);
      const profile = asRecord(payload.data) ?? {};

      return {
        userId: asNumber(profile.id) || session.userId,
        roleId: asNumber(profile.role_id) || session.roleId,
        name: asString(profile.name),
        email: asString(profile.user_email) || asString(profile.email),
        phone: asString(profile.phone),
        studentId: asString(profile.student_id),
        courseId: asNumber(profile.course_id),
        image: asString(profile.image),
        academicYear: asString(profile.academic_year),
        source: 'profile',
      };
    } catch (error: unknown) {
      if (error instanceof ApiError && error.statusCode === 404) {
        return {
          userId: session.userId,
          roleId: session.roleId,
          name: '',
          email: '',
          phone: '',
          studentId: '',
          courseId: 0,
          image: '',
          academicYear: '',
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
    });

    return this.loadProfile(authToken, session);
  }

  async changePassword(authToken: string, input: StudentPasswordUpdateInput): Promise<void> {
    await this.post<LegacyEnvelope<Record<string, unknown>>>('/profile/change_password', authToken, {
      password: input.password,
      confirm_password: input.confirmPassword,
    });
  }

  async loadLearning(authToken: string): Promise<StudentLearningSnapshot> {
    const coursesPayload = await this.get<LegacyEnvelope<unknown[]>>('/course/all_course', authToken);
    const courses = asArray(coursesPayload.data)
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => entry !== null);

    const selectedCourseId = asNumber(firstRecord(courses)?.id);

    const subjectsPayload = selectedCourseId > 0
      ? await this.get<LegacyEnvelope<unknown[]>>('/course/get_subjects', authToken, {
          course_id: selectedCourseId,
        })
      : { data: [] };

    const subjects = asArray(subjectsPayload.data)
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => entry !== null);

    const selectedSubjectId = asNumber(firstRecord(subjects)?.id);

    const lessonsPayload = selectedSubjectId > 0
      ? await this.get<LegacyEnvelope<unknown[]>>('/course/get_lessons', authToken, {
          subject_id: selectedSubjectId,
        })
      : { data: [] };

    const lessons = asArray(lessonsPayload.data)
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => entry !== null);

    const selectedLessonId = asNumber(firstRecord(lessons)?.id);

    const lessonFilesPayload = selectedLessonId > 0
      ? await this.get<LegacyEnvelope<unknown[]>>('/lesson_file/index', authToken, {
          lesson_id: selectedLessonId,
        })
      : { data: [] };

    const lessonFiles = asArray(lessonFilesPayload.data)
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => entry !== null);

    const streakPayload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/lesson_file/streak_data', authToken, {
      from_date: dayOffset(-30),
      to_date: toDateOnly(new Date()),
    });
    const streak = asRecord(streakPayload.data) ?? {};

    return {
      courses,
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
    input: { courseId: number; lessonFileId: number; lessonDuration: string; userProgress: string },
  ): Promise<void> {
    await this.get<LegacyEnvelope<Record<string, unknown>>>('/lesson_file/save_video_progress', authToken, {
      course_id: input.courseId,
      lesson_file_id: input.lessonFileId,
      lesson_duration: input.lessonDuration,
      user_progress: input.userProgress,
    });
  }

  async saveMaterialProgress(
    authToken: string,
    input: { courseId: number; lessonFileId: number; attachmentType: string },
  ): Promise<void> {
    await this.get<LegacyEnvelope<Record<string, unknown>>>('/lesson_file/save_material_progress', authToken, {
      course_id: input.courseId,
      lesson_file_id: input.lessonFileId,
      attachment_type: input.attachmentType,
    });
  }

  private async resolveQuizCandidate(authToken: string): Promise<{ lessonId: number; lessonFileId: number }> {
    const learning = await this.loadLearning(authToken);

    for (const lesson of learning.lessons) {
      const lessonId = asNumber(lesson.id);
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
            lessonFileId: asNumber(file.id),
          };
        }
      }
    }

    return {
      lessonId: 0,
      lessonFileId: 0,
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
      exams: {
        upcoming: asArray(exams.upcoming_exams).map((entry) => asRecord(entry)).filter((entry): entry is Record<string, unknown> => entry !== null),
        expired: asArray(exams.expired_exams).map((entry) => asRecord(entry)).filter((entry): entry is Record<string, unknown> => entry !== null),
      },
      examCalendar: asRecord(examCalendarPayload.data) ?? {},
      quizLessonFileId: quizCandidate.lessonFileId,
      quizLessonId: quizCandidate.lessonId,
    };
  }

  async toggleSavedAssignment(authToken: string, assignmentId: number): Promise<void> {
    await this.get<LegacyEnvelope<Record<string, unknown>>>('/assignment/save_assignment', authToken, {
      assignment_id: assignmentId,
    });
  }

  async submitAssignment(authToken: string, assignmentId: number, answerFiles: unknown): Promise<void> {
    await this.post<LegacyEnvelope<Record<string, unknown>>>('/assignment/submit_assignment', authToken, {
      assignment_id: assignmentId,
      answer_file: toAnswerFiles(answerFiles),
    });
  }

  async startExamAttempt(authToken: string, examId: number): Promise<number> {
    const payload = await this.post<Record<string, unknown>>('/exams/exam_save_start', authToken, {
      exam_id: examId,
    });

    return asNumber(payload.attempt_id);
  }

  async submitExamAttempt(authToken: string, attemptId: number, userAnswers: unknown[] = []): Promise<void> {
    await this.post<LegacyEnvelope<Record<string, unknown>>>('/exams/exam_save_result', authToken, {
      attempt_id: attemptId,
      user_answers: userAnswers,
    });
  }

  async startQuizAttempt(authToken: string, lessonFileId: number): Promise<number> {
    const payload = await this.post<Record<string, unknown>>('/quiz/start_quiz', authToken, {
      exam_id: lessonFileId,
    });

    return asNumber(payload.attempt_id);
  }

  async submitQuizAttempt(
    authToken: string,
    input: { attemptId: number; lessonFileId: number; userAnswers?: unknown[] },
  ): Promise<void> {
    await this.post<LegacyEnvelope<Record<string, unknown>>>('/quiz/save_quiz_result', authToken, {
      attempt_id: input.attemptId,
      exam_id: input.lessonFileId,
      user_answers: input.userAnswers ?? [],
    });
  }

  async startPracticeAttempt(
    authToken: string,
    input: { lessonId: number; lessonFileId: number; questionNo?: number },
  ): Promise<number> {
    const payload = await this.post<LegacyEnvelope<Record<string, unknown>>>('/practice/start_practice', authToken, {
      lesson_id: input.lessonId,
      lesson_file_id: input.lessonFileId,
      question_no: input.questionNo ?? 1,
    });

    const data = asRecord(payload.data) ?? {};
    return asNumber(data.attempt_id);
  }

  async submitPracticeAttempt(authToken: string, attemptId: number, userAnswers: unknown[] = []): Promise<void> {
    await this.post<LegacyEnvelope<Record<string, unknown>>>('/practice/save_practice_result', authToken, {
      attempt_id: attemptId,
      user_answers: userAnswers,
    });
  }

  async loadPayments(authToken: string, preferredCourseId = 0): Promise<StudentPaymentSnapshot> {
    const studentCoursesPayload = await this.get<LegacyEnvelope<unknown[]>>('/payment/get_student_courses', authToken);
    const studentCourses = asArray(studentCoursesPayload.data)
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => entry !== null);

    const firstCourse = preferredCourseId > 0 ? preferredCourseId : asNumber(firstRecord(studentCourses)?.course_id);

    const [packagesPayload, paymentDetailsPayload] = await Promise.all([
      firstCourse > 0
        ? this.get<LegacyEnvelope<Record<string, unknown>>>('/packages/index', authToken, {
            course_id: firstCourse,
          })
        : Promise.resolve({ data: { packages: [] } as Record<string, unknown> }),
      firstCourse > 0
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
      selectedPackageId: asNumber(firstRecord(packages)?.id),
    };
  }

  async applyCoupon(authToken: string, input: StudentCouponInput): Promise<Record<string, unknown>> {
    const response = await this.get<Record<string, unknown>>('/payment/apply_coupon', authToken, {
      course_id: input.courseId,
      package_id: input.packageId,
      coupon_code: input.couponCode,
    });

    return response;
  }

  async createOrder(authToken: string, courseId: number): Promise<Record<string, unknown>> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/payment/create_order', authToken, {
      course_id: courseId,
    });

    return asRecord(payload.data) ?? {};
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

  async markNotificationAsRead(authToken: string, notificationId: number): Promise<void> {
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
