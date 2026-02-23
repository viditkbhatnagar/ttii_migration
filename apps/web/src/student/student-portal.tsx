import type { AuthSession } from '@ttii/frontend-core';
import { InlineNotice, MetricCard, PortalScaffold, ShellCard } from '@ttii/ui';
import { useEffect, useMemo, useState } from 'react';

import type {
  StudentPortalApi,
  StudentAssessmentSnapshot,
  StudentDashboardSnapshot,
  StudentLearningSnapshot,
  StudentNotificationsSnapshot,
  StudentPaymentSnapshot,
  StudentProfileSnapshot,
  StudentSupportSnapshot,
} from './student-portal-api.js';

type StudentSectionId =
  | 'dashboard'
  | 'profile'
  | 'learning'
  | 'assessments'
  | 'payments'
  | 'notifications'
  | 'support';

interface StudentSectionNavItem {
  id: StudentSectionId;
  label: string;
  href: string;
  subtitle: string;
}

const STUDENT_SECTION_NAV: readonly StudentSectionNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/student/dashboard',
    subtitle: 'Overview and KPIs',
  },
  {
    id: 'profile',
    label: 'Profile',
    href: '/student/profile',
    subtitle: 'Identity and password',
  },
  {
    id: 'learning',
    label: 'Learning',
    href: '/student/learning',
    subtitle: 'Courses and lessons',
  },
  {
    id: 'assessments',
    label: 'Assessments',
    href: '/student/assessments',
    subtitle: 'Assignments, exams, quizzes',
  },
  {
    id: 'payments',
    label: 'Payments',
    href: '/student/payments',
    subtitle: 'Plans and fee ledger',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    href: '/student/notifications',
    subtitle: 'Inbox and read state',
  },
  {
    id: 'support',
    label: 'Support',
    href: '/student/support',
    subtitle: 'Support chat',
  },
] as const;

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

function asBoolean(value: unknown): boolean {
  return value === 1 || value === true || value === '1' || value === 'true' || value === 'on';
}

export function resolveStudentSection(pathname: string): StudentSectionId | null {
  const normalized = pathname.trim();
  if (normalized === '/student' || normalized === '/student/') {
    return 'dashboard';
  }

  const match = STUDENT_SECTION_NAV.find((item) => normalized === item.href);
  return match?.id ?? null;
}

export function normalizeStudentPath(pathname: string): string {
  if (pathname.trim() === '/student' || pathname.trim() === '/student/') {
    return '/student/dashboard';
  }

  const section = resolveStudentSection(pathname);
  if (!section) {
    return pathname;
  }

  const match = STUDENT_SECTION_NAV.find((item) => item.id === section);
  return match?.href ?? pathname;
}

function firstRecord(values: Record<string, unknown>[]): Record<string, unknown> | null {
  if (values.length === 0) {
    return null;
  }

  return values[0] ?? null;
}

function toRecords(values: unknown): Record<string, unknown>[] {
  return asArray(values)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null);
}

function toMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected request failure.';
}

