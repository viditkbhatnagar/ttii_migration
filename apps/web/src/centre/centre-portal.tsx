import type { AuthSession } from '@ttii/frontend-core';
import { InlineNotice, MetricCard, PortalScaffold, ShellCard } from '@ttii/ui';
import { useEffect, useMemo, useState } from 'react';

import type { CentrePortalApi } from './centre-portal-api.js';

type CentreSectionId =
  | 'dashboard'
  | 'applications'
  | 'students'
  | 'courses'
  | 'cohorts'
  | 'live'
  | 'resources'
  | 'wallet'
  | 'support';

interface CentreSectionNavItem {
  id: CentreSectionId;
  label: string;
  href: string;
  subtitle: string;
}

const CENTRE_SECTION_NAV: readonly CentreSectionNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/centre/dashboard',
    subtitle: 'Centre KPIs',
  },
  {
    id: 'applications',
    label: 'Applications',
    href: '/centre/applications',
    subtitle: 'Lead pipeline',
  },
  {
    id: 'students',
    label: 'Students',
    href: '/centre/students',
    subtitle: 'Learner list',
  },
  {
    id: 'courses',
    label: 'Courses',
    href: '/centre/courses',
    subtitle: 'Assigned plans',
  },
  {
    id: 'cohorts',
    label: 'Cohorts',
    href: '/centre/cohorts',
    subtitle: 'Cohort operations',
  },
  {
    id: 'live',
    label: 'Live',
    href: '/centre/live',
    subtitle: 'Live class ops',
  },
  {
    id: 'resources',
    label: 'Resources',
    href: '/centre/resources',
    subtitle: 'Folders and files',
  },
  {
    id: 'wallet',
    label: 'Wallet',
    href: '/centre/wallet',
    subtitle: 'Funds and requests',
  },
  {
    id: 'support',
    label: 'Support',
    href: '/centre/support',
    subtitle: 'Support + training',
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

  if (typeof value === 'bigint') {
    return Number(value);
  }

  return 0;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'on';
}

function toRecords(value: unknown): Record<string, unknown>[] {
  return asArray(value)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null);
}

function messageFromError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected request failure.';
}

function responseSuccess(payload: Record<string, unknown>): boolean {
  if (asBoolean(payload.success) || asBoolean(payload.status)) {
    return true;
  }

  const message = asString(payload.message).toLowerCase();
  return message.includes('success');
}

