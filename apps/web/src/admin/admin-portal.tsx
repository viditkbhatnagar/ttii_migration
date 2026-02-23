import type { AuthSession } from '@ttii/frontend-core';
import { InlineNotice, MetricCard, PortalScaffold, ShellCard } from '@ttii/ui';
import { useEffect, useMemo, useState } from 'react';

import { AdminPortalApi, type AddAdminCentreInput } from './admin-portal-api.js';

type AdminSectionId = 'dashboard' | 'users' | 'content' | 'assessments' | 'reports' | 'settings';

interface AdminSectionNavItem {
  id: AdminSectionId;
  label: string;
  href: string;
  subtitle: string;
}

const ADMIN_SECTION_NAV: readonly AdminSectionNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/admin/dashboard',
    subtitle: 'Admin KPIs and latest activity',
  },
  {
    id: 'users',
    label: 'Users',
    href: '/admin/users',
    subtitle: 'Applications, students, centres',
  },
  {
    id: 'content',
    label: 'Content',
    href: '/admin/content',
    subtitle: 'Catalog hierarchy and resources',
  },
  {
    id: 'assessments',
    label: 'Assessments',
    href: '/admin/assessments',
    subtitle: 'Exam and assignment operations',
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/admin/reports',
    subtitle: 'Summary, live report, exports',
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/admin/settings',
    subtitle: 'System, website, app version',
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
  return AdminPortalApi.asNumber(value);
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

function firstValueByKey(rows: Record<string, unknown>[], key: string): string {
  const found = rows.find((entry) => asString(entry.key) === key);
  return asString(found?.value);
}

export function resolveAdminSection(pathname: string): AdminSectionId | null {
  const normalized = pathname.trim();
  if (normalized === '/admin' || normalized === '/admin/') {
    return 'dashboard';
  }

  const match = ADMIN_SECTION_NAV.find((entry) => normalized === entry.href);
  return match?.id ?? null;
}

export function normalizeAdminPath(pathname: string): string {
  if (pathname.trim() === '/admin' || pathname.trim() === '/admin/') {
    return '/admin/dashboard';
  }

  const section = resolveAdminSection(pathname);
  if (!section) {
    return pathname;
  }

  const route = ADMIN_SECTION_NAV.find((entry) => entry.id === section);
  return route?.href ?? pathname;
}

interface AdminPortalProps {
  pathname: string;
  session: AuthSession;
  api: AdminPortalApi;
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

function AdminDashboardSection({ api, session }: { api: AdminPortalApi; session: AuthSession }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<{
    windowLabel: string;
    applicationsTotal: number;
    pendingApplications: number;
    rejectedApplications: number;
    studentsTotal: number;
    centresTotal: number;
    cohortsTotal: number;
    liveClassesTotal: number;
    recentApplications: Record<string, unknown>[];
    latestCentres: Record<string, unknown>[];
    latestLiveClasses: Record<string, unknown>[];
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
    return <InlineNotice tone="info" title="Dashboard loading">Fetching admin operation metrics and report snapshots.</InlineNotice>;
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

  if (!snapshot) {
    return <InlineNotice tone="warning" title="No dashboard data">No admin dashboard data available.</InlineNotice>;
  }

  return (
    <section className="student-section" aria-label="Admin dashboard">
      <header className="student-section__header">
        <h2>Dashboard</h2>
        <p>Operational dashboard parity with report aggregates and recent admin activity.</p>
      </header>

      <section className="metrics-grid" aria-label="Admin dashboard metrics">
        <MetricCard label="Applications" value={String(snapshot.applicationsTotal)} detail={`${snapshot.pendingApplications} pending`} tone="info" />
        <MetricCard label="Rejected" value={String(snapshot.rejectedApplications)} detail={`Window: ${snapshot.windowLabel}`} tone="warning" />
        <MetricCard label="Students" value={String(snapshot.studentsTotal)} detail="Active learner records" tone="success" />
        <MetricCard label="Centres" value={String(snapshot.centresTotal)} detail="Managed centre network" tone="neutral" />
        <MetricCard label="Cohorts" value={String(snapshot.cohortsTotal)} detail="Current operational cohorts" tone="info" />
        <MetricCard label="Live classes" value={String(snapshot.liveClassesTotal)} detail="Scheduling and attendance scope" tone="success" />
      </section>

      <section className="shell-cards-grid">
        <ShellCard title="Recent applications" subtitle="Latest application queue from admin pipeline.">
          <ul className="student-list">
            {snapshot.recentApplications.map((entry) => (
              <li key={String(entry.id)}>
                <strong>{asString(entry.name) || `Application ${String(entry.id)}`}</strong>
                <span>Status: {asString(entry.status) || 'pending'}</span>
                <span>Course: {asString(entry.course_title) || 'N/A'}</span>
              </li>
            ))}
          </ul>
        </ShellCard>

        <ShellCard title="Latest centres and live sessions" subtitle="Newly listed centres and scheduled sessions." theme="dark">
          <ul className="student-list">
            {snapshot.latestCentres.map((entry) => (
              <li key={`centre-${String(entry.id)}`}>
                <strong>{asString(entry.centre_name) || `Centre ${String(entry.id)}`}</strong>
                <span>Students: {String(asNumber(entry.students_count))}</span>
              </li>
            ))}
            {snapshot.latestLiveClasses.map((entry) => (
              <li key={`live-${String(entry.id)}`}>
                <strong>{asString(entry.title) || `Live ${String(entry.id)}`}</strong>
                <span>Cohort: {asString(entry.cohort_title) || 'N/A'}</span>
              </li>
            ))}
          </ul>
        </ShellCard>
      </section>

      <div className="student-actions">
        <button type="button" className="action-button action-button--small" onClick={() => void load()}>
          Refresh dashboard
        </button>
      </div>
    </section>
  );
}

function AdminUsersSection({ api, session }: { api: AdminPortalApi; session: AuthSession }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useActionState();

  const [applications, setApplications] = useState<Record<string, unknown>[]>([]);
  const [students, setStudents] = useState<Record<string, unknown>[]>([]);
  const [centres, setCentres] = useState<Record<string, unknown>[]>([]);
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [pipelineUsers, setPipelineUsers] = useState<Record<string, unknown>[]>([]);

  const [centreName, setCentreName] = useState('New Centre');
  const [contactPerson, setContactPerson] = useState('Centre Lead');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('9001410001');
  const [email, setEmail] = useState('centre@example.test');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [registrationDate, setRegistrationDate] = useState(dateOnly(-1));
  const [expiryDate, setExpiryDate] = useState(dateOnly(365));

  const [planCentreId, setPlanCentreId] = useState(0);
  const [planCourseId, setPlanCourseId] = useState(0);
  const [assignedAmount, setAssignedAmount] = useState('2500');
  const [planStartDate, setPlanStartDate] = useState(dateOnly(0));
  const [planEndDate, setPlanEndDate] = useState(dateOnly(60));

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const [applicationsSnapshot, studentsSnapshot, centresSnapshot, coursesSnapshot, pipelineUsersSnapshot] = await Promise.all([
        api.loadApplications(session.token),
        api.loadStudents(session.token),
        api.loadCentres(session.token),
        api.loadCourses(session.token),
        api.loadPipelineUsers(session.token, 1),
      ]);

      setApplications(applicationsSnapshot.items);
      setStudents(studentsSnapshot);
      setCentres(centresSnapshot);
      setCourses(coursesSnapshot);
      setPipelineUsers(pipelineUsersSnapshot);

      if (planCentreId <= 0 && centresSnapshot.length > 0) {
        setPlanCentreId(asNumber(centresSnapshot[0]?.id));
      }

      if (planCourseId <= 0 && coursesSnapshot.length > 0) {
        setPlanCourseId(asNumber(coursesSnapshot[0]?.id));
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

  const addCentre = async (): Promise<void> => {
    const input: AddAdminCentreInput = {
      centreName,
      contactPerson,
      countryCode,
      phone,
      email,
      address,
      registrationDate,
      expiryDate,
      password,
    };

    if (input.centreName.trim() === '' || input.phone.trim() === '' || input.email.trim() === '') {
      setActionState({
        pending: false,
        message: '',
        error: 'Centre name, phone, and email are required.',
      });
      return;
    }

    setActionState({ pending: true, message: '', error: null });

    try {
      const response = await api.addCentre(session.token, input);
      if (!responseSuccess(response)) {
        setActionState({
          pending: false,
          message: '',
          error: asString(response.message) || 'Unable to add centre.',
        });
        return;
      }

      await load();
      setActionState({ pending: false, message: 'Centre added successfully.', error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: messageFromError(actionError) });
    }
  };

  const assignPlan = async (): Promise<void> => {
    if (planCentreId <= 0 || planCourseId <= 0) {
      setActionState({
        pending: false,
        message: '',
        error: 'Select centre and course to assign plan.',
      });
      return;
    }

    setActionState({ pending: true, message: '', error: null });

    try {
      const response = await api.assignCentrePlan(session.token, {
        centreId: planCentreId,
        courseId: planCourseId,
        assignedAmount: Math.max(0, Number.parseInt(assignedAmount, 10) || 0),
        startDate: planStartDate,
        endDate: planEndDate,
      });

      if (!responseSuccess(response)) {
        setActionState({
          pending: false,
          message: '',
          error: asString(response.message) || 'Unable to assign centre plan.',
        });
        return;
      }

      await load();
      setActionState({ pending: false, message: 'Centre plan assigned successfully.', error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: messageFromError(actionError) });
    }
  };

  const convertFirstApplication = async (): Promise<void> => {
    const pending = applications.find((entry) => asString(entry.status).toLowerCase() === 'pending') ?? applications[0];
    const applicationId = asNumber(pending?.id);

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

  const rejectedCount = useMemo(
    () => applications.filter((entry) => asString(entry.status).toLowerCase() === 'rejected').length,
    [applications],
  );

  if (loading) {
    return <InlineNotice tone="info" title="Users loading">Fetching applications, students, centres, and mapped courses.</InlineNotice>;
  }

  if (error) {
    return (
      <InlineNotice tone="danger" title="User management failed">
        <p>{error}</p>
        <button type="button" className="action-button action-button--small" onClick={() => void load()}>
          Retry
        </button>
      </InlineNotice>
    );
  }

  return (
    <section className="student-section" aria-label="Admin users module">
      <header className="student-section__header">
        <h2>Users and operations</h2>
        <p>Application conversion, student visibility, centre onboarding, and plan assignment workflows.</p>
      </header>

      {actionState.error ? <InlineNotice tone="danger" title="Action failed">{actionState.error}</InlineNotice> : null}
      {actionState.message ? <InlineNotice tone="success" title="Action complete">{actionState.message}</InlineNotice> : null}

      <section className="metrics-grid">
        <MetricCard label="Applications" value={String(applications.length)} detail={`${rejectedCount} rejected`} tone="info" />
        <MetricCard label="Students" value={String(students.length)} detail="Admin student list" tone="success" />
        <MetricCard label="Centres" value={String(centres.length)} detail="Centre records" tone="neutral" />
      </section>

      <section className="shell-cards-grid">
        <ShellCard title="Management forms" subtitle="Centre add, plan assignment, and quick application conversion.">
          <form
            className="student-form"
            onSubmit={(event) => {
              event.preventDefault();
              void addCentre();
            }}
          >
            <label>
              Centre name
              <input value={centreName} onChange={(event) => setCentreName(event.target.value)} />
            </label>
            <label>
              Contact person
              <input value={contactPerson} onChange={(event) => setContactPerson(event.target.value)} />
            </label>
            <label>
              Country code
              <input value={countryCode} onChange={(event) => setCountryCode(event.target.value)} />
            </label>
            <label>
              Phone
              <input value={phone} onChange={(event) => setPhone(event.target.value)} />
            </label>
            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              Address
              <input value={address} onChange={(event) => setAddress(event.target.value)} />
            </label>
            <label>
              Registration date
              <input type="date" value={registrationDate} onChange={(event) => setRegistrationDate(event.target.value)} />
            </label>
            <label>
              Expiry date
              <input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
            </label>
            <label>
              Login password
              <input type="text" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <button type="submit" className="action-button action-button--small" disabled={actionState.pending}>
              {actionState.pending ? 'Saving...' : 'Add centre'}
            </button>
          </form>

          <form
            className="student-form"
            onSubmit={(event) => {
              event.preventDefault();
              void assignPlan();
            }}
          >
            <label>
              Centre
              <select value={String(planCentreId)} onChange={(event) => setPlanCentreId(Number.parseInt(event.target.value, 10) || 0)}>
                {centres.map((entry) => (
                  <option key={String(entry.id)} value={String(entry.id)}>
                    {asString(entry.centre_name) || `Centre ${String(entry.id)}`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Course
              <select value={String(planCourseId)} onChange={(event) => setPlanCourseId(Number.parseInt(event.target.value, 10) || 0)}>
                {courses.map((entry) => (
                  <option key={String(entry.id)} value={String(entry.id)}>
                    {asString(entry.title) || `Course ${String(entry.id)}`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Assigned amount
              <input value={assignedAmount} onChange={(event) => setAssignedAmount(event.target.value)} />
            </label>
            <label>
              Start date
              <input type="date" value={planStartDate} onChange={(event) => setPlanStartDate(event.target.value)} />
            </label>
            <label>
              End date
              <input type="date" value={planEndDate} onChange={(event) => setPlanEndDate(event.target.value)} />
            </label>
            <button type="submit" className="action-button action-button--small" disabled={actionState.pending}>
              {actionState.pending ? 'Saving...' : 'Assign plan'}
            </button>
          </form>

          <div className="student-actions">
            <button type="button" className="action-button action-button--small" onClick={() => void convertFirstApplication()} disabled={actionState.pending}>
              Convert first pending application
            </button>
            <button type="button" className="action-button action-button--small action-button--ghost" onClick={() => void load()}>
              Refresh users module
            </button>
          </div>
        </ShellCard>

        <ShellCard title="Queue and directory" subtitle="Snapshot tables for applications, students, centres, and mapped pipeline users." theme="dark">
          <ul className="student-list">
            {applications.slice(0, 8).map((entry) => (
              <li key={`app-${String(entry.id)}`}>
                <strong>{asString(entry.name) || `Application ${String(entry.id)}`}</strong>
                <span>Status: {asString(entry.status) || 'pending'}</span>
                <span>Course: {asString(entry.course_title) || 'N/A'}</span>
              </li>
            ))}
            {students.slice(0, 8).map((entry) => (
              <li key={`student-${String(entry.id)}`}>
                <strong>{asString(entry.name) || asString(entry.student_id) || `Student ${String(entry.id)}`}</strong>
                <span>Course: {asString(entry.course_title) || 'N/A'}</span>
                <span>Email: {asString(entry.user_email) || 'N/A'}</span>
              </li>
            ))}
            {pipelineUsers.slice(0, 4).map((entry) => (
              <li key={`pipeline-${String(entry.id)}`}>
                <strong>{asString(entry.name) || `Pipeline user ${String(entry.id)}`}</strong>
                <span>Role map user id: {String(asNumber(entry.id))}</span>
                <span>Email: {asString(entry.user_email) || 'N/A'}</span>
              </li>
            ))}
          </ul>
        </ShellCard>
      </section>
    </section>
  );
}

function AdminContentSection({ api, session }: { api: AdminPortalApi; session: AuthSession }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useActionState();

  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [subjects, setSubjects] = useState<Record<string, unknown>[]>([]);
  const [lessons, setLessons] = useState<Record<string, unknown>[]>([]);
  const [resources, setResources] = useState<Record<string, unknown>>({});

  const [courseId, setCourseId] = useState(0);
  const [subjectId, setSubjectId] = useState(0);
  const [folderId, setFolderId] = useState(0);
  const [centreId, setCentreId] = useState(0);

  const [folderName, setFolderName] = useState('Phase14 Content Folder');
  const [fileName, setFileName] = useState('phase14-content-notes.txt');
  const [filePath, setFilePath] = useState('uploads/resources/phase14-content-notes.txt');
  const [fileType, setFileType] = useState('text/plain');
  const [fileSize, setFileSize] = useState('420');

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const courseRows = await api.loadCourses(session.token);
      const effectiveCourseId = courseId > 0 ? courseId : AdminPortalApi.firstCourseId(courseRows);

      const subjectRows = await api.loadSubjects(session.token, effectiveCourseId);
      const effectiveSubjectId = subjectId > 0 ? subjectId : AdminPortalApi.firstSubjectId(subjectRows);

      const lessonRows = await api.loadLessons(session.token, effectiveSubjectId);
      const resourceRows = await api.loadResources(session.token, folderId, centreId);

      setCourses(courseRows);
      setSubjects(subjectRows);
      setLessons(lessonRows);
      setResources(resourceRows);

      if (courseId <= 0 && effectiveCourseId > 0) {
        setCourseId(effectiveCourseId);
      }

      if (subjectId <= 0 && effectiveSubjectId > 0) {
        setSubjectId(effectiveSubjectId);
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
  }, [session.token, folderId, centreId]);

  const reloadHierarchy = async (nextCourseId: number, nextSubjectId?: number): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const subjectRows = await api.loadSubjects(session.token, nextCourseId);
      const resolvedSubjectId = nextSubjectId && nextSubjectId > 0
        ? nextSubjectId
        : AdminPortalApi.firstSubjectId(subjectRows);
      const lessonRows = await api.loadLessons(session.token, resolvedSubjectId);

      setSubjects(subjectRows);
      setLessons(lessonRows);
      setCourseId(nextCourseId);
      setSubjectId(resolvedSubjectId);
    } catch (loadError: unknown) {
      setError(messageFromError(loadError));
    } finally {
      setLoading(false);
    }
  };

  const addFolder = async (): Promise<void> => {
    if (folderName.trim() === '') {
      setActionState({ pending: false, message: '', error: 'Folder name is required.' });
      return;
    }

    setActionState({ pending: true, message: '', error: null });

    try {
      const response = await api.addResourceFolder(
        session.token,
        folderId,
        folderName,
        centreId > 0 ? centreId : undefined,
      );

      if (!responseSuccess(response)) {
        setActionState({
          pending: false,
          message: '',
          error: asString(response.message) || 'Unable to add folder.',
        });
        return;
      }

      setFolderName('');
      await load();
      setActionState({ pending: false, message: 'Folder added successfully.', error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: messageFromError(actionError) });
    }
  };

  const addFile = async (): Promise<void> => {
    if (folderId <= 0) {
      setActionState({ pending: false, message: '', error: 'Open a target folder before adding files.' });
      return;
    }

    if (fileName.trim() === '' || filePath.trim() === '') {
      setActionState({ pending: false, message: '', error: 'File name and path are required.' });
      return;
    }

    setActionState({ pending: true, message: '', error: null });

    try {
      const response = await api.addResourceFile(session.token, {
        folderId,
        ...(centreId > 0 ? { centreId } : {}),
        name: fileName,
        type: fileType,
        size: Math.max(0, Number.parseInt(fileSize, 10) || 0),
        path: filePath,
      });

      if (!responseSuccess(response)) {
        setActionState({
          pending: false,
          message: '',
          error: asString(response.message) || 'Unable to add file.',
        });
        return;
      }

      await load();
      setActionState({ pending: false, message: 'File added successfully.', error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: messageFromError(actionError) });
    }
  };

  if (loading) {
    return <InlineNotice tone="info" title="Content loading">Fetching courses, subjects, lessons, and resources.</InlineNotice>;
  }

  if (error) {
    return (
      <InlineNotice tone="danger" title="Content module failed">
        <p>{error}</p>
        <button type="button" className="action-button action-button--small" onClick={() => void load()}>
          Retry
        </button>
      </InlineNotice>
    );
  }

  const folders = toRecords(resources.folders);
  const files = toRecords(resources.files);

  return (
    <section className="student-section" aria-label="Admin content module">
      <header className="student-section__header">
        <h2>Content and resources</h2>
        <p>Catalog hierarchy visibility with resource-library folder and file management workflows.</p>
      </header>

      {actionState.error ? <InlineNotice tone="danger" title="Content action failed">{actionState.error}</InlineNotice> : null}
      {actionState.message ? <InlineNotice tone="success" title="Content action complete">{actionState.message}</InlineNotice> : null}

      <section className="metrics-grid">
        <MetricCard label="Courses" value={String(courses.length)} detail="Catalog records" tone="info" />
        <MetricCard label="Subjects" value={String(subjects.length)} detail="Selected course hierarchy" tone="neutral" />
        <MetricCard label="Lessons" value={String(lessons.length)} detail="Selected subject lessons" tone="success" />
        <MetricCard label="Folders" value={String(folders.length)} detail={`Parent folder ${String(folderId)}`} tone="warning" />
        <MetricCard label="Files" value={String(files.length)} detail={`Centre scope ${centreId || 0}`} tone="info" />
      </section>

      <section className="shell-cards-grid">
        <ShellCard title="Catalog hierarchy" subtitle="Course to subject to lesson tree snapshots.">
          <form className="student-form">
            <label>
              Course
              <select
                value={String(courseId)}
                onChange={(event) => {
                  const nextCourseId = Number.parseInt(event.target.value, 10) || 0;
                  void reloadHierarchy(nextCourseId);
                }}
              >
                {courses.map((entry) => (
                  <option key={String(entry.id)} value={String(entry.id)}>
                    {asString(entry.title) || `Course ${String(entry.id)}`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Subject
              <select
                value={String(subjectId)}
                onChange={(event) => {
                  const nextSubjectId = Number.parseInt(event.target.value, 10) || 0;
                  setSubjectId(nextSubjectId);
                  void reloadHierarchy(courseId, nextSubjectId);
                }}
              >
                {subjects.map((entry) => (
                  <option key={String(entry.id)} value={String(entry.id)}>
                    {asString(entry.title) || `Subject ${String(entry.id)}`}
                  </option>
                ))}
              </select>
            </label>
          </form>

          <ul className="student-list">
            {subjects.slice(0, 8).map((entry) => (
              <li key={`subject-${String(entry.id)}`}>
                <strong>{asString(entry.title) || `Subject ${String(entry.id)}`}</strong>
                <span>ID: {String(asNumber(entry.id))}</span>
              </li>
            ))}
            {lessons.slice(0, 8).map((entry) => (
              <li key={`lesson-${String(entry.id)}`}>
                <strong>{asString(entry.title) || `Lesson ${String(entry.id)}`}</strong>
                <span>Subject: {String(asNumber(entry.subject_id))}</span>
              </li>
            ))}
          </ul>
        </ShellCard>

        <ShellCard title="Resource library" subtitle="Folder and file operations using admin resource endpoints." theme="dark">
          <form className="student-form">
            <label>
              Current folder id
              <input value={String(folderId)} onChange={(event) => setFolderId(Number.parseInt(event.target.value, 10) || 0)} />
            </label>
            <label>
              Centre scope (optional)
              <input value={String(centreId)} onChange={(event) => setCentreId(Number.parseInt(event.target.value, 10) || 0)} />
            </label>
          </form>

          <form
            className="student-form"
            onSubmit={(event) => {
              event.preventDefault();
              void addFolder();
            }}
          >
            <label>
              New folder name
              <input value={folderName} onChange={(event) => setFolderName(event.target.value)} />
            </label>
            <button type="submit" className="action-button action-button--small" disabled={actionState.pending}>
              {actionState.pending ? 'Saving...' : 'Add folder'}
            </button>
          </form>

          <form
            className="student-form"
            onSubmit={(event) => {
              event.preventDefault();
              void addFile();
            }}
          >
            <label>
              File name
              <input value={fileName} onChange={(event) => setFileName(event.target.value)} />
            </label>
            <label>
              File path
              <input value={filePath} onChange={(event) => setFilePath(event.target.value)} />
            </label>
            <label>
              File type
              <input value={fileType} onChange={(event) => setFileType(event.target.value)} />
            </label>
            <label>
              File size
              <input value={fileSize} onChange={(event) => setFileSize(event.target.value)} />
            </label>
            <button type="submit" className="action-button action-button--small" disabled={actionState.pending}>
              {actionState.pending ? 'Saving...' : 'Add file'}
            </button>
          </form>

          <ul className="student-list">
            {folders.map((entry) => (
              <li key={`folder-${String(entry.id)}`}>
                <strong>{asString(entry.name) || `Folder ${String(entry.id)}`}</strong>
                <span>Parent: {String(asNumber(entry.parent_id))}</span>
                <button
                  type="button"
                  className="action-button action-button--small"
                  onClick={() => setFolderId(asNumber(entry.id))}
                >
                  Open folder
                </button>
              </li>
            ))}
            {files.map((entry) => (
              <li key={`file-${String(entry.id)}`}>
                <strong>{asString(entry.name) || `File ${String(entry.id)}`}</strong>
                <span>Type: {asString(entry.type) || 'N/A'}</span>
                <span>Path: {asString(entry.path) || 'N/A'}</span>
              </li>
            ))}
          </ul>
        </ShellCard>
      </section>
    </section>
  );
}

function AdminAssessmentsSection({ api, session }: { api: AdminPortalApi; session: AuthSession }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useActionState();

  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [subjects, setSubjects] = useState<Record<string, unknown>[]>([]);
  const [snapshot, setSnapshot] = useState<{
    upcomingExams: Record<string, unknown>[];
    expiredExams: Record<string, unknown>[];
    currentAssignments: Record<string, unknown>[];
    upcomingAssignments: Record<string, unknown>[];
    completedAssignments: Record<string, unknown>[];
  } | null>(null);
  const [liveClasses, setLiveClasses] = useState<Record<string, unknown>[]>([]);

  const [courseId, setCourseId] = useState(0);
  const [subjectId, setSubjectId] = useState(0);
  const [cohortId, setCohortId] = useState('0');

  const [zoomId, setZoomId] = useState('phase14-admin-zoom');
  const [zoomPassword, setZoomPassword] = useState('phase14-pass');
  const [sessionId, setSessionId] = useState('phase14-live-session');
  const [liveTitle, setLiveTitle] = useState('Phase14 Admin Live Class');
  const [liveDate, setLiveDate] = useState(dateOnly(1));
  const [fromTime, setFromTime] = useState('10:00:00');
  const [toTime, setToTime] = useState('11:00:00');

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const courseRows = await api.loadCourses(session.token);
      const effectiveCourseId = courseId > 0 ? courseId : AdminPortalApi.firstCourseId(courseRows);
      const subjectRows = await api.loadSubjects(session.token, effectiveCourseId);
      const effectiveSubjectId = subjectId > 0 ? subjectId : AdminPortalApi.firstSubjectId(subjectRows);

      const [assessmentSnapshot, livesSnapshot] = await Promise.all([
        api.loadAssessments(session.token, {
          courseId: effectiveCourseId,
          subjectId: effectiveSubjectId,
          cohortId: Number.parseInt(cohortId, 10) || 0,
        }),
        api.loadLiveClasses(session.token),
      ]);

      setCourses(courseRows);
      setSubjects(subjectRows);
      setSnapshot(assessmentSnapshot);
      setLiveClasses(livesSnapshot);

      if (courseId <= 0 && effectiveCourseId > 0) {
        setCourseId(effectiveCourseId);
      }

      if (subjectId <= 0 && effectiveSubjectId > 0) {
        setSubjectId(effectiveSubjectId);
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

  const applyFilter = async (): Promise<void> => {
    await load();
  };

  const addLiveClass = async (): Promise<void> => {
    const cohort = Number.parseInt(cohortId, 10) || 0;

    if (cohort <= 0) {
      setActionState({ pending: false, message: '', error: 'Cohort id is required for live class scheduling.' });
      return;
    }

    setActionState({ pending: true, message: '', error: null });

    try {
      const response = await api.addLiveClass(session.token, {
        cohortId: cohort,
        zoomId,
        password: zoomPassword,
        entries: [
          {
            sessionId,
            title: liveTitle,
            date: liveDate,
            fromTime,
            toTime,
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
    return <InlineNotice tone="info" title="Assessments loading">Fetching exam, assignment, and live-class data.</InlineNotice>;
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

  if (!snapshot) {
    return <InlineNotice tone="warning" title="No assessment data">No assessment data available.</InlineNotice>;
  }

  const openAssignments = snapshot.currentAssignments.length + snapshot.upcomingAssignments.length;

  return (
    <section className="student-section" aria-label="Admin assessments module">
      <header className="student-section__header">
        <h2>Assessments and live</h2>
        <p>Assessment queues with live-class scheduling workflow for admin operations.</p>
      </header>

      {actionState.error ? <InlineNotice tone="danger" title="Assessment action failed">{actionState.error}</InlineNotice> : null}
      {actionState.message ? <InlineNotice tone="success" title="Assessment action complete">{actionState.message}</InlineNotice> : null}

      <section className="metrics-grid">
        <MetricCard label="Upcoming exams" value={String(snapshot.upcomingExams.length)} detail="Exam index" tone="info" />
        <MetricCard label="Expired exams" value={String(snapshot.expiredExams.length)} detail="Exam index" tone="warning" />
        <MetricCard label="Open assignments" value={String(openAssignments)} detail="Current + upcoming" tone="success" />
        <MetricCard label="Completed assignments" value={String(snapshot.completedAssignments.length)} detail="Reviewed queue" tone="neutral" />
        <MetricCard label="Live classes" value={String(liveClasses.length)} detail="Admin scheduler" tone="info" />
      </section>

      <section className="shell-cards-grid">
        <ShellCard title="Assessment filters" subtitle="Scope exams and assignments by course and subject.">
          <form
            className="student-form"
            onSubmit={(event) => {
              event.preventDefault();
              void applyFilter();
            }}
          >
            <label>
              Course
              <select value={String(courseId)} onChange={(event) => setCourseId(Number.parseInt(event.target.value, 10) || 0)}>
                {courses.map((entry) => (
                  <option key={String(entry.id)} value={String(entry.id)}>
                    {asString(entry.title) || `Course ${String(entry.id)}`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Subject
              <select value={String(subjectId)} onChange={(event) => setSubjectId(Number.parseInt(event.target.value, 10) || 0)}>
                {subjects.map((entry) => (
                  <option key={String(entry.id)} value={String(entry.id)}>
                    {asString(entry.title) || `Subject ${String(entry.id)}`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cohort id (optional)
              <input value={cohortId} onChange={(event) => setCohortId(event.target.value)} />
            </label>
            <button type="submit" className="action-button action-button--small">Refresh assessment snapshot</button>
          </form>

          <ul className="student-list">
            {snapshot.upcomingExams.slice(0, 6).map((entry) => (
              <li key={`upcoming-exam-${String(entry.id)}`}>
                <strong>{asString(entry.title) || `Exam ${String(entry.id)}`}</strong>
                <span>From: {asString(entry.from_date) || 'N/A'}</span>
              </li>
            ))}
            {snapshot.currentAssignments.slice(0, 6).map((entry) => (
              <li key={`current-assignment-${String(entry.id)}`}>
                <strong>{asString(entry.title) || `Assignment ${String(entry.id)}`}</strong>
                <span>Due: {asString(entry.due_date) || 'N/A'}</span>
              </li>
            ))}
          </ul>
        </ShellCard>

        <ShellCard title="Live class scheduler" subtitle="Add live classes by cohort id and inspect latest sessions." theme="dark">
          <form
            className="student-form"
            onSubmit={(event) => {
              event.preventDefault();
              void addLiveClass();
            }}
          >
            <label>
              Cohort id
              <input value={cohortId} onChange={(event) => setCohortId(event.target.value)} />
            </label>
            <label>
              Zoom id
              <input value={zoomId} onChange={(event) => setZoomId(event.target.value)} />
            </label>
            <label>
              Password
              <input value={zoomPassword} onChange={(event) => setZoomPassword(event.target.value)} />
            </label>
            <label>
              Session id
              <input value={sessionId} onChange={(event) => setSessionId(event.target.value)} />
            </label>
            <label>
              Title
              <input value={liveTitle} onChange={(event) => setLiveTitle(event.target.value)} />
            </label>
            <label>
              Date
              <input type="date" value={liveDate} onChange={(event) => setLiveDate(event.target.value)} />
            </label>
            <label>
              From time
              <input value={fromTime} onChange={(event) => setFromTime(event.target.value)} />
            </label>
            <label>
              To time
              <input value={toTime} onChange={(event) => setToTime(event.target.value)} />
            </label>
            <button type="submit" className="action-button action-button--small" disabled={actionState.pending}>
              {actionState.pending ? 'Saving...' : 'Add live class'}
            </button>
          </form>

          <ul className="student-list">
            {liveClasses.slice(0, 10).map((entry) => (
              <li key={`live-${String(entry.id)}`}>
                <strong>{asString(entry.title) || `Live ${String(entry.id)}`}</strong>
                <span>Date: {asString(entry.date) || 'N/A'}</span>
                <span>Cohort: {asString(entry.cohort_title) || String(asNumber(entry.cohort_id))}</span>
              </li>
            ))}
          </ul>
        </ShellCard>
      </section>
    </section>
  );
}

function AdminReportsSection({ api, session }: { api: AdminPortalApi; session: AuthSession }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useActionState();

  const [summary, setSummary] = useState<Record<string, unknown>>({});
  const [liveReport, setLiveReport] = useState<{ lives: Record<string, unknown>[]; listItems: Record<string, unknown>[] }>({
    lives: [],
    listItems: [],
  });
  const [calendar, setCalendar] = useState<Record<string, unknown>[]>([]);
  const [csvPreview, setCsvPreview] = useState('');

  const [fromDate, setFromDate] = useState(dateOnly(-7));
  const [toDate, setToDate] = useState(dateOnly(7));
  const [liveId, setLiveId] = useState(0);
  const [joinDate, setJoinDate] = useState(dateOnly(0));

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const [summarySnapshot, liveSnapshot, calendarSnapshot] = await Promise.all([
        api.loadReports(session.token, {
          fromDate,
          toDate,
        }),
        api.loadLiveReport(session.token, liveId, joinDate),
        api.loadGlobalCalendar(session.token, fromDate, toDate),
      ]);

      setSummary(summarySnapshot);
      setLiveReport(liveSnapshot);
      setCalendar(calendarSnapshot);

      if (liveId <= 0 && liveSnapshot.lives.length > 0) {
        setLiveId(AdminPortalApi.firstLiveId(liveSnapshot.lives));
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

  const exportSummary = async (): Promise<void> => {
    setActionState({ pending: true, message: '', error: null });

    try {
      const exported = await api.exportReport(session.token, {
        type: 'summary',
        fromDate,
        toDate,
      });

      setCsvPreview(exported.csv);
      setActionState({ pending: false, message: `Summary export ready: ${exported.filename}`, error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: messageFromError(actionError) });
    }
  };

  const exportLiveReport = async (): Promise<void> => {
    const effectiveLiveId = liveId > 0 ? liveId : AdminPortalApi.firstLiveId(liveReport.lives);
    if (effectiveLiveId <= 0) {
      setActionState({ pending: false, message: '', error: 'No live class id available for export.' });
      return;
    }

    setActionState({ pending: true, message: '', error: null });

    try {
      const exported = await api.exportReport(session.token, {
        type: 'live_report',
        liveId: effectiveLiveId,
        date: joinDate,
      });

      setCsvPreview(exported.csv);
      setActionState({ pending: false, message: `Live report export ready: ${exported.filename}`, error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: messageFromError(actionError) });
    }
  };

  if (loading) {
    return <InlineNotice tone="info" title="Reports loading">Fetching summary reports, live report, and calendar events.</InlineNotice>;
  }

  if (error) {
    return (
      <InlineNotice tone="danger" title="Reports failed">
        <p>{error}</p>
        <button type="button" className="action-button action-button--small" onClick={() => void load()}>
          Retry
        </button>
      </InlineNotice>
    );
  }

  return (
    <section className="student-section" aria-label="Admin reports module">
      <header className="student-section__header">
        <h2>Reports and exports</h2>
        <p>Operational summaries with live report and CSV export parity workflows.</p>
      </header>

      {actionState.error ? <InlineNotice tone="danger" title="Report action failed">{actionState.error}</InlineNotice> : null}
      {actionState.message ? <InlineNotice tone="success" title="Report action complete">{actionState.message}</InlineNotice> : null}

      <section className="metrics-grid">
        <MetricCard label="Applications" value={String(asNumber(summary.applications_total))} detail="Report summary" tone="info" />
        <MetricCard label="Pending" value={String(asNumber(summary.applications_pending))} detail="Report summary" tone="warning" />
        <MetricCard label="Centres" value={String(asNumber(summary.centres_total))} detail="Report summary" tone="neutral" />
        <MetricCard label="Students" value={String(asNumber(summary.students_total))} detail="Report summary" tone="success" />
        <MetricCard label="Live classes" value={String(asNumber(summary.live_classes_total))} detail="Report summary" tone="info" />
      </section>

      <section className="shell-cards-grid">
        <ShellCard title="Filters and export" subtitle="Apply window filters and generate CSV outputs.">
          <form
            className="student-form"
            onSubmit={(event) => {
              event.preventDefault();
              void load();
            }}
          >
            <label>
              From date
              <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </label>
            <label>
              To date
              <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </label>
            <label>
              Live id
              <input value={String(liveId)} onChange={(event) => setLiveId(Number.parseInt(event.target.value, 10) || 0)} />
            </label>
            <label>
              Join date
              <input type="date" value={joinDate} onChange={(event) => setJoinDate(event.target.value)} />
            </label>
            <div className="student-actions">
              <button type="submit" className="action-button action-button--small">Refresh reports</button>
              <button type="button" className="action-button action-button--small" onClick={() => void exportSummary()} disabled={actionState.pending}>
                Export summary CSV
              </button>
              <button type="button" className="action-button action-button--small" onClick={() => void exportLiveReport()} disabled={actionState.pending}>
                Export live CSV
              </button>
            </div>
          </form>

          {csvPreview.trim() !== '' ? (
            <pre className="student-json">{csvPreview.split('\n').slice(0, 6).join('\n')}</pre>
          ) : (
            <InlineNotice tone="info" title="CSV preview">Run one of the export actions to preview CSV output.</InlineNotice>
          )}
        </ShellCard>

        <ShellCard title="Live report and calendar" subtitle="Attendance joins and scheduled event timelines." theme="dark">
          <ul className="student-list">
            {liveReport.listItems.slice(0, 8).map((entry) => (
              <li key={`live-report-${String(entry.id)}`}>
                <strong>{asString(entry.user_name) || `User ${String(entry.user_id)}`}</strong>
                <span>Live id: {String(asNumber(entry.live_id))}</span>
                <span>Join date: {asString(entry.join_date) || 'N/A'}</span>
              </li>
            ))}
            {calendar.slice(0, 8).map((entry) => (
              <li key={`calendar-${String(entry.event_type)}-${String(entry.id)}`}>
                <strong>{asString(entry.title) || `Event ${String(entry.id)}`}</strong>
                <span>Type: {asString(entry.event_type) || 'N/A'}</span>
                <span>Date: {asString(entry.event_date) || 'N/A'}</span>
              </li>
            ))}
          </ul>
        </ShellCard>
      </section>
    </section>
  );
}

function AdminSettingsSection({ api, session }: { api: AdminPortalApi; session: AuthSession }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useActionState();

  const [systemRows, setSystemRows] = useState<Record<string, unknown>[]>([]);
  const [frontendRows, setFrontendRows] = useState<Record<string, unknown>[]>([]);

  const [systemName, setSystemName] = useState('');
  const [systemEmail, setSystemEmail] = useState('');
  const [bannerTitle, setBannerTitle] = useState('');
  const [aboutUs, setAboutUs] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [appVersionIos, setAppVersionIos] = useState('');

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const snapshot = await api.loadSettings(session.token);
      setSystemRows(snapshot.systemSettings);
      setFrontendRows(snapshot.frontendSettings);

      setSystemName(firstValueByKey(snapshot.systemSettings, 'system_name'));
      setSystemEmail(firstValueByKey(snapshot.systemSettings, 'system_email'));
      setBannerTitle(firstValueByKey(snapshot.frontendSettings, 'banner_title'));
      setAboutUs(firstValueByKey(snapshot.frontendSettings, 'about_us'));
      setAppVersion(asString(snapshot.appVersion.app_version));
      setAppVersionIos(asString(snapshot.appVersion.app_version_ios));
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

  const saveSystemSettings = async (): Promise<void> => {
    setActionState({ pending: true, message: '', error: null });

    try {
      const response = await api.updateSystemSettings(session.token, {
        system_name: systemName,
        system_email: systemEmail,
      });

      if (!responseSuccess(response)) {
        setActionState({
          pending: false,
          message: '',
          error: asString(response.message) || 'Unable to update system settings.',
        });
        return;
      }

      await load();
      setActionState({ pending: false, message: 'System settings updated.', error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: messageFromError(actionError) });
    }
  };

  const saveWebsiteSettings = async (): Promise<void> => {
    setActionState({ pending: true, message: '', error: null });

    try {
      const response = await api.updateWebsiteSettings(session.token, {
        banner_title: bannerTitle,
        about_us: aboutUs,
      });

      if (!responseSuccess(response)) {
        setActionState({
          pending: false,
          message: '',
          error: asString(response.message) || 'Unable to update website settings.',
        });
        return;
      }

      await load();
      setActionState({ pending: false, message: 'Website settings updated.', error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: messageFromError(actionError) });
    }
  };

  const saveAppVersion = async (): Promise<void> => {
    if (appVersion.trim() === '' || appVersionIos.trim() === '') {
      setActionState({ pending: false, message: '', error: 'Both Android and iOS app versions are required.' });
      return;
    }

    setActionState({ pending: true, message: '', error: null });

    try {
      const response = await api.updateAppVersion(session.token, {
        appVersion,
        appVersionIos,
      });

      if (!responseSuccess(response)) {
        setActionState({
          pending: false,
          message: '',
          error: asString(response.message) || 'Unable to update app version.',
        });
        return;
      }

      await load();
      setActionState({ pending: false, message: 'App version updated.', error: null });
    } catch (actionError: unknown) {
      setActionState({ pending: false, message: '', error: messageFromError(actionError) });
    }
  };

  if (loading) {
    return <InlineNotice tone="info" title="Settings loading">Fetching system, frontend, and app-version settings.</InlineNotice>;
  }

  if (error) {
    return (
      <InlineNotice tone="danger" title="Settings failed">
        <p>{error}</p>
        <button type="button" className="action-button action-button--small" onClick={() => void load()}>
          Retry
        </button>
      </InlineNotice>
    );
  }

  return (
    <section className="student-section" aria-label="Admin settings module">
      <header className="student-section__header">
        <h2>Settings</h2>
        <p>System and website settings plus mobile app-version configuration workflows.</p>
      </header>

      {actionState.error ? <InlineNotice tone="danger" title="Settings action failed">{actionState.error}</InlineNotice> : null}
      {actionState.message ? <InlineNotice tone="success" title="Settings action complete">{actionState.message}</InlineNotice> : null}

      <section className="metrics-grid">
        <MetricCard label="System keys" value={String(systemRows.length)} detail="settings table" tone="info" />
        <MetricCard label="Frontend keys" value={String(frontendRows.length)} detail="frontend_settings table" tone="neutral" />
        <MetricCard label="App version" value={appVersion || 'N/A'} detail={`iOS ${appVersionIos || 'N/A'}`} tone="success" />
      </section>

      <section className="shell-cards-grid">
        <ShellCard title="System and website settings" subtitle="Update core system values and website content flags.">
          <form
            className="student-form"
            onSubmit={(event) => {
              event.preventDefault();
              void saveSystemSettings();
            }}
          >
            <label>
              System name
              <input value={systemName} onChange={(event) => setSystemName(event.target.value)} />
            </label>
            <label>
              System email
              <input value={systemEmail} onChange={(event) => setSystemEmail(event.target.value)} />
            </label>
            <button type="submit" className="action-button action-button--small" disabled={actionState.pending}>
              {actionState.pending ? 'Saving...' : 'Save system settings'}
            </button>
          </form>

          <form
            className="student-form"
            onSubmit={(event) => {
              event.preventDefault();
              void saveWebsiteSettings();
            }}
          >
            <label>
              Banner title
              <input value={bannerTitle} onChange={(event) => setBannerTitle(event.target.value)} />
            </label>
            <label>
              About us
              <input value={aboutUs} onChange={(event) => setAboutUs(event.target.value)} />
            </label>
            <button type="submit" className="action-button action-button--small" disabled={actionState.pending}>
              {actionState.pending ? 'Saving...' : 'Save website settings'}
            </button>
          </form>
        </ShellCard>

        <ShellCard title="App version and config snapshot" subtitle="Manage mobile app release versioning." theme="dark">
          <form
            className="student-form"
            onSubmit={(event) => {
              event.preventDefault();
              void saveAppVersion();
            }}
          >
            <label>
              Android app version
              <input value={appVersion} onChange={(event) => setAppVersion(event.target.value)} />
            </label>
            <label>
              iOS app version
              <input value={appVersionIos} onChange={(event) => setAppVersionIos(event.target.value)} />
            </label>
            <button type="submit" className="action-button action-button--small" disabled={actionState.pending}>
              {actionState.pending ? 'Saving...' : 'Save app version'}
            </button>
          </form>

          <pre className="student-json">{JSON.stringify({ systemRows, frontendRows }, null, 2)}</pre>
        </ShellCard>
      </section>
    </section>
  );
}

function AdminSectionRouter({
  section,
  api,
  session,
}: {
  section: AdminSectionId;
  api: AdminPortalApi;
  session: AuthSession;
}) {
  switch (section) {
    case 'dashboard':
      return <AdminDashboardSection api={api} session={session} />;
    case 'users':
      return <AdminUsersSection api={api} session={session} />;
    case 'content':
      return <AdminContentSection api={api} session={session} />;
    case 'assessments':
      return <AdminAssessmentsSection api={api} session={session} />;
    case 'reports':
      return <AdminReportsSection api={api} session={session} />;
    case 'settings':
      return <AdminSettingsSection api={api} session={session} />;
    default:
      return (
        <InlineNotice tone="warning" title="Section unavailable">
          Requested admin section is not available.
        </InlineNotice>
      );
  }
}

export function AdminPortal({ pathname, session, api, onNavigate, onLogout }: AdminPortalProps) {
  const section = resolveAdminSection(pathname);

  if (!section) {
    return (
      <InlineNotice tone="warning" title="Unknown admin route">
        No admin section mapped for path: {pathname}
      </InlineNotice>
    );
  }

  return (
    <PortalScaffold
      roleLabel="Admin App"
      title="Admin operations portal"
      subtitle="Manage users, content, assessments, reports, and settings"
      navItems={ADMIN_SECTION_NAV.map((entry) => ({
        id: entry.id,
        label: entry.label,
        href: entry.href,
      }))}
      activeHref={pathname}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <section className="portal-intro">
        <p>
          {ADMIN_SECTION_NAV.find((entry) => entry.id === section)?.subtitle || 'Admin portal'}
          {' '}section running on migrated Node operations/content/assessment APIs.
        </p>
      </section>

      <AdminSectionRouter section={section} api={api} session={session} />
    </PortalScaffold>
  );
}
