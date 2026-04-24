import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
  BookOpen, Users, Video, ClipboardList, Calendar, Megaphone,
  Trash2, Plus, Search, Pencil, Eye, ExternalLink, Download,
  CheckCircle2, FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';
import { useConfirm } from '@/components/confirm-dialog';

const TAB_LABELS = ['Learners', 'Live Sessions', 'Activities/Assignments', 'Announcements'];
const ASSIGNMENT_SUB_TABS = ['Details', 'Submissions', 'Unsubmitted Students'];

// MariaDB TIME columns come back as "1970-01-01T19:00:00.000Z" (Prisma prefixes
// the epoch date). Strip down to HH:MM for display.
function formatTimeValue(t: string): string {
  if (!t) return '';
  const iso = t.match(/T(\d{2}:\d{2})/);
  if (iso && iso[1]) return iso[1];
  return t.length >= 5 ? t.slice(0, 5) : t;
}

type ModalType =
  | { kind: 'add-learner' }
  | { kind: 'add-session' }
  | { kind: 'edit-recording'; sessionId: string; currentLink: string }
  | { kind: 'add-assignment' }
  | { kind: 'edit-assignment'; assignment: Record<string, unknown> }
  | { kind: 'grade-submission'; submission: Record<string, unknown>; assignmentMarks: number }
  | { kind: 'add-announcement' }
  | { kind: 'edit-announcement'; announcement: Record<string, unknown> }
  | null;