function dateOnly(offset = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function resolveCentreSection(pathname: string): CentreSectionId | null {
  const normalized = pathname.trim();
  if (normalized === '/centre' || normalized === '/centre/') {
    return 'dashboard';
  }

  const match = CENTRE_SECTION_NAV.find((item) => normalized === item.href);
  return match?.id ?? null;
}

export function normalizeCentrePath(pathname: string): string {
  if (pathname.trim() === '/centre' || pathname.trim() === '/centre/') {
    return '/centre/dashboard';
  }

  const section = resolveCentreSection(pathname);
  if (!section) {
    return pathname;
  }

  const route = CENTRE_SECTION_NAV.find((entry) => entry.id === section);
  return route?.href ?? pathname;
}

interface CentrePortalProps {
  pathname: string;
  session: AuthSession;
  api: CentrePortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

interface ActionState {
  pending: boolean;
  message: string;
  error: string | null;
}

function useActionState(): [ActionState, (value: ActionState) => void] {
  const [state, setState] = useState<ActionState>({
    pending: false,
    message: '',
    error: null,
  });

  return [state, setState];
}

function CentreDashboardSection({ api, session }: { api: CentrePortalApi; session: AuthSession }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<{
    students: number;
    walletBalance: number;
    activeCohorts: number;
    pendingApplications: number;
    recentStudents: Record<string, unknown>[];
    centreName: string;
    centreCode: string;
  } | null>(null);

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.loadDashboard(session.token);
      setSnapshot(data);
    } catch (loadError: unknown) {
      setError(messageFromError(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  if (loading) {
    return <InlineNotice tone="info" title="Dashboard loading">Fetching centre dashboard metrics.</InlineNotice>;
  }

  if (error) {
    return (
      <InlineNotice tone="danger" title="Dashboard failed">
        <p>{error}</p>
        <button type="button" className="rounded-lg px-2.5 py-1.5 bg-teal-700 text-white font-semibold cursor-pointer transition-transform hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65" onClick={() => void load()}>
          Retry
        </button>
      </InlineNotice>
    );
  }

  if (!snapshot) {
    return <InlineNotice tone="warning" title="No dashboard data">No centre dashboard data available.</InlineNotice>;
  }

  return (
    <section className="grid gap-4" aria-label="Centre dashboard">
      <header className="grid gap-1.5">
        <h2>Dashboard</h2>
        <p className="text-teal-800 leading-snug">Centre summary for student operations, applications, cohorts, and wallet visibility.</p>
      </header>

      <section className="grid grid-cols-3 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <MetricCard label="Students" value={String(snapshot.students)} detail={snapshot.centreName || 'Centre'} tone="info" />
        <MetricCard label="Wallet" value={`₹${snapshot.walletBalance.toFixed(0)}`} detail={`Centre ${snapshot.centreCode || 'N/A'}`} tone="success" />
        <MetricCard label="Cohorts" value={String(snapshot.activeCohorts)} detail="Active centre cohorts" tone="neutral" />
        <MetricCard label="Applications" value={String(snapshot.pendingApplications)} detail="Pending conversion" tone="warning" />
      </section>

      <ShellCard title="Recent students" subtitle="Last three student enrollments linked to this centre.">
        <ul className="list-none m-0 p-0 grid gap-2">
          {snapshot.recentStudents.map((student) => (
            <li className="border border-teal-200 rounded-lg px-3 py-2.5 bg-white/90 grid gap-1" key={String(student.id ?? student.student_id)}>
              <strong className="text-teal-950 text-[0.95rem]">{asString(student.student_name) || 'Unnamed student'}</strong>
              <span className="text-sm text-teal-700">Course: {asString(student.course_name) || 'N/A'}</span>
              <span className="text-sm text-teal-700">Enrolled: {asString(student.enrollment_date) || 'N/A'}</span>
            </li>
          ))}
        </ul>
      </ShellCard>

      <div className="flex flex-wrap gap-2.5 items-end">
        <button type="button" className="rounded-lg px-2.5 py-1.5 bg-teal-700 text-white font-semibold cursor-pointer transition-transform hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65" onClick={() => void load()}>
          Refresh dashboard
        </button>
      </div>
    </section>
  );
}

function CentreApplicationsSection({ api, session }: { api: CentrePortalApi; session: AuthSession }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [pipelineUsers, setPipelineUsers] = useState<Record<string, unknown>[]>([]);
  const [actionState, setActionState] = useActionState();

  const [name, setName] = useState('Phase13 Applicant');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('9010010001');
  const [email, setEmail] = useState('phase13.applicant@example.test');
  const [status, setStatus] = useState('pending');

  const courseId = useMemo(() => {
    if (courses.length === 0) {
      return 0;
    }

    const first = courses[0] ?? {};
    return asNumber(first.id) || asNumber(first.course_id);
  }, [courses]);

  const pipelineUserId = useMemo(() => {
    if (pipelineUsers.length === 0) {
      return 0;
    }

    return asNumber(pipelineUsers[0]?.id);
  }, [pipelineUsers]);

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const [applicationSnapshot, coursesSnapshot, pipelineUsersSnapshot] = await Promise.all([
        api.loadApplications(session.token),
        api.loadCourses(session.token),
        api.loadPipelineUsers(session.token, 1),
      ]);

      setItems(applicationSnapshot.items);
      setPendingCount(applicationSnapshot.pendingCount);
      setRejectedCount(applicationSnapshot.rejectedCount);
      setCourses(coursesSnapshot);
      setPipelineUsers(pipelineUsersSnapshot);
    } catch (loadError: unknown) {
      setError(messageFromError(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  const addApplication = async (): Promise<void> => {
    if (name.trim() === '' || phone.trim() === '' || email.trim() === '' || courseId <= 0) {
      setActionState({
        pending: false,
        message: '',
        error: 'Name, phone, email, and a mapped course are required.',
      });
      return;
    }

    setActionState({ pending: true, message: '', error: null });
    try {
      const response = await api.addApplication(session.token, {
        name,
        countryCode,
        phone,
        email,
        courseId,
        pipeline: pipelineUserId > 0 ? '1' : '0',
        pipelineUser: pipelineUserId,
        status,
      });

      if (!responseSuccess(response)) {
        setActionState({
          pending: false,
          message: '',
          error: asString(response.message) || 'Unable to add application.',
        });
        return;
      }

      await load();
      setActionState({ pending: false, message: 'Application added successfully.', error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: messageFromError(actionError) });
    }
  };

  const convertFirst = async (): Promise<void> => {
    const first = items[0] ?? {};
    const applicationId = asNumber(first.id);
    if (applicationId <= 0) {
      setActionState({ pending: false, message: '', error: 'No application available to convert.' });
      return;
    }

    setActionState({ pending: true, message: '', error: null });

    try {
      const response = await api.convertApplication(session.token, applicationId);
      if (!responseSuccess(response)) {
        setActionState({
          pending: false,
          message: '',
          error: asString(response.message) || 'Unable to convert application.',
        });
        return;
      }

      await load();
      setActionState({ pending: false, message: 'Application converted successfully.', error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: messageFromError(actionError) });
    }
  };

  if (loading) {
    return <InlineNotice tone="info" title="Applications loading">Fetching centre lead applications and mappings.</InlineNotice>;
  }

  if (error) {
    return (
      <InlineNotice tone="danger" title="Applications failed">
        <p>{error}</p>
        <button type="button" className="rounded-lg px-2.5 py-1.5 bg-teal-700 text-white font-semibold cursor-pointer transition-transform hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65" onClick={() => void load()}>
          Retry
        </button>
      </InlineNotice>
    );
  }

  return (
    <section className="grid gap-4" aria-label="Centre applications">
      <header className="grid gap-1.5">
        <h2>Applications</h2>
        <p className="text-teal-800 leading-snug">Lead intake and conversion workflow parity for centre operators.</p>
      </header>

      {actionState.error ? <InlineNotice tone="danger" title="Application action failed">{actionState.error}</InlineNotice> : null}
      {actionState.message ? <InlineNotice tone="success" title="Application action complete">{actionState.message}</InlineNotice> : null}

      <section className="grid grid-cols-3 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <MetricCard label="Total leads" value={String(items.length)} detail="Centre pipeline records" tone="neutral" />
        <MetricCard label="Pending" value={String(pendingCount)} detail="Awaiting conversion" tone="warning" />
        <MetricCard label="Rejected" value={String(rejectedCount)} detail="Needs follow-up" tone="info" />
        <MetricCard label="Pipeline users" value={String(pipelineUsers.length)} detail="Role-based mapping users" tone="success" />
      </section>

      <section className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <ShellCard title="Add application" subtitle="Legacy-compatible centre application create route.">
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void addApplication();
            }}
          >
            <label className="grid gap-1.5 font-semibold text-teal-900">
              Name
              <input className="border border-teal-300 rounded-lg px-2.5 py-2 bg-white" type="text" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="grid gap-1.5 font-semibold text-teal-900">
              Country code
              <input className="border border-teal-300 rounded-lg px-2.5 py-2 bg-white" type="text" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} />
            </label>
            <label className="grid gap-1.5 font-semibold text-teal-900">
              Phone
              <input className="border border-teal-300 rounded-lg px-2.5 py-2 bg-white" type="text" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </label>
            <label className="grid gap-1.5 font-semibold text-teal-900">
              Email
              <input className="border border-teal-300 rounded-lg px-2.5 py-2 bg-white" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="grid gap-1.5 font-semibold text-teal-900">
              Status
              <select className="border border-teal-300 rounded-lg px-2.5 py-2 bg-white" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="pending">pending</option>
                <option value="rejected">rejected</option>
              </select>
            </label>
            <button type="submit" className="rounded-lg px-2.5 py-1.5 bg-teal-700 text-white font-semibold cursor-pointer transition-transform hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65" disabled={actionState.pending}>
              {actionState.pending ? 'Saving...' : 'Add application'}
            </button>
          </form>
        </ShellCard>

        <ShellCard title="Pipeline list" subtitle="Latest leads under this centre." theme="dark">
          <ul className="list-none m-0 p-0 grid gap-2">
            {items.slice(0, 8).map((application) => (
              <li className="border border-teal-200 rounded-lg px-3 py-2.5 bg-white/90 grid gap-1" key={String(application.id)}>
                <strong className="text-teal-950 text-[0.95rem]">{asString(application.name) || 'Unnamed lead'}</strong>
                <span className="text-sm text-teal-700">Course: {asString(application.course_title) || 'N/A'}</span>
                <span className="text-sm text-teal-700">Status: {asString(application.status) || 'pending'}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2.5 items-end">
            <button type="button" className="rounded-lg px-2.5 py-1.5 bg-teal-700 text-white font-semibold cursor-pointer transition-transform hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65" onClick={() => void convertFirst()} disabled={actionState.pending}>
              {actionState.pending ? 'Converting...' : 'Convert first application'}
            </button>
            <button type="button" className="rounded-lg px-2.5 py-1.5 bg-teal-50 text-teal-900 border border-teal-300 font-semibold cursor-pointer transition-transform hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65" onClick={() => void load()}>
              Reload list
            </button>
          </div>
        </ShellCard>
      </section>
    </section>
  );
}

function CentreStudentsSection({ api, session }: { api: CentrePortalApi; session: AuthSession }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<Record<string, unknown>[]>([]);

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const rows = await api.loadStudents(session.token);
      setStudents(rows);
    } catch (loadError: unknown) {
      setError(messageFromError(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  if (loading) {
    return <InlineNotice tone="info" title="Students loading">Fetching centre students list.</InlineNotice>;
  }

  if (error) {
    return (
      <InlineNotice tone="danger" title="Students failed">
        <p>{error}</p>
        <button type="button" className="rounded-lg px-2.5 py-1.5 bg-teal-700 text-white font-semibold cursor-pointer transition-transform hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65" onClick={() => void load()}>
          Retry
        </button>
      </InlineNotice>
    );
  }

  return (
    <section className="grid gap-4" aria-label="Centre students">
      <header className="grid gap-1.5">
        <h2>Students</h2>
        <p className="text-teal-800 leading-snug">Centre-scoped student management listing from migrated operations APIs.</p>
      </header>

      <MetricCard label="Students" value={String(students.length)} detail="Scoped by centre_id" tone="info" />

      <ShellCard title="Student list" subtitle="Latest student rows in this centre.">
        <ul className="list-none m-0 p-0 grid gap-2">
          {students.slice(0, 12).map((student) => (
            <li className="border border-teal-200 rounded-lg px-3 py-2.5 bg-white/90 grid gap-1" key={String(student.id)}>
              <strong className="text-teal-950 text-[0.95rem]">{asString(student.name) || asString(student.student_id) || 'Student'}</strong>
              <span className="text-sm text-teal-700">Course: {asString(student.course_title) || String(asNumber(student.course_id) || 'N/A')}</span>
              <span className="text-sm text-teal-700">Email: {asString(student.user_email) || asString(student.email) || 'N/A'}</span>
            </li>
          ))}
        </ul>
      </ShellCard>
    </section>
  );
}

function CentreCoursesSection({ api, session }: { api: CentrePortalApi; session: AuthSession }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const rows = await api.loadCourses(session.token);
      setCourses(rows);
    } catch (loadError: unknown) {
      setError(messageFromError(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  if (loading) {
    return <InlineNotice tone="info" title="Courses loading">Fetching assigned centre courses.</InlineNotice>;
  }

  if (error) {
    return (
      <InlineNotice tone="danger" title="Courses failed">
        <p>{error}</p>
        <button type="button" className="rounded-lg px-2.5 py-1.5 bg-teal-700 text-white font-semibold cursor-pointer transition-transform hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65" onClick={() => void load()}>
          Retry
        </button>
      </InlineNotice>
    );
  }

  return (
    <section className="grid gap-4" aria-label="Centre courses">
      <header className="grid gap-1.5">
        <h2>Courses</h2>
        <p className="text-teal-800 leading-snug">Assigned centre course plans and active date windows.</p>
      </header>

      <MetricCard label="Assigned plans" value={String(courses.length)} detail="Centre course-plan mappings" tone="success" />

      <ShellCard title="Course plan view" subtitle="Legacy course assignment grid in React.">
        <ul className="list-none m-0 p-0 grid gap-2">
          {courses.slice(0, 12).map((course) => (
            <li className="border border-teal-200 rounded-lg px-3 py-2.5 bg-white/90 grid gap-1" key={String(course.id)}>
              <strong className="text-teal-950 text-[0.95rem]">{asString(course.course_title) || asString(course.short_name) || 'Course'}</strong>
              <span className="text-sm text-teal-700">Amount: ₹{asNumber(course.assigned_amount).toFixed(2)}</span>
              <span className="text-sm text-teal-700">
                Dates: {asString(course.start_date) || 'N/A'} to {asString(course.end_date) || 'N/A'}
              </span>
            </li>
          ))}
        </ul>
      </ShellCard>
    </section>
  );
}

function CentreCohortsSection({ api, session }: { api: CentrePortalApi; session: AuthSession }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cohorts, setCohorts] = useState<Record<string, unknown>[]>([]);
  const [students, setStudents] = useState<Record<string, unknown>[]>([]);
  const [actionState, setActionState] = useActionState();
  const [title, setTitle] = useState('New Cohort');
  const [courseId, setCourseId] = useState('0');
  const [subjectId, setSubjectId] = useState('0');
  const [instructorId, setInstructorId] = useState('1');

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const [cohortRows, studentRows] = await Promise.all([api.loadCohorts(session.token), api.loadStudents(session.token)]);
      setCohorts(cohortRows);
      setStudents(studentRows);

      const firstCohort = cohortRows[0] ?? {};
      if (asNumber(firstCohort.course_id) > 0) {
        setCourseId(String(asNumber(firstCohort.course_id)));
      }
      if (asNumber(firstCohort.subject_id) > 0) {
        setSubjectId(String(asNumber(firstCohort.subject_id)));
      }
      if (asNumber(firstCohort.instructor_id) > 0) {
        setInstructorId(String(asNumber(firstCohort.instructor_id)));
      }
    } catch (loadError: unknown) {
      setError(messageFromError(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  const addCohortAndStudent = async (): Promise<void> => {
    const parsedCourseId = Number.parseInt(courseId, 10);
    const parsedSubjectId = Number.parseInt(subjectId, 10);
    const parsedInstructorId = Number.parseInt(instructorId, 10);

    if (!Number.isFinite(parsedCourseId) || !Number.isFinite(parsedSubjectId) || !Number.isFinite(parsedInstructorId)) {
      setActionState({ pending: false, message: '', error: 'Course, subject, and instructor IDs are required.' });
      return;
    }

    setActionState({ pending: true, message: '', error: null });
    try {
      const response = await api.addCohort(session.token, {
        title,
        cohortCode: '',
        courseId: parsedCourseId,
        subjectId: parsedSubjectId,
        instructorId: parsedInstructorId,
        startDate: dateOnly(0),
        endDate: dateOnly(30),
      });

      if (!responseSuccess(response)) {
        setActionState({
          pending: false,
          message: '',
          error: asString(response.message) || 'Unable to add cohort.',
        });
        return;
      }

      const responseData = asRecord(response.data) ?? {};
      const cohortId = asNumber(responseData.cohort_id);
      const firstStudentId = asNumber(students[0]?.id);

      if (cohortId > 0 && firstStudentId > 0) {
        await api.addCohortStudents(session.token, cohortId, [firstStudentId]);
      }

      await load();
      setActionState({ pending: false, message: 'Cohort workflow completed.', error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: messageFromError(actionError) });
    }
  };

  if (loading) {
    return <InlineNotice tone="info" title="Cohorts loading">Fetching centre cohorts and mapped students.</InlineNotice>;
  }

  if (error) {
    return (
      <InlineNotice tone="danger" title="Cohorts failed">
        <p>{error}</p>
        <button type="button" className="rounded-lg px-2.5 py-1.5 bg-teal-700 text-white font-semibold cursor-pointer transition-transform hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65" onClick={() => void load()}>
          Retry
        </button>
      </InlineNotice>
    );
  }

  return (
    <section className="grid gap-4" aria-label="Centre cohorts">
      <header className="grid gap-1.5">
        <h2>Cohorts</h2>
        <p className="text-teal-800 leading-snug">Cohort create and learner mapping for centre operations.</p>
      </header>

      {actionState.error ? <InlineNotice tone="danger" title="Cohort action failed">{actionState.error}</InlineNotice> : null}
      {actionState.message ? <InlineNotice tone="success" title="Cohort action complete">{actionState.message}</InlineNotice> : null}

      <section className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <ShellCard title="Add cohort" subtitle="Legacy-compatible cohort create flow.">
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void addCohortAndStudent();
            }}
          >
            <label className="grid gap-1.5 font-semibold text-teal-900">
              Title
              <input className="border border-teal-300 rounded-lg px-2.5 py-2 bg-white" type="text" value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="grid gap-1.5 font-semibold text-teal-900">
              Course ID
              <input className="border border-teal-300 rounded-lg px-2.5 py-2 bg-white" type="number" value={courseId} onChange={(event) => setCourseId(event.target.value)} />
            </label>
            <label className="grid gap-1.5 font-semibold text-teal-900">
              Subject ID
              <input className="border border-teal-300 rounded-lg px-2.5 py-2 bg-white" type="number" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} />
            </label>
            <label className="grid gap-1.5 font-semibold text-teal-900">
              Instructor ID
              <input className="border border-teal-300 rounded-lg px-2.5 py-2 bg-white" type="number" value={instructorId} onChange={(event) => setInstructorId(event.target.value)} />
            </label>
            <button type="submit" className="rounded-lg px-2.5 py-1.5 bg-teal-700 text-white font-semibold cursor-pointer transition-transform hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65" disabled={actionState.pending}>
              {actionState.pending ? 'Saving...' : 'Add cohort + learner'}
            </button>
          </form>
        </ShellCard>

        <ShellCard title="Cohort list" subtitle="Cohorts currently available in centre scope." theme="dark">
          <ul className="list-none m-0 p-0 grid gap-2">
            {cohorts.slice(0, 10).map((cohort) => (
              <li className="border border-teal-200 rounded-lg px-3 py-2.5 bg-white/90 grid gap-1" key={String(cohort.id)}>
                <strong className="text-teal-950 text-[0.95rem]">{asString(cohort.title) || asString(cohort.cohort_id) || 'Cohort'}</strong>
                <span className="text-sm text-teal-700">Course: {asString(cohort.course_name) || String(asNumber(cohort.course_id) || 'N/A')}</span>
                <span className="text-sm text-teal-700">Students: {String(asNumber(cohort.students_count))}</span>
              </li>
            ))}
          </ul>
        </ShellCard>
      </section>
    </section>
  );
}

function CentreLiveSection({ api, session }: { api: CentrePortalApi; session: AuthSession }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cohorts, setCohorts] = useState<Record<string, unknown>[]>([]);
  const [liveClasses, setLiveClasses] = useState<Record<string, unknown>[]>([]);
  const [actionState, setActionState] = useActionState();
  const [cohortId, setCohortId] = useState('0');
  const [title, setTitle] = useState('New Live Session');

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [cohortRows, liveRows] = await Promise.all([api.loadCohorts(session.token), api.loadLiveClasses(session.token)]);
      setCohorts(cohortRows);
      setLiveClasses(liveRows);

      const firstCohortId = asNumber(cohortRows[0]?.id);
      if (firstCohortId > 0) {
        setCohortId(String(firstCohortId));
      }
    } catch (loadError: unknown) {
      setError(messageFromError(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  const addLiveClass = async (): Promise<void> => {
    const parsedCohortId = Number.parseInt(cohortId, 10);
    if (!Number.isFinite(parsedCohortId) || parsedCohortId <= 0) {
      setActionState({ pending: false, message: '', error: 'Cohort ID is required for live class creation.' });
      return;
    }

    setActionState({ pending: true, message: '', error: null });
    try {
      const response = await api.addLiveClass(session.token, {
        cohortId: parsedCohortId,
        zoomId: 'zoom-phase13-centre',
        password: 'live-pass-phase13',
        entries: [
          {
            sessionId: `phase13-${Date.now()}`,
            title,
            date: dateOnly(1),
            fromTime: '09:00:00',
            toTime: '10:00:00',
            isRepetitive: 0,
            repeatDates: [],
          },
        ],
      });

      if (!responseSuccess(response)) {
        setActionState({
          pending: false,
          message: '',
          error: asString(response.message) || 'Unable to add live class.',
        });
        return;
      }

      await load();
      setActionState({ pending: false, message: 'Live class added successfully.', error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: messageFromError(actionError) });
    }
  };

  if (loading) {
    return <InlineNotice tone="info" title="Live classes loading">Fetching live class operations data.</InlineNotice>;
  }

  if (error) {
    return (
      <InlineNotice tone="danger" title="Live class failed">
        <p>{error}</p>
        <button type="button" className="rounded-lg px-2.5 py-1.5 bg-teal-700 text-white font-semibold cursor-pointer transition-transform hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65" onClick={() => void load()}>
          Retry
        </button>
      </InlineNotice>
    );
  }

  return (
    <section className="grid gap-4" aria-label="Centre live classes">
      <header className="grid gap-1.5">
        <h2>Live classes</h2>
        <p className="text-teal-800 leading-snug">Schedule and monitor centre live class operations.</p>
      </header>

      {actionState.error ? <InlineNotice tone="danger" title="Live class action failed">{actionState.error}</InlineNotice> : null}
      {actionState.message ? <InlineNotice tone="success" title="Live class action complete">{actionState.message}</InlineNotice> : null}

      <section className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <ShellCard title="Add live class" subtitle="Creates a single live class session for selected cohort.">
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void addLiveClass();
            }}
          >
            <label className="grid gap-1.5 font-semibold text-teal-900">
              Cohort ID
              <input className="border border-teal-300 rounded-lg px-2.5 py-2 bg-white" type="number" value={cohortId} onChange={(event) => setCohortId(event.target.value)} />
            </label>
            <label className="grid gap-1.5 font-semibold text-teal-900">
              Session title
              <input className="border border-teal-300 rounded-lg px-2.5 py-2 bg-white" type="text" value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <button type="submit" className="rounded-lg px-2.5 py-1.5 bg-teal-700 text-white font-semibold cursor-pointer transition-transform hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65" disabled={actionState.pending}>
              {actionState.pending ? 'Saving...' : 'Add live class'}
            </button>
          </form>
          <p>Available cohorts: {cohorts.length}</p>
        </ShellCard>

        <ShellCard title="Live class list" subtitle="Recent live sessions for this centre." theme="dark">
          <ul className="list-none m-0 p-0 grid gap-2">
            {liveClasses.slice(0, 10).map((entry) => (
              <li className="border border-teal-200 rounded-lg px-3 py-2.5 bg-white/90 grid gap-1" key={String(entry.id)}>
                <strong className="text-teal-950 text-[0.95rem]">{asString(entry.title) || 'Live class'}</strong>
                <span className="text-sm text-teal-700">Cohort: {String(asNumber(entry.cohort_id))}</span>
                <span className="text-sm text-teal-700">Date: {asString(entry.date) || 'N/A'}</span>
              </li>
            ))}
          </ul>
        </ShellCard>
      </section>
    </section>
  );
}

function CentreResourcesSection({ api, session }: { api: CentrePortalApi; session: AuthSession }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useActionState();
  const [folderId, setFolderId] = useState(0);
  const [resourceState, setResourceState] = useState<Record<string, unknown>>({});
  const [folderName, setFolderName] = useState('Phase13 Resources');
  const [fileName, setFileName] = useState('phase13-guide.txt');

  const folders = toRecords(resourceState.folders);
  const files = toRecords(resourceState.files);

  const load = async (nextFolderId = folderId): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.loadResources(session.token, nextFolderId);
      setResourceState(data);
      setFolderId(asNumber(data.folder_id));
    } catch (loadError: unknown) {
      setError(messageFromError(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  const addFolder = async (): Promise<void> => {
    if (folderName.trim() === '') {
      setActionState({ pending: false, message: '', error: 'Folder name is required.' });
      return;
    }

    setActionState({ pending: true, message: '', error: null });
    try {
      const response = await api.addFolder(session.token, folderId, folderName);
      if (!responseSuccess(response)) {
        setActionState({
          pending: false,
          message: '',
          error: asString(response.message) || 'Unable to create folder.',
        });
        return;
      }

      await load(folderId);
      setActionState({ pending: false, message: 'Folder added successfully.', error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: messageFromError(actionError) });
    }
  };

  const addFile = async (): Promise<void> => {
    if (fileName.trim() === '') {
      setActionState({ pending: false, message: '', error: 'File name is required.' });
      return;
    }

    setActionState({ pending: true, message: '', error: null });
    try {
      const response = await api.addFile(session.token, {
        folderId,
        name: fileName,
        type: 'text/plain',
        size: 256,
        path: `uploads/resources/${fileName}`,
      });

      if (!responseSuccess(response)) {
        setActionState({
          pending: false,
          message: '',
          error: asString(response.message) || 'Unable to add file.',
        });
        return;
      }

      await load(folderId);
      setActionState({ pending: false, message: 'File added successfully.', error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: messageFromError(actionError) });
    }
  };

  if (loading) {
    return <InlineNotice tone="info" title="Resources loading">Fetching centre resources and folders.</InlineNotice>;
  }

  if (error) {
    return (
      <InlineNotice tone="danger" title="Resources failed">
        <p>{error}</p>
        <button type="button" className="rounded-lg px-2.5 py-1.5 bg-teal-700 text-white font-semibold cursor-pointer transition-transform hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65" onClick={() => void load(folderId)}>
          Retry
        </button>
      </InlineNotice>
    );
  }

  return (
    <section className="grid gap-4" aria-label="Centre resources">
      <header className="grid gap-1.5">
        <h2>Resources</h2>
        <p className="text-teal-800 leading-snug">Folder and file operations for centre resource library.</p>
      </header>

      {actionState.error ? <InlineNotice tone="danger" title="Resource action failed">{actionState.error}</InlineNotice> : null}
      {actionState.message ? <InlineNotice tone="success" title="Resource action complete">{actionState.message}</InlineNotice> : null}

      <section className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <ShellCard title="Folder operations" subtitle={`Current folder: ${folderId}`}>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void addFolder();
            }}
          >
            <label className="grid gap-1.5 font-semibold text-teal-900">
              New folder name
              <input className="border border-teal-300 rounded-lg px-2.5 py-2 bg-white" type="text" value={folderName} onChange={(event) => setFolderName(event.target.value)} />
            </label>
            <button type="submit" className="rounded-lg px-2.5 py-1.5 bg-teal-700 text-white font-semibold cursor-pointer transition-transform hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65" disabled={actionState.pending}>
              {actionState.pending ? 'Saving...' : 'Add folder'}
            </button>
          </form>

          <ul className="list-none m-0 p-0 grid gap-2">
            {folders.map((folder) => (
              <li className="border border-teal-200 rounded-lg px-3 py-2.5 bg-white/90 grid gap-1" key={String(folder.id)}>
                <strong className="text-teal-950 text-[0.95rem]">{asString(folder.name) || `Folder ${String(folder.id)}`}</strong>
                <button type="button" className="rounded-lg px-2.5 py-1.5 bg-teal-700 text-white font-semibold cursor-pointer transition-transform hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65" onClick={() => void load(asNumber(folder.id))}>
                  Open
                </button>
              </li>
            ))}
          </ul>
        </ShellCard>

        <ShellCard title="File operations" subtitle="Attach files under current folder." theme="dark">
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void addFile();
            }}
          >
            <label className="grid gap-1.5 font-semibold text-teal-900">
              File name
              <input className="border border-teal-300 rounded-lg px-2.5 py-2 bg-white" type="text" value={fileName} onChange={(event) => setFileName(event.target.value)} />
            </label>
            <button type="submit" className="rounded-lg px-2.5 py-1.5 bg-teal-700 text-white font-semibold cursor-pointer transition-transform hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65" disabled={actionState.pending}>
              {actionState.pending ? 'Saving...' : 'Add file'}
            </button>
          </form>

          <ul className="list-none m-0 p-0 grid gap-2">
            {files.map((file) => (
              <li className="border border-teal-200 rounded-lg px-3 py-2.5 bg-white/90 grid gap-1" key={String(file.id)}>
                <strong className="text-teal-950 text-[0.95rem]">{asString(file.name) || `File ${String(file.id)}`}</strong>
                <span className="text-sm text-teal-700">Type: {asString(file.type) || 'N/A'}</span>
                <span className="text-sm text-teal-700">Path: {asString(file.path) || 'N/A'}</span>
              </li>
            ))}
          </ul>
        </ShellCard>
      </section>
    </section>
  );
}

function CentreWalletSection({ api, session }: { api: CentrePortalApi; session: AuthSession }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useActionState();
  const [wallet, setWallet] = useState<{
    walletBalance: number;
    credits: Record<string, unknown>[];
    debits: Record<string, unknown>[];
    fundRequests: Record<string, unknown>[];
    totalCredits: number;
    totalDebits: number;
  } | null>(null);

  const [amount, setAmount] = useState('2500');
  const [transactionNo, setTransactionNo] = useState('');
  const [description, setDescription] = useState('');

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.loadWallet(session.token);
      setWallet(data);
    } catch (loadError: unknown) {
      setError(messageFromError(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  const submitFundRequest = async (): Promise<void> => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setActionState({ pending: false, message: '', error: 'Enter a valid request amount.' });
      return;
    }

    setActionState({ pending: true, message: '', error: null });
    try {
      const response = await api.addFundRequest(session.token, {
        amount: numericAmount,
        transactionNo,
        description,
      });

      if (!responseSuccess(response)) {
        setActionState({
          pending: false,
          message: '',
          error: asString(response.message) || 'Fund request submission failed.',
        });
        return;
      }

      await load();
      setActionState({ pending: false, message: 'Fund request submitted.', error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: messageFromError(actionError) });
    }
  };

  if (loading) {
    return <InlineNotice tone="info" title="Wallet loading">Fetching wallet balance and request history.</InlineNotice>;
  }

  if (error) {
    return (
      <InlineNotice tone="danger" title="Wallet failed">
        <p>{error}</p>
        <button type="button" className="rounded-lg px-2.5 py-1.5 bg-teal-700 text-white font-semibold cursor-pointer transition-transform hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65" onClick={() => void load()}>
          Retry
        </button>
      </InlineNotice>
    );
  }

  if (!wallet) {
    return <InlineNotice tone="warning" title="No wallet data">Wallet details are unavailable.</InlineNotice>;
  }

  return (
    <section className="grid gap-4" aria-label="Centre wallet">
      <header className="grid gap-1.5">
        <h2>Wallet</h2>
        <p className="text-teal-800 leading-snug">Wallet balance, transactions, and fund request submission.</p>
      </header>

      {actionState.error ? <InlineNotice tone="danger" title="Wallet action failed">{actionState.error}</InlineNotice> : null}
      {actionState.message ? <InlineNotice tone="success" title="Wallet action complete">{actionState.message}</InlineNotice> : null}

      <section className="grid grid-cols-3 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <MetricCard label="Balance" value={`₹${wallet.walletBalance.toFixed(2)}`} detail="Current centre wallet" tone="info" />
        <MetricCard label="Credits" value={`₹${wallet.totalCredits.toFixed(2)}`} detail={`${wallet.credits.length} entries`} tone="success" />
        <MetricCard label="Debits" value={`₹${wallet.totalDebits.toFixed(2)}`} detail={`${wallet.debits.length} entries`} tone="warning" />
        <MetricCard label="Fund requests" value={String(wallet.fundRequests.length)} detail="Pending + processed" tone="neutral" />
      </section>

      <section className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <ShellCard title="Request fund" subtitle="Submit fund recharge request to admin flow.">
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submitFundRequest();
            }}
          >
            <label className="grid gap-1.5 font-semibold text-teal-900">
              Amount
              <input className="border border-teal-300 rounded-lg px-2.5 py-2 bg-white" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </label>
            <label className="grid gap-1.5 font-semibold text-teal-900">
              Transaction reference
              <input className="border border-teal-300 rounded-lg px-2.5 py-2 bg-white" type="text" value={transactionNo} onChange={(event) => setTransactionNo(event.target.value)} />
            </label>
            <label className="grid gap-1.5 font-semibold text-teal-900">
              Description
              <input className="border border-teal-300 rounded-lg px-2.5 py-2 bg-white" type="text" value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
            <button type="submit" className="rounded-lg px-2.5 py-1.5 bg-teal-700 text-white font-semibold cursor-pointer transition-transform hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65" disabled={actionState.pending}>
              {actionState.pending ? 'Submitting...' : 'Submit request'}
            </button>
          </form>
        </ShellCard>

        <ShellCard title="Fund requests" subtitle="Latest wallet requisitions." theme="dark">
          <ul className="list-none m-0 p-0 grid gap-2">
            {wallet.fundRequests.slice(0, 10).map((entry) => (
              <li className="border border-teal-200 rounded-lg px-3 py-2.5 bg-white/90 grid gap-1" key={String(entry.id)}>
                <strong>₹{asNumber(entry.amount).toFixed(2)}</strong>
                <span className="text-sm text-teal-700">Status: {asString(entry.status) || 'pending'}</span>
                <span className="text-sm text-teal-700">Description: {asString(entry.description) || 'N/A'}</span>
              </li>
            ))}
          </ul>
        </ShellCard>
      </section>
    </section>
  );
}

function CentreSupportSection({ api, session }: { api: CentrePortalApi; session: AuthSession }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useActionState();
  const [messages, setMessages] = useState<Record<string, unknown>[]>([]);
  const [trainingVideos, setTrainingVideos] = useState<Record<string, unknown>[]>([]);
  const [message, setMessage] = useState('');

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [messageRows, trainingRows] = await Promise.all([
        api.loadSupportMessages(session.token),
        api.loadTrainingVideos(session.token),
      ]);

      setMessages(messageRows);
      setTrainingVideos(trainingRows);
    } catch (loadError: unknown) {
      setError(messageFromError(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  const sendMessage = async (): Promise<void> => {
    if (message.trim() === '') {
      setActionState({ pending: false, message: '', error: 'Support message cannot be empty.' });
      return;
    }

    setActionState({ pending: true, message: '', error: null });
    try {
      const response = await api.submitSupportMessage(session.token, message);

      if (!responseSuccess(response)) {
        setActionState({
          pending: false,
          message: '',
          error: asString(response.message) || 'Unable to submit support message.',
        });
        return;
      }

      await load();
      setActionState({ pending: false, message: 'Support message sent.', error: null });
      setMessage('');
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: messageFromError(actionError) });
    }
  };

  if (loading) {
    return <InlineNotice tone="info" title="Support loading">Fetching support thread and training videos.</InlineNotice>;
  }

  if (error) {
    return (
      <InlineNotice tone="danger" title="Support failed">
        <p>{error}</p>
        <button type="button" className="rounded-lg px-2.5 py-1.5 bg-teal-700 text-white font-semibold cursor-pointer transition-transform hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65" onClick={() => void load()}>
          Retry
        </button>
      </InlineNotice>
    );
  }

  return (
    <section className="grid gap-4" aria-label="Centre support and training">
      <header className="grid gap-1.5">
        <h2>Support and training</h2>
        <p className="text-teal-800 leading-snug">Centre support chat and training-video parity flows.</p>
      </header>

      {actionState.error ? <InlineNotice tone="danger" title="Support action failed">{actionState.error}</InlineNotice> : null}
      {actionState.message ? <InlineNotice tone="success" title="Support action complete">{actionState.message}</InlineNotice> : null}

      <section className="grid grid-cols-3 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <MetricCard label="Messages" value={String(messages.length)} detail="Centre-admin support thread" tone="info" />
        <MetricCard label="Training videos" value={String(trainingVideos.length)} detail="Operator enablement library" tone="success" />
      </section>

      <section className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <ShellCard title="Support chat" subtitle="Send message to support thread.">
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            <label className="grid gap-1.5 font-semibold text-teal-900">
              Message
              <input className="border border-teal-300 rounded-lg px-2.5 py-2 bg-white" type="text" value={message} onChange={(event) => setMessage(event.target.value)} />
            </label>
            <button type="submit" className="rounded-lg px-2.5 py-1.5 bg-teal-700 text-white font-semibold cursor-pointer transition-transform hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65" disabled={actionState.pending}>
              {actionState.pending ? 'Sending...' : 'Send message'}
            </button>
          </form>

          <ul className="list-none m-0 p-0 grid gap-2">
            {messages.slice(-8).map((entry) => (
              <li className="border border-teal-200 rounded-lg px-3 py-2.5 bg-white/90 grid gap-1" key={String(entry.id)}>
                <strong className="text-teal-950 text-[0.95rem]">{asNumber(entry.sender_id) === session.userId ? 'You' : 'Support'}</strong>
                <span className="text-sm text-teal-700">{asString(entry.message)}</span>
                <span className="text-sm text-teal-700">{asString(entry.created_at)}</span>
              </li>
            ))}
          </ul>
        </ShellCard>

        <ShellCard title="Training videos" subtitle="Latest operator training records." theme="dark">
          <ul className="list-none m-0 p-0 grid gap-2">
            {trainingVideos.slice(0, 10).map((video) => (
              <li className="border border-teal-200 rounded-lg px-3 py-2.5 bg-white/90 grid gap-1" key={String(video.id)}>
                <strong className="text-teal-950 text-[0.95rem]">{asString(video.title) || `Video ${String(video.id)}`}</strong>
                <span className="text-sm text-teal-700">Category: {asString(video.category) || 'Lectures'}</span>
                <span className="text-sm text-teal-700">URL: {asString(video.video_url) || 'N/A'}</span>
              </li>
            ))}
          </ul>
        </ShellCard>
      </section>
    </section>
  );
}

function CentreSectionRouter({
  section,
  api,
  session,
}: {
  section: CentreSectionId;
  api: CentrePortalApi;
  session: AuthSession;
}) {
  switch (section) {
    case 'dashboard':
      return <CentreDashboardSection api={api} session={session} />;
    case 'applications':
      return <CentreApplicationsSection api={api} session={session} />;
    case 'students':
      return <CentreStudentsSection api={api} session={session} />;
    case 'courses':
      return <CentreCoursesSection api={api} session={session} />;
    case 'cohorts':
      return <CentreCohortsSection api={api} session={session} />;
    case 'live':
      return <CentreLiveSection api={api} session={session} />;
    case 'resources':
      return <CentreResourcesSection api={api} session={session} />;
    case 'wallet':
      return <CentreWalletSection api={api} session={session} />;
    case 'support':
      return <CentreSupportSection api={api} session={session} />;
    default:
      return (
        <InlineNotice tone="warning" title="Section unavailable">
          Requested centre section is not available.
        </InlineNotice>
      );
  }
}

export function CentrePortal({ pathname, session, api, onNavigate, onLogout }: CentrePortalProps) {
  const section = resolveCentreSection(pathname);

  if (!section) {
    return (
      <InlineNotice tone="warning" title="Unknown centre route">
        No centre section mapped for path: {pathname}
      </InlineNotice>
    );
  }

  return (
    <PortalScaffold
      roleLabel="Centre App"
      title="Centre operations portal"
      subtitle="Manage applications, cohorts, live classes, and resources"
      navItems={CENTRE_SECTION_NAV.map((entry) => ({
        id: entry.id,
        label: entry.label,
        href: entry.href,
      }))}
      activeHref={pathname}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <section className="border-l-4 border-teal-600 px-3.5 py-2.5 bg-cyan-50/80 rounded-r-xl leading-relaxed text-teal-900">
        <p>
          {CENTRE_SECTION_NAV.find((entry) => entry.id === section)?.subtitle || 'Centre portal'}
          {' '}section running on migrated Node operations endpoints.
        </p>
      </section>
      <CentreSectionRouter section={section} api={api} session={session} />
    </PortalScaffold>
  );
}