interface StudentPortalProps {
  pathname: string;
  session: AuthSession;
  api: StudentPortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

interface SectionActionState {
  pending: boolean;
  message: string;
  error: string | null;
}

function useSectionActionState(): [SectionActionState, (value: SectionActionState) => void] {
  const [state, setState] = useState<SectionActionState>({
    pending: false,
    message: '',
    error: null,
  });

  return [state, setState];
}

function StudentDashboardSection({ api, session }: { api: StudentPortalApi; session: AuthSession }) {
  const [snapshot, setSnapshot] = useState<StudentDashboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.loadDashboard(session.token);
      setSnapshot(result);
    } catch (sectionError: unknown) {
      setError(toMessage(sectionError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  if (loading) {
    return <InlineNotice tone="info" title="Dashboard loading">Fetching student dashboard metrics from migrated APIs.</InlineNotice>;
  }

  if (error) {
    return (
      <InlineNotice tone="danger" title="Dashboard failed">
        <p>{error}</p>
        <button type="button" className="action-button action-button--small" onClick={() => void load()}>
          Retry
        </button>
      </InlineNotice>
    );
  }

  const data = snapshot;
  if (!data) {
    return <InlineNotice tone="warning" title="No dashboard data">No dashboard data available for this account.</InlineNotice>;
  }

  return (
    <section className="student-section" aria-label="Student dashboard">
      <header className="student-section__header">
        <h2>Dashboard</h2>
        <p>Student KPI parity pulled from content, assessment, engagement, and task APIs.</p>
      </header>

      <section className="metrics-grid" aria-label="Student dashboard metrics">
        <MetricCard label="Courses" value={String(data.coursesCount)} detail={`Primary: ${data.primaryCourseTitle || 'N/A'}`} tone="info" />
        <MetricCard label="Assignments" value={String(data.currentAssignments)} detail={`${data.upcomingAssignments} upcoming / ${data.completedAssignments} completed`} tone="neutral" />
        <MetricCard label="Exams" value={String(data.upcomingExams)} detail={`${data.expiredExams} expired`} tone="warning" />
        <MetricCard label="Notifications" value={String(data.notificationsCount)} detail="Student inbox" tone="success" />
        <MetricCard label="Tasks Today" value={String(data.scheduledTasks)} detail={`${data.overdueTasks} overdue`} tone="neutral" />
        <MetricCard label="Streak" value={String(data.streakCurrent)} detail={`Total ${data.streakTotal}`} tone="success" />
      </section>

      <div className="student-actions">
        <button type="button" className="action-button action-button--small" onClick={() => void load()}>
          Refresh dashboard
        </button>
      </div>
    </section>
  );
}

function StudentProfileSection({ api, session }: { api: StudentPortalApi; session: AuthSession }) {
  const [profile, setProfile] = useState<StudentProfileSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useSectionActionState();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [academicYear, setAcademicYear] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const nextProfile = await api.loadProfile(session.token, session);
      setProfile(nextProfile);
      setName(nextProfile.name);
      setEmail(nextProfile.email);
      setPhone(nextProfile.phone);
      setAcademicYear(nextProfile.academicYear);
    } catch (sectionError: unknown) {
      setError(toMessage(sectionError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token, session.userId, session.roleId]);

  const updateProfile = async (): Promise<void> => {
    setActionState({ pending: true, message: '', error: null });

    try {
      const updated = await api.updateProfile(
        session.token,
        {
          name,
          email,
          phone,
          academicYear,
        },
        session,
      );
      setProfile(updated);
      setActionState({ pending: false, message: 'Profile updated.', error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: toMessage(actionError) });
    }
  };

  const updatePassword = async (): Promise<void> => {
    setActionState({ pending: true, message: '', error: null });

    try {
      await api.changePassword(session.token, {
        password,
        confirmPassword,
      });
      setPassword('');
      setConfirmPassword('');
      setActionState({ pending: false, message: 'Password changed.', error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: toMessage(actionError) });
    }
  };

  if (loading) {
    return <InlineNotice tone="info" title="Profile loading">Fetching profile details.</InlineNotice>;
  }

  if (error) {
    return (
      <InlineNotice tone="danger" title="Profile failed">
        <p>{error}</p>
        <button type="button" className="action-button action-button--small" onClick={() => void load()}>
          Retry
        </button>
      </InlineNotice>
    );
  }

  return (
    <section className="student-section" aria-label="Student profile">
      <header className="student-section__header">
        <h2>Profile</h2>
        <p>Student identity and password management over legacy-compatible profile endpoints.</p>
      </header>

      {profile?.source === 'session' ? (
        <InlineNotice tone="warning" title="Profile endpoint unavailable">
          Profile API is not available in this environment; displaying session-backed fallback details.
        </InlineNotice>
      ) : null}

      {actionState.error ? (
        <InlineNotice tone="danger" title="Profile action failed">
          {actionState.error}
        </InlineNotice>
      ) : null}

      {actionState.message ? (
        <InlineNotice tone="success" title="Profile action complete">
          {actionState.message}
        </InlineNotice>
      ) : null}

      <section className="shell-cards-grid">
        <ShellCard title="Profile details" subtitle={`User ID ${profile?.userId ?? session.userId} | Role ${profile?.roleId ?? session.roleId}`}>
          <form
            className="student-form"
            onSubmit={(event) => {
              event.preventDefault();
              void updateProfile();
            }}
          >
            <label>
              Name
              <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
            </label>

            <label>
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>

            <label>
              Phone
              <input type="text" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </label>

            <label>
              Academic year
              <input type="text" value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} />
            </label>

            <button type="submit" className="action-button action-button--small" disabled={actionState.pending}>
              {actionState.pending ? 'Saving...' : 'Save profile'}
            </button>
          </form>
        </ShellCard>

        <ShellCard title="Password" subtitle="Legacy-compatible confirmation check with Node auth hash storage." theme="dark">
          <form
            className="student-form"
            onSubmit={(event) => {
              event.preventDefault();
              void updatePassword();
            }}
          >
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
            </label>

            <label>
              Confirm password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
              />
            </label>

            <button type="submit" className="action-button action-button--small" disabled={actionState.pending}>
              {actionState.pending ? 'Saving...' : 'Change password'}
            </button>
          </form>
        </ShellCard>
      </section>
    </section>
  );
}

function StudentLearningSection({ api, session }: { api: StudentPortalApi; session: AuthSession }) {
  const [snapshot, setSnapshot] = useState<StudentLearningSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useSectionActionState();

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const nextSnapshot = await api.loadLearning(session.token);
      setSnapshot(nextSnapshot);
    } catch (sectionError: unknown) {
      setError(toMessage(sectionError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  const updateFirstProgress = async (): Promise<void> => {
    const data = snapshot;
    if (!data) {
      return;
    }

    const firstFile = firstRecord(data.lessonFiles);
    const lessonFileId = asNumber(firstFile?.id);

    if (lessonFileId <= 0 || data.selectedCourseId <= 0) {
      setActionState({ pending: false, message: '', error: 'No lesson file available for progress update.' });
      return;
    }

    setActionState({ pending: true, message: '', error: null });

    try {
      const attachmentType = asString(firstFile?.attachment_type).toLowerCase();
      if (attachmentType === 'video' || attachmentType === 'url') {
        await api.saveVideoProgress(session.token, {
          courseId: data.selectedCourseId,
          lessonFileId,
          lessonDuration: '00:10:00',
          userProgress: '00:10:00',
        });
      } else {
        await api.saveMaterialProgress(session.token, {
          courseId: data.selectedCourseId,
          lessonFileId,
          attachmentType: attachmentType || 'pdf',
        });
      }

      await load();
      setActionState({ pending: false, message: 'Progress updated for first lesson item.', error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: toMessage(actionError) });
    }
  };

  if (loading) {
    return <InlineNotice tone="info" title="Learning loading">Fetching courses, subjects, lessons, and files.</InlineNotice>;
  }

  if (error) {
    return (
      <InlineNotice tone="danger" title="Learning failed">
        <p>{error}</p>
        <button type="button" className="action-button action-button--small" onClick={() => void load()}>
          Retry
        </button>
      </InlineNotice>
    );
  }

  const data = snapshot;
  if (!data) {
    return <InlineNotice tone="warning" title="No learning data">No enrolled learning data found for this account.</InlineNotice>;
  }

  return (
    <section className="student-section" aria-label="Student learning">
      <header className="student-section__header">
        <h2>Learning</h2>
        <p>Course, subject, lesson, and file progression parity for the student portal.</p>
      </header>

      {actionState.error ? (
        <InlineNotice tone="danger" title="Learning action failed">
          {actionState.error}
        </InlineNotice>
      ) : null}

      {actionState.message ? (
        <InlineNotice tone="success" title="Learning action complete">
          {actionState.message}
        </InlineNotice>
      ) : null}

      <section className="metrics-grid" aria-label="Learning metrics">
        <MetricCard label="Courses" value={String(data.courses.length)} detail="Catalog parity" tone="info" />
        <MetricCard label="Subjects" value={String(data.subjects.length)} detail="Sequencing + locks" tone="neutral" />
        <MetricCard label="Lessons" value={String(data.lessons.length)} detail="Lesson progression" tone="success" />
        <MetricCard label="Lesson Files" value={String(data.lessonFiles.length)} detail="Grouped by parent video" tone="neutral" />
        <MetricCard label="Current Streak" value={String(data.streakCurrent)} detail={`Total ${data.streakTotal}`} tone="success" />
        <MetricCard label="Active Course" value={String(data.selectedCourseId || 0)} detail="Selected from catalog" tone="warning" />
      </section>

      <section className="shell-cards-grid">
        <ShellCard title="Lessons" subtitle="First-subject lesson flow for parity validation.">
          <ul className="student-list">
            {data.lessons.slice(0, 6).map((lesson) => (
              <li key={asNumber(lesson.id)}>
                <strong>{asString(lesson.title) || `Lesson ${asNumber(lesson.id)}`}</strong>
                <span>Completion: {asNumber(lesson.completed_percentage)}%</span>
                <span>Locked: {asBoolean(lesson.lock) ? 'Yes' : 'No'}</span>
              </li>
            ))}
          </ul>
        </ShellCard>

        <ShellCard title="Lesson files" subtitle="Video-rooted grouped resources.">
          <ul className="student-list">
            {data.lessonFiles.slice(0, 6).map((file) => (
              <li key={asNumber(file.id)}>
                <strong>{asString(file.title) || `File ${asNumber(file.id)}`}</strong>
                <span>Type: {asString(file.attachment_type) || asString(file.lesson_type) || 'Unknown'}</span>
                <span>Related: {toRecords(file.related_files).length}</span>
              </li>
            ))}
          </ul>
        </ShellCard>
      </section>

      <div className="student-actions">
        <button type="button" className="action-button action-button--small" onClick={() => void updateFirstProgress()} disabled={actionState.pending}>
          {actionState.pending ? 'Updating...' : 'Update first progress item'}
        </button>
        <button type="button" className="action-button action-button--small action-button--ghost" onClick={() => void load()}>
          Reload learning
        </button>
      </div>
    </section>
  );
}

function StudentAssessmentsSection({ api, session }: { api: StudentPortalApi; session: AuthSession }) {
  const [snapshot, setSnapshot] = useState<StudentAssessmentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useSectionActionState();

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const nextSnapshot = await api.loadAssessments(session.token);
      setSnapshot(nextSnapshot);
    } catch (sectionError: unknown) {
      setError(toMessage(sectionError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  const runAction = async (operation: () => Promise<void>, successMessage: string): Promise<void> => {
    setActionState({ pending: true, message: '', error: null });

    try {
      await operation();
      await load();
      setActionState({ pending: false, message: successMessage, error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: toMessage(actionError) });
    }
  };

  const toggleFirstSavedAssignment = async (): Promise<void> => {
    const first = firstRecord(snapshot?.assignments.current ?? []);
    const assignmentId = asNumber(first?.id);
    if (assignmentId <= 0) {
      setActionState({ pending: false, message: '', error: 'No current assignment to toggle.' });
      return;
    }

    await runAction(async () => {
      await api.toggleSavedAssignment(session.token, assignmentId);
    }, 'Current assignment save toggle completed.');
  };

  const submitFirstAssignment = async (): Promise<void> => {
    const first = firstRecord(snapshot?.assignments.current ?? []);
    const assignmentId = asNumber(first?.id);
    if (assignmentId <= 0) {
      setActionState({ pending: false, message: '', error: 'No current assignment to submit.' });
      return;
    }

    await runAction(async () => {
      await api.submitAssignment(session.token, assignmentId, ['uploads/submissions/phase12-student.txt']);
    }, 'Assignment submission request completed.');
  };

  const submitFirstExam = async (): Promise<void> => {
    const first = firstRecord(snapshot?.exams.expired ?? snapshot?.exams.upcoming ?? []);
    const examId = asNumber(first?.id);

    if (examId <= 0) {
      setActionState({ pending: false, message: '', error: 'No exam available to submit.' });
      return;
    }

    await runAction(async () => {
      const attemptId = await api.startExamAttempt(session.token, examId);
      if (attemptId > 0) {
        await api.submitExamAttempt(session.token, attemptId, []);
      }
    }, 'Exam attempt lifecycle executed.');
  };

  const submitQuizAndPractice = async (): Promise<void> => {
    const data = snapshot;
    if (!data || data.quizLessonFileId <= 0) {
      setActionState({ pending: false, message: '', error: 'No quiz lesson file discovered.' });
      return;
    }

    await runAction(async () => {
      const quizAttemptId = await api.startQuizAttempt(session.token, data.quizLessonFileId);
      if (quizAttemptId > 0) {
        await api.submitQuizAttempt(session.token, {
          attemptId: quizAttemptId,
          lessonFileId: data.quizLessonFileId,
          userAnswers: [],
        });
      }

      const practiceAttemptId = await api.startPracticeAttempt(session.token, {
        lessonId: data.quizLessonId,
        lessonFileId: data.quizLessonFileId,
        questionNo: 1,
      });

      if (practiceAttemptId > 0) {
        await api.submitPracticeAttempt(session.token, practiceAttemptId, []);
      }
    }, 'Quiz and practice workflows executed.');
  };

  if (loading) {
    return <InlineNotice tone="info" title="Assessments loading">Fetching assignments, exams, and calendar.</InlineNotice>;
  }

  if (error) {
    return (
      <InlineNotice tone="danger" title="Assessments failed">
        <p>{error}</p>
        <button type="button" className="action-button action-button--small" onClick={() => void load()}>
          Retry
        </button>
      </InlineNotice>
    );
  }

  const data = snapshot;
  if (!data) {
    return <InlineNotice tone="warning" title="No assessment data">No assessment records available.</InlineNotice>;
  }

  return (
    <section className="student-section" aria-label="Student assessments">
      <header className="student-section__header">
        <h2>Assessments</h2>
        <p>Assignments, exams, quiz, and practice workflow parity in React student portal.</p>
      </header>

      {actionState.error ? (
        <InlineNotice tone="danger" title="Assessment action failed">
          {actionState.error}
        </InlineNotice>
      ) : null}

      {actionState.message ? (
        <InlineNotice tone="success" title="Assessment action complete">
          {actionState.message}
        </InlineNotice>
      ) : null}

      <section className="metrics-grid" aria-label="Assessment metrics">
        <MetricCard label="Assignments" value={String(data.assignments.current.length)} detail={`${data.assignments.upcoming.length} upcoming`} tone="info" />
        <MetricCard label="Completed" value={String(data.assignments.completed.length)} detail="Submitted assignments" tone="success" />
        <MetricCard label="Upcoming Exams" value={String(data.exams.upcoming.length)} detail={`${data.exams.expired.length} expired`} tone="warning" />
        <MetricCard label="Calendar Days" value={String(asNumber(data.examCalendar.total_days))} detail={asString(data.examCalendar.title) || 'Exam schedule'} tone="neutral" />
        <MetricCard label="Quiz File" value={String(data.quizLessonFileId || 0)} detail="Auto-discovered from lessons" tone="neutral" />
      </section>

      <section className="shell-cards-grid">
        <ShellCard title="Current assignments" subtitle="First six active assignments">
          <ul className="student-list">
            {data.assignments.current.slice(0, 6).map((assignment) => (
              <li key={asNumber(assignment.id)}>
                <strong>{asString(assignment.title) || `Assignment ${asNumber(assignment.id)}`}</strong>
                <span>Status: {asString(assignment.status) || 'Current'}</span>
                <span>Saved: {asNumber(assignment.is_saved)}</span>
              </li>
            ))}
          </ul>
        </ShellCard>

        <ShellCard title="Exam windows" subtitle="Upcoming and expired exam cards" theme="dark">
          <ul className="student-list">
            {data.exams.upcoming.concat(data.exams.expired).slice(0, 6).map((exam) => (
              <li key={asNumber(exam.id)}>
                <strong>{asString(exam.title) || `Exam ${asNumber(exam.id)}`}</strong>
                <span>{asString(exam.date)}</span>
                <span>{asString(exam.questions_count)}</span>
              </li>
            ))}
          </ul>
        </ShellCard>
      </section>

      <div className="student-actions">
        <button
          type="button"
          className="action-button action-button--small"
          onClick={() => void toggleFirstSavedAssignment()}
          disabled={actionState.pending}
        >
          Toggle first saved assignment
        </button>
        <button
          type="button"
          className="action-button action-button--small"
          onClick={() => void submitFirstAssignment()}
          disabled={actionState.pending}
        >
          Submit first assignment
        </button>
        <button
          type="button"
          className="action-button action-button--small"
          onClick={() => void submitFirstExam()}
          disabled={actionState.pending}
        >
          Run first exam attempt
        </button>
        <button
          type="button"
          className="action-button action-button--small"
          onClick={() => void submitQuizAndPractice()}
          disabled={actionState.pending}
        >
          Run quiz and practice
        </button>
      </div>
    </section>
  );
}

function StudentPaymentsSection({ api, session }: { api: StudentPortalApi; session: AuthSession }) {
  const [snapshot, setSnapshot] = useState<StudentPaymentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useSectionActionState();
  const [couponCode, setCouponCode] = useState('');
  const [couponResponse, setCouponResponse] = useState<Record<string, unknown> | null>(null);
  const [orderResponse, setOrderResponse] = useState<Record<string, unknown> | null>(null);

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const nextSnapshot = await api.loadPayments(session.token);
      setSnapshot(nextSnapshot);
    } catch (sectionError: unknown) {
      setError(toMessage(sectionError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  const applyCoupon = async (): Promise<void> => {
    const data = snapshot;
    if (!data || data.selectedCourseId <= 0 || data.selectedPackageId <= 0 || couponCode.trim() === '') {
      setActionState({ pending: false, message: '', error: 'Coupon input requires course, package, and code.' });
      return;
    }

    setActionState({ pending: true, message: '', error: null });

    try {
      const response = await api.applyCoupon(session.token, {
        courseId: data.selectedCourseId,
        packageId: data.selectedPackageId,
        couponCode,
      });

      setCouponResponse(response);
      setActionState({ pending: false, message: 'Coupon checked.', error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: toMessage(actionError) });
    }
  };

  const createOrder = async (): Promise<void> => {
    const data = snapshot;
    if (!data || data.selectedCourseId <= 0) {
      setActionState({ pending: false, message: '', error: 'No course available for order creation.' });
      return;
    }

    setActionState({ pending: true, message: '', error: null });

    try {
      const response = await api.createOrder(session.token, data.selectedCourseId);
      setOrderResponse(response);
      setActionState({ pending: false, message: 'Payment order created.', error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: toMessage(actionError) });
    }
  };

  if (loading) {
    return <InlineNotice tone="info" title="Payments loading">Fetching packages and student fee ledger.</InlineNotice>;
  }

  if (error) {
    return (
      <InlineNotice tone="danger" title="Payments failed">
        <p>{error}</p>
        <button type="button" className="action-button action-button--small" onClick={() => void load()}>
          Retry
        </button>
      </InlineNotice>
    );
  }

  const data = snapshot;
  if (!data) {
    return <InlineNotice tone="warning" title="No payment data">Payment ledger is empty for this user.</InlineNotice>;
  }

  return (
    <section className="student-section" aria-label="Student payments">
      <header className="student-section__header">
        <h2>Payments</h2>
        <p>Packages, coupon validation, and student fee ledger parity.</p>
      </header>

      {actionState.error ? (
        <InlineNotice tone="danger" title="Payment action failed">
          {actionState.error}
        </InlineNotice>
      ) : null}

      {actionState.message ? (
        <InlineNotice tone="success" title="Payment action complete">
          {actionState.message}
        </InlineNotice>
      ) : null}

      <section className="metrics-grid" aria-label="Payment metrics">
        <MetricCard label="Courses in ledger" value={String(data.studentCourses.length)} detail="/payment/get_student_courses" tone="info" />
        <MetricCard label="Packages" value={String(data.packages.length)} detail={`Course ${data.selectedCourseId || 0}`} tone="neutral" />
        <MetricCard label="Installments" value={String(toRecords(data.paymentDetails.installments).length)} detail="/payment/get_payment_details" tone="warning" />
      </section>

      <section className="shell-cards-grid">
        <ShellCard title="Fee ledger" subtitle="Student course fees and installment status.">
          <ul className="student-list">
            {data.studentCourses.slice(0, 6).map((course) => (
              <li key={asNumber(course.course_id)}>
                <strong>{asString(course.title) || `Course ${asNumber(course.course_id)}`}</strong>
                <span>Status: {asString(course.status) || 'Unknown'}</span>
                <span>Balance: {asNumber(course.balance)}</span>
              </li>
            ))}
          </ul>
        </ShellCard>

        <ShellCard title="Packages" subtitle="Active package list for selected course." theme="dark">
          <ul className="student-list">
            {data.packages.slice(0, 6).map((pkg) => (
              <li key={asNumber(pkg.id)}>
                <strong>{asString(pkg.title) || `Package ${asNumber(pkg.id)}`}</strong>
                <span>Payable: {asNumber(pkg.payable_amount)}</span>
                <span>Purchased: {asBoolean(pkg.is_purchased) ? 'Yes' : 'No'}</span>
              </li>
            ))}
          </ul>
        </ShellCard>
      </section>

      <div className="student-actions">
        <label className="inline-input">
          Coupon
          <input type="text" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="SAVE20" />
        </label>
        <button type="button" className="action-button action-button--small" onClick={() => void applyCoupon()} disabled={actionState.pending}>
          Apply coupon
        </button>
        <button type="button" className="action-button action-button--small" onClick={() => void createOrder()} disabled={actionState.pending}>
          Create order
        </button>
        <button type="button" className="action-button action-button--small action-button--ghost" onClick={() => void load()}>
          Reload payments
        </button>
      </div>

      {couponResponse ? (
        <ShellCard title="Coupon response" subtitle="Raw parity payload for validation.">
          <pre className="student-json">{JSON.stringify(couponResponse, null, 2)}</pre>
        </ShellCard>
      ) : null}

      {orderResponse ? (
        <ShellCard title="Order response" subtitle="Create-order payload for gateway handoff.">
          <pre className="student-json">{JSON.stringify(orderResponse, null, 2)}</pre>
        </ShellCard>
      ) : null}
    </section>
  );
}

function StudentNotificationsSection({ api, session }: { api: StudentPortalApi; session: AuthSession }) {
  const [snapshot, setSnapshot] = useState<StudentNotificationsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useSectionActionState();
  const [notificationToken, setNotificationToken] = useState('phase12-browser-token');

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const nextSnapshot = await api.loadNotifications(session.token);
      setSnapshot(nextSnapshot);
    } catch (sectionError: unknown) {
      setError(toMessage(sectionError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  const markFirstRead = async (): Promise<void> => {
    const first = firstRecord(snapshot?.notifications ?? []);
    const notificationId = asNumber(first?.id);

    if (notificationId <= 0) {
      setActionState({ pending: false, message: '', error: 'No notification to mark as read.' });
      return;
    }

    setActionState({ pending: true, message: '', error: null });

    try {
      await api.markNotificationAsRead(session.token, notificationId);
      await load();
      setActionState({ pending: false, message: 'Marked first notification as read.', error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: toMessage(actionError) });
    }
  };

  const saveToken = async (): Promise<void> => {
    setActionState({ pending: true, message: '', error: null });

    try {
      await api.saveNotificationToken(session.token, notificationToken);
      setActionState({ pending: false, message: 'Notification token saved.', error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: toMessage(actionError) });
    }
  };

  if (loading) {
    return <InlineNotice tone="info" title="Notifications loading">Fetching notification feeds.</InlineNotice>;
  }

  if (error) {
    return (
      <InlineNotice tone="danger" title="Notifications failed">
        <p>{error}</p>
        <button type="button" className="action-button action-button--small" onClick={() => void load()}>
          Retry
        </button>
      </InlineNotice>
    );
  }

  const data = snapshot;
  if (!data) {
    return <InlineNotice tone="warning" title="No notifications">Notification feeds are empty.</InlineNotice>;
  }

  return (
    <section className="student-section" aria-label="Student notifications">
      <header className="student-section__header">
        <h2>Notifications</h2>
        <p>Notification inbox, list feed, and read/token mutation parity.</p>
      </header>

      {actionState.error ? (
        <InlineNotice tone="danger" title="Notification action failed">
          {actionState.error}
        </InlineNotice>
      ) : null}

      {actionState.message ? (
        <InlineNotice tone="success" title="Notification action complete">
          {actionState.message}
        </InlineNotice>
      ) : null}

      <section className="metrics-grid" aria-label="Notification metrics">
        <MetricCard label="Inbox" value={String(data.notifications.length)} detail="Course + global" tone="info" />
        <MetricCard label="Master list" value={String(data.notificationList.length)} detail="All system notifications" tone="neutral" />
      </section>

      <section className="shell-cards-grid">
        <ShellCard title="Inbox notifications" subtitle="User-scoped notification entries.">
          <ul className="student-list">
            {data.notifications.slice(0, 8).map((notification) => (
              <li key={asNumber(notification.id)}>
                <strong>{asString(notification.title) || `Notification ${asNumber(notification.id)}`}</strong>
                <span>{asString(notification.description)}</span>
              </li>
            ))}
          </ul>
        </ShellCard>

        <ShellCard title="System list" subtitle="Global ordered notification feed." theme="dark">
          <ul className="student-list">
            {data.notificationList.slice(0, 8).map((notification) => (
              <li key={asNumber(notification.id)}>
                <strong>{asString(notification.title) || `Notification ${asNumber(notification.id)}`}</strong>
                <span>{asString(notification.description)}</span>
              </li>
            ))}
          </ul>
        </ShellCard>
      </section>

      <div className="student-actions">
        <button type="button" className="action-button action-button--small" onClick={() => void markFirstRead()} disabled={actionState.pending}>
          Mark first as read
        </button>
        <label className="inline-input">
          Device token
          <input type="text" value={notificationToken} onChange={(event) => setNotificationToken(event.target.value)} />
        </label>
        <button type="button" className="action-button action-button--small" onClick={() => void saveToken()} disabled={actionState.pending}>
          Save token
        </button>
      </div>
    </section>
  );
}

function StudentSupportSection({ api, session }: { api: StudentPortalApi; session: AuthSession }) {
  const [snapshot, setSnapshot] = useState<StudentSupportSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useSectionActionState();
  const [message, setMessage] = useState('Need help with assignment submission parity.');

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const nextSnapshot = await api.loadSupport(session.token);
      setSnapshot(nextSnapshot);
    } catch (sectionError: unknown) {
      setError(toMessage(sectionError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  const submitMessage = async (): Promise<void> => {
    if (message.trim() === '') {
      setActionState({ pending: false, message: '', error: 'Message cannot be empty.' });
      return;
    }

    setActionState({ pending: true, message: '', error: null });

    try {
      await api.submitSupportMessage(session.token, message);
      await load();
      setMessage('');
      setActionState({ pending: false, message: 'Support message submitted.', error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: toMessage(actionError) });
    }
  };

  if (loading) {
    return <InlineNotice tone="info" title="Support loading">Fetching support conversation.</InlineNotice>;
  }

  if (error) {
    return (
      <InlineNotice tone="danger" title="Support failed">
        <p>{error}</p>
        <button type="button" className="action-button action-button--small" onClick={() => void load()}>
          Retry
        </button>
      </InlineNotice>
    );
  }

  const data = snapshot;
  if (!data) {
    return <InlineNotice tone="warning" title="No support data">No support messages available.</InlineNotice>;
  }

  return (
    <section className="student-section" aria-label="Student support">
      <header className="student-section__header">
        <h2>Support</h2>
        <p>Support chat parity with message load and submit flows.</p>
      </header>

      {actionState.error ? (
        <InlineNotice tone="danger" title="Support action failed">
          {actionState.error}
        </InlineNotice>
      ) : null}

      {actionState.message ? (
        <InlineNotice tone="success" title="Support action complete">
          {actionState.message}
        </InlineNotice>
      ) : null}

      <ShellCard title="Conversation" subtitle="Latest support chat messages for current learner.">
        <ul className="student-list">
          {data.messages.slice(-12).map((entry) => (
            <li key={asNumber(entry.id)}>
              <strong>{asNumber(entry.sender_id) === session.userId ? 'You' : `Agent ${asNumber(entry.sender_id)}`}</strong>
              <span>{asString(entry.message)}</span>
              <span>{asString(entry.created_at)}</span>
            </li>
          ))}
        </ul>
      </ShellCard>

      <div className="student-actions">
        <label className="inline-input inline-input--wide">
          Message
          <input type="text" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Type support message" />
        </label>
        <button type="button" className="action-button action-button--small" onClick={() => void submitMessage()} disabled={actionState.pending}>
          Send message
        </button>
      </div>
    </section>
  );
}

function StudentSectionRenderer({ sectionId, api, session }: { sectionId: StudentSectionId; api: StudentPortalApi; session: AuthSession }) {
  if (sectionId === 'dashboard') {
    return <StudentDashboardSection api={api} session={session} />;
  }

  if (sectionId === 'profile') {
    return <StudentProfileSection api={api} session={session} />;
  }

  if (sectionId === 'learning') {
    return <StudentLearningSection api={api} session={session} />;
  }

  if (sectionId === 'assessments') {
    return <StudentAssessmentsSection api={api} session={session} />;
  }

  if (sectionId === 'payments') {
    return <StudentPaymentsSection api={api} session={session} />;
  }

  if (sectionId === 'notifications') {
    return <StudentNotificationsSection api={api} session={session} />;
  }

  return <StudentSupportSection api={api} session={session} />;
}

export function StudentPortal({ pathname, session, api, onNavigate, onLogout }: StudentPortalProps) {
  const sectionId = resolveStudentSection(pathname);

  const activeHref = useMemo(() => {
    if (!sectionId) {
      return '';
    }

    const item = STUDENT_SECTION_NAV.find((entry) => entry.id === sectionId);
    return item?.href ?? '';
  }, [sectionId]);

  if (!sectionId) {
    return (
      <PortalScaffold
        roleLabel="Student App"
        title="Student Portal"
        subtitle="React migration routes for learner features"
        navItems={STUDENT_SECTION_NAV}
        activeHref={activeHref}
        onNavigate={onNavigate}
        onLogout={onLogout}
      >
        <InlineNotice tone="warning" title="Unknown student route">
          <p>No student section is registered for path: {pathname}</p>
          <button type="button" className="action-button action-button--small" onClick={() => onNavigate('/student/dashboard')}>
            Open dashboard
          </button>
        </InlineNotice>
      </PortalScaffold>
    );
  }

  return (
    <PortalScaffold
      roleLabel="Student App"
      title="Student Portal"
      subtitle="Phase 12 parity pages on migrated Node APIs"
      navItems={STUDENT_SECTION_NAV}
      activeHref={activeHref}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <section className="portal-intro">
        <p>
          Student P0 and P1 workflows now run through React routes: dashboard, profile, learning, assessments, payments,
          notifications, and support.
        </p>
      </section>
      <StudentSectionRenderer sectionId={sectionId} api={api} session={session} />
    </PortalScaffold>
  );
}