export default function ViewCohortPage({ api, session, onNavigate }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [modal, setModal] = useState<ModalType>(null);
  const [submitting, setSubmitting] = useState(false);

  const cohortId = useMemo(() => {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || '';
  }, []);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.getCohortDetail(session.token, cohortId),
    [cohortId],
  );

  const cohort = useMemo(() => {
    if (!data) return null;
    const record = data.cohort;
    return typeof record === 'object' && record !== null ? (record as Record<string, unknown>) : null;
  }, [data]);

  const learners = useMemo(() => toRecords(data?.learners), [data]);
  const liveSessions = useMemo(() => toRecords(data?.live_sessions), [data]);
  const assignments = useMemo(() => toRecords(data?.assignments), [data]);
  const announcements = useMemo(() => toRecords(data?.announcements), [data]);

  /* ── Live sessions split: upcoming vs completed ──────────────────── */
  const upcomingSessions = useMemo(
    () => liveSessions.filter((s) => !asString(s.video_url) && !asString(s.recording_url)),
    [liveSessions],
  );
  const completedSessions = useMemo(
    () => liveSessions.filter((s) => asString(s.video_url) || asString(s.recording_url)),
    [liveSessions],
  );

  if (loading) return <PageLoader label="Loading cohort..." />;

  if (error || !cohort) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error || 'Cohort not found.'}</CardContent>
      </Card>
    );
  }

  /* ── Summary metadata ───────────────────────────────────────────── */
  const instructorName = asString(cohort.instructor_name) || 'Unassigned';
  const instructorImage = asString(cohort.instructor_image);
  const courseTitle = asString(cohort.course_title) || '-';
  const subjectTitle = asString(cohort.subject_title) || '-';
  const language = asString(cohort.language) || '';
  const subjectWithLang = language ? `${subjectTitle} - ${language}` : subjectTitle;
  const studentCount = learners.length || asNumber(cohort.student_count);
  const sessionCount = liveSessions.length || asNumber(cohort.live_class_count) || asNumber(cohort.live_sessions_count);
  const assignmentCount = assignments.length || asNumber(cohort.assignments_count);
  const cohortIdLabel = asString(cohort.cohort_id) || cohortId;
  const startDate = formatDate(cohort.start_date) || '-';
  const endDate = formatDate(cohort.end_date) || '-';
  const status = asString(cohort.status) || 'active';

  return (
    <div className="space-y-4">
      {/* Sub-header banner */}
      <div className="rounded-lg border-l-4 border-ttii-primary bg-white px-4 py-3 shadow-sm">
        <p className="text-base font-bold text-ttii-primary">{asString(cohort.title)}</p>
        <p className="text-xs text-gray-500">Cohorts / {asString(cohort.title)}</p>
      </div>

      <AdminPageHeader title="Cohort Edit">
        <Button variant="outline" onClick={() => onNavigate('/admin/cohorts/index')}>
          &larr; Back to Cohorts
        </Button>
        <Button className="bg-ttii-primary hover:bg-ttii-primary/90" onClick={() => onNavigate('/admin/cohorts/add')}>
          + Add Cohort
        </Button>
      </AdminPageHeader>

      {/* ── Summary Card ───────────────────────────────────────────── */}
      <Card className="overflow-hidden bg-gradient-to-r from-blue-50 via-white to-purple-50">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="size-20 shrink-0 ring-4 ring-white shadow-md">
                {instructorImage ? <AvatarImage src={instructorImage} alt={instructorName} /> : null}
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-2xl font-bold text-white">
                  {instructorName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">Faculty</p>
                <p className="text-xl font-bold text-gray-900">{instructorName}</p>
                <div className="mt-1 flex items-center gap-2">
                  <AdminStatusBadge status={status} />
                  <span className="text-xs font-medium text-gray-600">{cohortIdLabel}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-white p-3 text-center shadow-sm">
                <Users className="mx-auto size-5 text-blue-600" />
                <p className="mt-1 text-2xl font-bold text-gray-900">{studentCount}</p>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Students</p>
              </div>
              <div className="rounded-lg bg-white p-3 text-center shadow-sm">
                <Video className="mx-auto size-5 text-purple-600" />
                <p className="mt-1 text-2xl font-bold text-gray-900">{sessionCount}</p>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Live Sessions</p>
              </div>
              <div className="rounded-lg bg-white p-3 text-center shadow-sm">
                <ClipboardList className="mx-auto size-5 text-orange-600" />
                <p className="mt-1 text-2xl font-bold text-gray-900">{assignmentCount}</p>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Assignments</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-white/60 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-2">
              <BookOpen className="mt-0.5 size-4 shrink-0 text-blue-600" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Course</p>
                <p className="truncate text-sm font-medium text-blue-700 hover:underline cursor-pointer">{courseTitle}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <BookOpen className="mt-0.5 size-4 shrink-0 text-blue-600" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Subject</p>
                <p className="truncate text-sm font-medium text-blue-700 hover:underline cursor-pointer">{subjectWithLang}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 size-4 shrink-0 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Start Date</p>
                <p className="text-sm font-medium text-gray-900">{startDate}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 size-4 shrink-0 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">End Date</p>
                <p className="text-sm font-medium text-gray-900">{endDate}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tab navigation ──────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto rounded-full bg-gray-100 p-1">
        {TAB_LABELS.map((label, idx) => (
          <button
            key={label}
            type="button"
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === idx ? 'bg-ttii-primary text-white shadow-sm' : 'text-gray-600 hover:bg-white'
            }`}
            onClick={() => setActiveTab(idx)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab 0: Learners ─────────────────────────────────────────── */}
      {activeTab === 0 && (
        <LearnersTab
          cohortId={cohortId}
          cohortDbId={asString(cohort._id) || asString(cohort.id) || cohortId}
          learners={learners}
          api={api}
          token={session.token}
          onAddClick={() => setModal({ kind: 'add-learner' })}
          onReload={reload}
        />
      )}

      {/* ── Tab 1: Live Sessions ────────────────────────────────────── */}
      {activeTab === 1 && (
        <LiveSessionsTab
          upcomingSessions={upcomingSessions}
          completedSessions={completedSessions}
          api={api}
          token={session.token}
          cohortName={asString(cohort.title)}
          onAddClick={() => setModal({ kind: 'add-session' })}
          onEditRecordingClick={(sessionId, currentLink) => setModal({ kind: 'edit-recording', sessionId, currentLink })}
          onReload={reload}
        />
      )}

      {/* ── Tab 2: Activities/Assignments ───────────────────────────── */}
      {activeTab === 2 && (
        <AssignmentsTab
          assignments={assignments}
          cohortName={asString(cohort.title)}
          api={api}
          token={session.token}
          onAddClick={() => setModal({ kind: 'add-assignment' })}
          onEditClick={(assignment) => setModal({ kind: 'edit-assignment', assignment })}
          onGradeClick={(submission, assignmentMarks) => setModal({ kind: 'grade-submission', submission, assignmentMarks })}
          onReload={reload}
        />
      )}

      {/* ── Tab 3: Announcements ────────────────────────────────────── */}
      {activeTab === 3 && (
        <AnnouncementsTab
          announcements={announcements}
          api={api}
          token={session.token}
          onAddClick={() => setModal({ kind: 'add-announcement' })}
          onEditClick={(announcement) => setModal({ kind: 'edit-announcement', announcement })}
          onReload={reload}
        />
      )}

      {/* ── Modals ──────────────────────────────────────────────────── */}
      {modal?.kind === 'add-learner' && (
        <AddLearnerModal
          open
          onClose={() => setModal(null)}
          api={api}
          token={session.token}
          cohortId={cohortId}
          submitting={submitting}
          setSubmitting={setSubmitting}
          onSuccess={() => {
            setModal(null);
            reload();
          }}
        />
      )}

      {modal?.kind === 'add-session' && (
        <AddLiveSessionModal
          open
          onClose={() => setModal(null)}
          api={api}
          token={session.token}
          cohortId={cohortId}
          submitting={submitting}
          setSubmitting={setSubmitting}
          onSuccess={() => {
            setModal(null);
            reload();
          }}
        />
      )}

      {modal?.kind === 'edit-recording' && (
        <EditRecordingModal
          open
          onClose={() => setModal(null)}
          api={api}
          token={session.token}
          sessionId={modal.sessionId}
          initialLink={modal.currentLink}
          submitting={submitting}
          setSubmitting={setSubmitting}
          onSuccess={() => {
            setModal(null);
            reload();
          }}
        />
      )}

      {(modal?.kind === 'add-assignment' || modal?.kind === 'edit-assignment') && (
        <AssignmentModal
          open
          onClose={() => setModal(null)}
          api={api}
          token={session.token}
          cohortId={cohortId}
          assignment={modal.kind === 'edit-assignment' ? modal.assignment : null}
          submitting={submitting}
          setSubmitting={setSubmitting}
          onSuccess={() => {
            setModal(null);
            reload();
          }}
        />
      )}

      {modal?.kind === 'grade-submission' && (
        <GradeSubmissionModal
          open
          onClose={() => setModal(null)}
          api={api}
          token={session.token}
          submission={modal.submission}
          assignmentMarks={modal.assignmentMarks}
          submitting={submitting}
          setSubmitting={setSubmitting}
          onSuccess={() => {
            setModal(null);
            reload();
          }}
        />
      )}

      {(modal?.kind === 'add-announcement' || modal?.kind === 'edit-announcement') && (
        <AnnouncementModal
          open
          onClose={() => setModal(null)}
          api={api}
          token={session.token}
          cohortId={cohortId}
          announcement={modal.kind === 'edit-announcement' ? modal.announcement : null}
          submitting={submitting}
          setSubmitting={setSubmitting}
          onSuccess={() => {
            setModal(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LEARNERS TAB — grid layout with photo, name, delete icon
   ═══════════════════════════════════════════════════════════════════ */
function LearnersTab({
  learners,
  api,
  token,
  cohortId,
  onAddClick,
  onReload,
}: {
  cohortId: string;
  cohortDbId: string;
  learners: Record<string, unknown>[];
  api: AdminPageProps['api'];
  token: string;
  onAddClick: () => void;
  onReload: () => void;
}) {
  const confirm = useConfirm();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return learners;
    const q = search.toLowerCase();
    return learners.filter((l) => asString(l.name).toLowerCase().includes(q));
  }, [learners, search]);

  const handleRemove = useCallback(
    async (learner: Record<string, unknown>) => {
      const studentId = asString(learner.id) || asString(learner._id);
      const name = asString(learner.name);
      if (!(await confirm({
        title: `Remove ${name} from this cohort?`,
        description: 'This action cannot be undone.',
        confirmText: 'Remove',
        variant: 'destructive',
      }))) return;
      try {
        await api.removeCohortLearner(token, cohortId, studentId);
        onReload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to remove learner');
      }
    },
    [api, token, cohortId, onReload, confirm],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Learners List ({learners.length})</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Learners"
                className="h-9 w-48 rounded-full pl-8"
              />
            </div>
            <Button onClick={onAddClick} className="rounded-full bg-ttii-primary hover:bg-ttii-primary/90">
              <Plus className="mr-1 size-4" /> Add
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No learners enrolled in this cohort.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((learner, idx) => {
              const id = asString(learner.id) || asString(learner._id);
              const name = asString(learner.name).toUpperCase() || '-';
              const image = asString(learner.image);
              return (
                <div key={id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
                  <span className="text-xs font-medium text-gray-400 w-5">{idx + 1}</span>
                  <Avatar className="size-10">
                    {image ? <AvatarImage src={image} alt="" /> : null}
                    <AvatarFallback className="bg-ttii-primary text-xs text-white">
                      {name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate text-sm font-medium text-gray-800">{name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:bg-red-50 hover:text-red-700"
                    onClick={() => void handleRemove(learner)}
                    title="Remove"
                    aria-label="Remove learner"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LIVE SESSIONS TAB — upcoming cards + completed list
   ═══════════════════════════════════════════════════════════════════ */
function LiveSessionsTab({
  upcomingSessions,
  completedSessions,
  api,
  token,
  cohortName,
  onAddClick,
  onEditRecordingClick,
  onReload,
}: {
  upcomingSessions: Record<string, unknown>[];
  completedSessions: Record<string, unknown>[];
  api: AdminPageProps['api'];
  token: string;
  cohortName: string;
  onAddClick: () => void;
  onEditRecordingClick: (sessionId: string, currentLink: string) => void;
  onReload: () => void;
}) {
  const confirm = useConfirm();
  const [attendanceSession, setAttendanceSession] = useState<{ id: string; title: string } | null>(null);
  const handleDelete = useCallback(
    async (session: Record<string, unknown>) => {
      const id = asString(session.id) || asString(session._id);
      if (!(await confirm({
        title: 'Delete this live session?',
        description: 'This action cannot be undone.',
        confirmText: 'Delete',
        variant: 'destructive',
      }))) return;
      try {
        await api.deleteCohortLiveSession(token, id);
        onReload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete session');
      }
    },
    [api, token, onReload, confirm],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Live Sessions</CardTitle>
          <Button onClick={onAddClick} className="rounded-full bg-ttii-primary hover:bg-ttii-primary/90">
            <Plus className="mr-1 size-4" /> Add Live Session
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upcoming sessions — card layout */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Upcoming / Scheduled</p>
          {upcomingSessions.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No upcoming sessions.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {upcomingSessions.map((s) => {
                const id = asString(s.id) || asString(s._id);
                const sessionId = asString(s.session_id);
                const title = asString(s.title);
                const platform = asString(s.platform).toLowerCase();
                const zoomId = asString(s.zoom_id);
                const password = asString(s.password);
                const joinUrl = asString(s.join_url);
                const hostEmail = asString(s.host_email);
                const date = asString(s.date);
                const fromTime = formatTimeValue(asString(s.from_time) || asString(s.fromTime));
                const toTime = formatTimeValue(asString(s.to_time) || asString(s.toTime));
                const platformLabel =
                  platform === 'teams' ? 'Microsoft Teams'
                  : platform === 'zoom' ? 'Zoom'
                  : platform === 'manual' ? 'Manual link'
                  : zoomId ? 'Zoom' : '-';
                const hostUrl =
                  joinUrl ? joinUrl
                  : platform === 'zoom' || (!platform && zoomId) ? `/zoom/index/${id}`
                  : '';

                return (
                  <div key={id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="font-bold text-gray-900">{title}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div><span className="font-medium text-gray-500">Session ID:</span> {sessionId}</div>
                      <div><span className="font-medium text-gray-500">Cohort:</span> {cohortName}</div>
                      <div><span className="font-medium text-gray-500">Platform:</span> {platformLabel}</div>
                      {platform === 'teams' ? (
                        <div><span className="font-medium text-gray-500">Host:</span> {hostEmail || '-'}</div>
                      ) : platform === 'zoom' ? (
                        <div><span className="font-medium text-gray-500">Zoom ID:</span> {zoomId || '-'}</div>
                      ) : (
                        <div><span className="font-medium text-gray-500">Password:</span> {password || '-'}</div>
                      )}
                      <div><span className="font-medium text-gray-500">Date:</span> {date}</div>
                      <div><span className="font-medium text-gray-500">Time:</span> {fromTime} - {toTime}</div>
                      {joinUrl && (
                        <div className="col-span-2 truncate">
                          <span className="font-medium text-gray-500">Join URL:</span>{' '}
                          <a href={joinUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                            {joinUrl}
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        onClick={() => onEditRecordingClick(id, asString(s.video_url) || asString(s.recording_url))}
                      >
                        <Pencil className="size-3" /> Edit Recording
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        disabled={!hostUrl}
                        onClick={() => hostUrl && window.open(hostUrl, '_blank')}
                      >
                        <ExternalLink className="size-3" /> Join
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs text-red-600 hover:bg-red-50"
                        onClick={() => void handleDelete(s)}
                      >
                        <Trash2 className="size-3" /> Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Completed sessions — list layout */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Completed</p>
          {completedSessions.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No completed sessions.</p>
          ) : (
            <div className="space-y-2">
              {completedSessions.map((s) => {
                const id = asString(s.id) || asString(s._id);
                const title = asString(s.title);
                const date = asString(s.date);
                const fromTime = formatTimeValue(asString(s.from_time) || asString(s.fromTime));
                const toTime = formatTimeValue(asString(s.to_time) || asString(s.toTime));
                const recording = asString(s.video_url) || asString(s.recording_url);

                return (
                  <div key={id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                      <Video className="size-5 text-purple-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
                      <p className="truncate text-xs text-gray-500">{date} · {fromTime} - {toTime}</p>
                    </div>
                    <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                      <CheckCircle2 className="size-3" /> Uploaded
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="View Recording"
                      aria-label="View recording"
                      disabled={!recording}
                      onClick={() => {
                        if (!recording) return;
                        void (async () => {
                          try {
                            const signedUrl = await api.getLiveSessionRecordingSignedUrl(token, id);
                            window.open(signedUrl, '_blank', 'noopener,noreferrer');
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : 'Failed to open recording');
                          }
                        })();
                      }}
                    >
                      <Eye className="size-4 text-blue-600" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="View Attendance"
                      aria-label="View attendance"
                      onClick={() => setAttendanceSession({ id, title })}
                    >
                      <Users className="size-4 text-emerald-600" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Edit Link" aria-label="Edit recording link" onClick={() => onEditRecordingClick(id, recording)}>
                      <Pencil className="size-4 text-gray-600" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Delete" aria-label="Delete session" onClick={() => void handleDelete(s)}>
                      <Trash2 className="size-4 text-red-500" aria-hidden="true" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>

      {attendanceSession !== null ? (
        <LiveSessionAttendanceDialog
          sessionId={attendanceSession.id}
          sessionTitle={attendanceSession.title}
          api={api}
          token={token}
          onClose={() => setAttendanceSession(null)}
        />
      ) : null}
    </Card>
  );
}

function LiveSessionAttendanceDialog({
  sessionId,
  sessionTitle,
  api,
  token,
  onClose,
}: {
  sessionId: string;
  sessionTitle: string;
  api: AdminPageProps['api'];
  token: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const response = await api.loadLiveSessionAttendance(token, sessionId);
        if (cancelled) return;
        if (asNumber(response.status) === 1) {
          setData((response.data as Record<string, unknown>) ?? null);
        } else {
          setError(asString(response.message) || 'Failed to load attendance.');
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load attendance.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, token, sessionId]);

  const session = (data?.session as Record<string, unknown>) ?? null;
  const attendance = (data?.attendance as Record<string, unknown>[]) ?? [];
  const attendanceFetchedAt = session ? asString(session.attendance_fetched_at) : '';
  const attendanceFetchError = session ? asString(session.attendance_fetch_error) : '';

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">Attendance — {sessionTitle}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500">Loading attendance…</div>
        ) : error ? (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : attendanceFetchedAt === '' ? (
          <div role="status" className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Attendance has not been synced from Microsoft Teams yet. The sync job runs every 5 minutes and typically completes within 10 minutes of a meeting ending.
            {attendanceFetchError ? (
              <p className="mt-2 text-xs text-amber-700">Last sync error: {attendanceFetchError}</p>
            ) : null}
          </div>
        ) : attendance.length === 0 ? (
          <div role="status" className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            No attendance records for this session — no participants joined, or Teams did not return any.
          </div>
        ) : (
          <>
            <p className="-mt-2 text-xs text-gray-500">
              Synced {formatDate(attendanceFetchedAt)} · {attendance.length} participant{attendance.length === 1 ? '' : 's'}
            </p>
            <div className="max-h-[50vh] overflow-auto rounded-md border border-gray-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  <tr>
                    <th scope="col" className="px-3 py-2">Name</th>
                    <th scope="col" className="px-3 py-2">Email</th>
                    <th scope="col" className="px-3 py-2">Role</th>
                    <th scope="col" className="px-3 py-2 text-right">Time (mins)</th>
                    <th scope="col" className="px-3 py-2 text-right">Attended %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attendance.map((a) => {
                    const name = asString(a.user_name) || asString(a.display_name) || asString(a.email);
                    const email = asString(a.email);
                    const role = asString(a.role) || 'Attendee';
                    const minutes = Math.round(asNumber(a.total_seconds) / 60);
                    const pct = a.percent_attended === null ? null : asNumber(a.percent_attended);
                    return (
                      <tr key={asString(a.id)} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900">{name}</td>
                        <td className="px-3 py-2 text-gray-600">{email}</td>
                        <td className="px-3 py-2 text-gray-600">{role}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-900">{minutes}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {pct !== null ? (
                            <span className={pct >= 80 ? 'text-emerald-600 font-semibold' : pct >= 50 ? 'text-amber-600' : 'text-gray-500'}>
                              {pct.toFixed(1)}%
                            </span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ASSIGNMENTS TAB — 2-panel layout with sub-tabs
   ═══════════════════════════════════════════════════════════════════ */
function AssignmentsTab({
  assignments,
  cohortName,
  api,
  token,
  onAddClick,
  onEditClick,
  onGradeClick,
  onReload: _onReload,
}: {
  assignments: Record<string, unknown>[];
  cohortName: string;
  api: AdminPageProps['api'];
  token: string;
  onAddClick: () => void;
  onEditClick: (assignment: Record<string, unknown>) => void;
  onGradeClick: (submission: Record<string, unknown>, assignmentMarks: number) => void;
  onReload: () => void;
}) {
  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState(0);
  const [submissionsData, setSubmissionsData] = useState<Record<string, unknown> | null>(null);
  const [loadingSubs, setLoadingSubs] = useState(false);

  const selected = useMemo(
    () => assignments.find((a) => (asString(a.id) || asString(a._id)) === selectedId) || null,
    [assignments, selectedId],
  );

  useEffect(() => {
    if (selectedId && (subTab === 1 || subTab === 2)) {
      setLoadingSubs(true);
      api
        .loadCohortAssignmentSubmissions(token, selectedId)
        .then((d) => setSubmissionsData(d))
        .catch(() => setSubmissionsData(null))
        .finally(() => setLoadingSubs(false));
    }
  }, [selectedId, subTab, api, token]);

  const submissions = useMemo(() => toRecords(submissionsData?.submissions), [submissionsData]);
  const unsubmitted = useMemo(() => toRecords(submissionsData?.unsubmitted), [submissionsData]);

  const handleDeleteSubFile = useCallback(
    async (submissionId: string) => {
      if (!(await confirm({
        title: 'Delete this submission file?',
        description: 'This action cannot be undone.',
        confirmText: 'Delete',
        variant: 'destructive',
      }))) return;
      try {
        await api.deleteAssignmentSubmission(token, submissionId);
        if (selectedId) {
          const fresh = await api.loadCohortAssignmentSubmissions(token, selectedId);
          setSubmissionsData(fresh);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete file');
      }
    },
    [api, token, selectedId, confirm],
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Left panel — assignment cards */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Assignments</CardTitle>
            <Button size="sm" onClick={onAddClick} className="rounded-full bg-ttii-primary hover:bg-ttii-primary/90">
              <Plus className="mr-1 size-3" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {assignments.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No assignments.</p>
          ) : (
            assignments.map((a) => {
              const id = asString(a.id) || asString(a._id);
              const isSelected = id === selectedId;
              return (
                <button
                  key={id}
                  type="button"
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    isSelected ? 'border-ttii-primary bg-ttii-primary/5' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setSelectedId(id);
                    setSubTab(0);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{asString(a.title)}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                        <span className="font-medium">Description:</span> {asString(a.description) || '-'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      aria-label="Edit assignment"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditClick(a);
                      }}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </button>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Right panel — assignment detail */}
      <Card className="lg:col-span-2">
        <CardContent className="p-6">
          {!selected ? (
            <p className="py-12 text-center text-sm text-gray-400">Select an assignment to view details.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{asString(selected.title)}</h3>
                <p className="text-xs text-gray-500">Cohort: {cohortName}</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-gray-500">Deadline</p>
                    <p className="text-sm font-medium">{formatDate(selected.due_date) || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Marks</p>
                    <p className="text-sm font-medium">{asString(selected.total_marks) || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">File</p>
                    {asString(selected.attachment) ? (
                      <a
                        href={asString(selected.attachment)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                      >
                        <Download className="size-3" /> Download
                      </a>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-1 border-b border-gray-200">
                {ASSIGNMENT_SUB_TABS.map((label, idx) => (
                  <button
                    key={label}
                    type="button"
                    className={`relative px-4 py-2 text-sm font-medium ${
                      subTab === idx ? 'text-ttii-primary' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setSubTab(idx)}
                  >
                    {label}
                    {subTab === idx ? (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ttii-primary" />
                    ) : null}
                  </button>
                ))}
              </div>

              {/* Sub-tab content */}
              {subTab === 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ttii-primary">Instructions</p>
                  <div
                    className="prose prose-sm max-w-none text-sm text-gray-700"
                    dangerouslySetInnerHTML={{ __html: asString(selected.instructions) || '<p class="text-gray-400">No instructions.</p>' }}
                  />
                </div>
              )}

              {subTab === 1 && (
                <div>
                  {loadingSubs ? (
                    <p className="py-4 text-center text-sm text-gray-400">Loading submissions...</p>
                  ) : submissions.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-400">No submissions yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-2 text-left">#</th>
                            <th className="px-2 py-2 text-left">Student ID</th>
                            <th className="px-2 py-2 text-left">Student</th>
                            <th className="px-2 py-2 text-left">Submission Date</th>
                            <th className="px-2 py-2 text-left">Score</th>
                            <th className="px-2 py-2 text-left">Remarks</th>
                            <th className="px-2 py-2 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {submissions.map((sub, idx) => (
                            <tr key={asString(sub.id) || idx} className="border-t border-gray-100">
                              <td className="px-2 py-2">{idx + 1}</td>
                              <td className="px-2 py-2">{asString(sub.student_id)}</td>
                              <td className="px-2 py-2">
                                <div className="flex items-center gap-2">
                                  <Avatar className="size-6">
                                    {asString(sub.image) ? <AvatarImage src={asString(sub.image)} alt="" /> : null}
                                    <AvatarFallback className="bg-ttii-primary text-[9px] text-white">
                                      {(asString(sub.student_name) || 'S').charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium uppercase">{asString(sub.student_name)}</span>
                                </div>
                              </td>
                              <td className="px-2 py-2">{formatDate(sub.submitted_at) || '-'}</td>
                              <td className="px-2 py-2">{asString(sub.marks) || '-'}</td>
                              <td className="px-2 py-2 max-w-[150px] truncate">{asString(sub.remarks) || '-'}</td>
                              <td className="px-2 py-2">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    title="Grade"
                                    aria-label="Grade submission"
                                    onClick={() => onGradeClick(sub, asNumber(selected.total_marks))}
                                  >
                                    <Pencil className="size-3 text-blue-600" aria-hidden="true" />
                                  </Button>
                                  {asString(sub.file) ? (
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      title="View File"
                                      aria-label="View submission file"
                                      onClick={() => window.open(asString(sub.file), '_blank')}
                                    >
                                      <FileText className="size-3 text-gray-600" aria-hidden="true" />
                                    </Button>
                                  ) : null}
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    title="Delete"
                                    aria-label="Delete submission"
                                    onClick={() => void handleDeleteSubFile(asString(sub.id))}
                                  >
                                    <Trash2 className="size-3 text-red-500" aria-hidden="true" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {subTab === 2 && (
                <div>
                  {loadingSubs ? (
                    <p className="py-4 text-center text-sm text-gray-400">Loading...</p>
                  ) : unsubmitted.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-400">All students have submitted.</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-2 text-left">#</th>
                          <th className="px-2 py-2 text-left">Student ID</th>
                          <th className="px-2 py-2 text-left">Student</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unsubmitted.map((u, idx) => (
                          <tr key={asString(u.id) || idx} className="border-t border-gray-100">
                            <td className="px-2 py-2">{idx + 1}</td>
                            <td className="px-2 py-2">{asString(u.student_id)}</td>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="size-6">
                                  {asString(u.image) ? <AvatarImage src={asString(u.image)} alt="" /> : null}
                                  <AvatarFallback className="bg-ttii-primary text-[9px] text-white">
                                    {(asString(u.name) || 'S').charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium uppercase">{asString(u.name)}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ANNOUNCEMENTS TAB — table with add/edit/delete
   ═══════════════════════════════════════════════════════════════════ */
function AnnouncementsTab({
  announcements,
  api,
  token,
  onAddClick,
  onEditClick,
  onReload,
}: {
  announcements: Record<string, unknown>[];
  api: AdminPageProps['api'];
  token: string;
  onAddClick: () => void;
  onEditClick: (announcement: Record<string, unknown>) => void;
  onReload: () => void;
}) {
  const confirm = useConfirm();
  const handleDelete = useCallback(
    async (a: Record<string, unknown>) => {
      const id = asString(a.id) || asString(a._id);
      if (!(await confirm({
        title: 'Delete this announcement?',
        description: 'This action cannot be undone.',
        confirmText: 'Delete',
        variant: 'destructive',
      }))) return;
      try {
        await api.deleteCohortAnnouncement(token, id);
        onReload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete announcement');
      }
    },
    [api, token, onReload, confirm],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="size-4 text-ttii-primary" />
            Announcements ({announcements.length})
          </CardTitle>
          <Button onClick={onAddClick} className="rounded-full bg-ttii-primary hover:bg-ttii-primary/90">
            <Plus className="mr-1 size-4" /> Add Announcement
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {announcements.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No announcements posted.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Content</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Description</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((a, idx) => (
                  <tr key={asString(a.id) || idx} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium">{asString(a.title)}</td>
                    <td className="px-4 py-3">{asString(a.content)}</td>
                    <td className="px-4 py-3 max-w-[300px] truncate">{asString(a.description) || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label="Edit announcement" onClick={() => onEditClick(a)} title="Edit">
                          <Pencil className="size-3.5 text-blue-600" aria-hidden="true" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label="Delete announcement" onClick={() => void handleDelete(a)} title="Delete">
                          <Trash2 className="size-3.5 text-red-500" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODALS
   ═══════════════════════════════════════════════════════════════════ */

function AddLearnerModal({
  open, onClose, api, token, cohortId, submitting, setSubmitting, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  api: AdminPageProps['api'];
  token: string;
  cohortId: string;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [available, setAvailable] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .loadAvailableLearners(token, cohortId)
      .then(setAvailable)
      .catch(() => setAvailable([]))
      .finally(() => setLoading(false));
  }, [api, token, cohortId]);

  const filtered = useMemo(() => {
    if (!search) return available;
    const q = search.toLowerCase();
    return available.filter((s) => asString(s.name).toLowerCase().includes(q));
  }, [available, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((s) => asString(s.id) || asString(s._id))));
    }
  };

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      await api.addCohortLearners(token, cohortId, Array.from(selected));
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add learners');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
        <DialogHeader>
          <DialogTitle>Add Learner</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
          />
          <p className="text-xs text-gray-500">{selected.size} Students selected</p>
          {loading ? (
            <p className="py-6 text-center text-sm text-gray-400">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No available students.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto rounded border border-gray-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={selected.size === filtered.length && filtered.length > 0}
                        onChange={toggleAll}
                      />
                      <span className="ml-2 text-xs font-semibold">Select All</span>
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">No</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">Students</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, idx) => {
                    const id = asString(s.id) || asString(s._id);
                    return (
                      <tr key={id} className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selected.has(id)}
                            onChange={() => toggle(id)}
                          />
                        </td>
                        <td className="px-3 py-2 text-xs">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-7">
                              {asString(s.image) ? <AvatarImage src={asString(s.image)} alt="" /> : null}
                              <AvatarFallback className="bg-ttii-primary text-[9px] text-white">
                                {(asString(s.name) || 'S').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium">{asString(s.name)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            disabled={submitting || selected.size === 0}
            className="bg-ttii-primary hover:bg-ttii-primary/90"
          >
            {submitting ? 'Assigning...' : 'Assign Selected'}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddLiveSessionModal({
  open, onClose, api, token, cohortId, submitting, setSubmitting, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  api: AdminPageProps['api'];
  token: string;
  cohortId: string;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [platform, setPlatform] = useState<'teams' | 'zoom' | 'manual'>('teams');
  const [teamsHosts, setTeamsHosts] = useState<Array<{ id: number; email: string; name: string; active: boolean; verified: boolean }>>([]);
  const [teamsHostEmail, setTeamsHostEmail] = useState('');
  const [manualJoinUrl, setManualJoinUrl] = useState('');
  const [zoomId, setZoomId] = useState('');
  const [password, setPassword] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [isRepetitive, setIsRepetitive] = useState(false);

  // Load Teams hosts when Teams platform is selected
  useEffect(() => {
    if (!open || platform !== 'teams') return;
    let cancelled = false;
    void (async () => {
      try {
        const hosts = await api.listTeamsMeetingHosts(token);
        if (cancelled) return;
        const normalized = hosts.map((h) => ({
          id: Number(h.id),
          email: String(h.teams_email),
          name: h.display_name ? String(h.display_name) : String(h.teams_email),
          active: h.is_active === 1,
          verified: !!h.policy_verified_at,
        })).filter((h) => h.active);
        setTeamsHosts(normalized);
        if (normalized.length > 0 && !teamsHostEmail) {
          setTeamsHostEmail(normalized[0]?.email ?? '');
        }
      } catch { /* ignore, user will see empty dropdown */ }
    })();
    return () => { cancelled = true; };
  }, [api, token, open, platform, teamsHostEmail]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload: Parameters<typeof api.addCohortLiveSession>[2] = {
        sessionId, title, date, fromTime, toTime, isRepetitive, platform,
      };
      if (platform === 'teams') {
        if (!teamsHostEmail) { toast.error('Pick a trainer for the Teams meeting.'); setSubmitting(false); return; }
        payload.teamsHostEmail = teamsHostEmail;
      } else if (platform === 'manual') {
        if (!manualJoinUrl.trim()) { toast.error('Paste the meeting link.'); setSubmitting(false); return; }
        payload.manualJoinUrl = manualJoinUrl.trim();
      } else if (platform === 'zoom') {
        payload.zoomId = zoomId;
        payload.password = password;
      }
      const result = await api.addCohortLiveSession(token, cohortId, payload);
      const success = result.success === true || result.success === 1 || result.status === 1;
      if (!success) {
        toast.error((result.message as string) || 'Failed to add session');
        setSubmitting(false);
        return;
      }
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add session');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
        <DialogHeader>
          <DialogTitle>Add Live Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="mb-1 text-xs">Platform *</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as 'teams' | 'zoom' | 'manual')}
            >
              <option value="teams">Microsoft Teams (auto-create)</option>
              <option value="manual">Manual link (Teams / Zoom / Meet / etc.)</option>
              <option value="zoom">Zoom (legacy)</option>
            </select>
          </div>

          {platform === 'teams' && (
            <div>
              <Label className="mb-1 text-xs">Trainer (Teams host) *</Label>
              {teamsHosts.length === 0 ? (
                <p className="text-xs text-amber-700">
                  No Teams meeting hosts configured. Ask an admin to add trainers under
                  <span className="font-semibold"> Integrations → Teams Meeting Hosts</span>.
                </p>
              ) : (
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={teamsHostEmail}
                  onChange={(e) => setTeamsHostEmail(e.target.value)}
                >
                  {teamsHosts.map((h) => (
                    <option key={h.id} value={h.email}>
                      {h.name}{h.verified ? ' — verified' : ' — not yet tested'}
                    </option>
                  ))}
                </select>
              )}
              <p className="mt-1 text-[11px] text-gray-500">Meeting will be created on the trainer's Teams calendar via Microsoft Graph.</p>
            </div>
          )}

          {platform === 'manual' && (
            <div>
              <Label className="mb-1 text-xs">Meeting Link *</Label>
              <Input
                value={manualJoinUrl}
                onChange={(e) => setManualJoinUrl(e.target.value)}
                placeholder="https://teams.microsoft.com/l/... or Zoom/Meet URL"
              />
              <p className="mt-1 text-[11px] text-gray-500">Trainer creates the meeting manually and pastes the join link here.</p>
            </div>
          )}

          {platform === 'zoom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 text-xs">Zoom ID</Label>
                <Input value={zoomId} onChange={(e) => setZoomId(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1 text-xs">Password</Label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
          )}

          <p className="text-xs font-semibold text-gray-500">Live Class Entry #1</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 text-xs">Session ID *</Label>
              <Input value={sessionId} onChange={(e) => setSessionId(e.target.value)} placeholder="LS-1181" />
            </div>
            <div>
              <Label className="mb-1 text-xs">Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1 text-xs">Date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1 text-xs">From Time *</Label>
              <Input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1 text-xs">To Time *</Label>
              <Input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} />
            </div>
            <label className="flex items-end gap-2 text-xs">
              <input
                type="checkbox"
                checked={isRepetitive}
                onChange={(e) => setIsRepetitive(e.target.checked)}
                className="size-4"
              />
              Is Repetitive?
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            disabled={submitting || !sessionId || !title || !date || !fromTime || !toTime}
            className="bg-ttii-primary hover:bg-ttii-primary/90"
          >
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditRecordingModal({
  open, onClose, api, token, sessionId, initialLink, submitting, setSubmitting, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  api: AdminPageProps['api'];
  token: string;
  sessionId: string;
  initialLink: string;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [link, setLink] = useState(initialLink);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.updateLiveSessionRecording(token, sessionId, link);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save recording link');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit Recorded link</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="mb-1 text-xs">Vimeo Link *</Label>
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://vimeo.com/..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={submitting || !link}
              className="bg-ttii-primary hover:bg-ttii-primary/90"
            >
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AssignmentModal({
  open, onClose, api, token, cohortId, assignment, submitting, setSubmitting, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  api: AdminPageProps['api'];
  token: string;
  cohortId: string;
  assignment: Record<string, unknown> | null;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    if (assignment) {
      setTitle(asString(assignment.title));
      setDescription(asString(assignment.description));
      setTotalMarks(asString(assignment.total_marks));
      setDueDate(asString(assignment.due_date));
      setFromTime(asString(assignment.from_time));
      setDueTime(asString(assignment.due_time));
      setInstructions(asString(assignment.instructions));
    }
  }, [assignment]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (assignment) {
        const id = asString(assignment.id) || asString(assignment._id);
        await api.editCohortAssignment(token, id, {
          title, description, total_marks: totalMarks, due_date: dueDate,
          from_time: fromTime, due_time: dueTime, instructions,
        });
      } else {
        await api.addCohortAssignment(token, cohortId, {
          title, description, totalMarks, dueDate, fromTime, dueTime, instructions,
        });
      }
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save assignment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
        <DialogHeader>
          <DialogTitle>{assignment ? 'Edit Assignment' : 'Add Assignment'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="mb-1 text-xs">Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 text-xs">Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 text-xs">Total Marks</Label>
              <Input value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} type="number" />
            </div>
            <div>
              <Label className="mb-1 text-xs">Due Date *</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1 text-xs">From Time</Label>
              <Input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1 text-xs">Due Time</Label>
              <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="mb-1 text-xs">Instructions</Label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            disabled={submitting || !title || !dueDate}
            className="bg-ttii-primary hover:bg-ttii-primary/90"
          >
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GradeSubmissionModal({
  open, onClose, api, token, submission, assignmentMarks, submitting, setSubmitting, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  api: AdminPageProps['api'];
  token: string;
  submission: Record<string, unknown>;
  assignmentMarks: number;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [marks, setMarks] = useState(asString(submission.marks));
  const [remarks, setRemarks] = useState(asString(submission.remarks));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const id = asString(submission.id) || asString(submission._id);
      await api.gradeAssignmentSubmission(token, id, marks, remarks);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save grade');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit Remarks</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="mb-1 text-xs">Marks * <span className="text-gray-400">(Assignment Mark: {assignmentMarks})</span></Label>
              <Input type="number" value={marks} onChange={(e) => setMarks(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1 text-xs">Remarks *</Label>
              <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={submitting || !marks || !remarks}
              className="bg-ttii-primary hover:bg-ttii-primary/90"
            >
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AnnouncementModal({
  open, onClose, api, token, cohortId, announcement, submitting, setSubmitting, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  api: AdminPageProps['api'];
  token: string;
  cohortId: string;
  announcement: Record<string, unknown> | null;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (announcement) {
      setTitle(asString(announcement.title));
      setContent(asString(announcement.content));
      setDescription(asString(announcement.description));
    } else {
      setTitle('');
      setContent('');
      setDescription('');
    }
  }, [announcement]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (announcement) {
        const id = asString(announcement.id) || asString(announcement._id);
        await api.editCohortAnnouncement(token, id, { title, content, description });
      } else {
        await api.addCohortAnnouncement(token, cohortId, { title, content, description });
      }
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save announcement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
        <DialogHeader>
          <DialogTitle>{announcement ? 'Edit Announcement' : 'Add Announcement'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="mb-1 text-xs">Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 text-xs">Content *</Label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div>
            <Label className="mb-1 text-xs">Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            disabled={submitting || !title || !content}
            className="bg-ttii-primary hover:bg-ttii-primary/90"
          >
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
