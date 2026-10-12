import { CheckCircle2, ClipboardList, FileSignature, ListChecks, PencilLine, PlayCircle, ScrollText, Users, Video } from 'lucide-react';
import { AdminDataTable, type DataTableColumn } from '../../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../../shared/components/AdminStatusBadge.js';
import { Pill } from '../../../shared/components/ui-kit.js';
import { asNumber, asString, formatDate, toRecords } from '../../../shared/utils/admin-data-utils.js';
import { formatDuration, initials, recentCount, subjectProgress, type Pace } from './student-view-model.js';
import { EmptyLine, InfoRow, Panel, SectionHeader, StatCard } from './student-view-ui.js';

// Enrollments → sub-tab bodies (Application Details, Learning Progress, Quiz,
// Live Class, Cohort, Assignment, Examination). Same data and columns as the
// old page; Learning Progress uses Naji's StatCard + SubjectProgress.

const DAY_MS = 24 * 60 * 60 * 1000;
const PACE_CLASS: Record<Pace, string> = {
  Ahead: 'bg-success-soft text-success',
  'On track': 'bg-primary/10 text-primary',
  Behind: 'bg-warning-soft text-warning-foreground',
};

export function ApplicationDetails({ student }: { student: Record<string, unknown> }) {
  const s = (k: string) => asString(student[k]);
  return (
    <Panel>
      <SectionHeader icon={ScrollText} title="Application Details" description="How this student was admitted" />
      <div className="grid gap-x-8 md:grid-cols-2">
        <div>
          <InfoRow label="Application ID" value={s('application_id')} />
          <InfoRow label="Application Date" value={formatDate(student.application_date)} />
          <InfoRow label="Application Status" value={s('application_status')} />
          <InfoRow label="Mode of Study" value={s('mode_of_study')} />
          <InfoRow label="Preferred Language" value={s('language_name') || s('preferred_language')} />
        </div>
        <div>
          <InfoRow label="Pipeline" value={s('pipeline')} />
          <InfoRow label="Pipeline User" value={s('pipeline_user_name') || s('pipeline_user')} />
          <InfoRow label="Lead Source" value={s('lead_source')} />
          <InfoRow label="Referred By (Student)" value={s('reference_student_id')} />
          <InfoRow label="Certificate Combination" value={s('certificate_combination_code') || s('certificate_combination_id')} />
        </div>
      </div>
    </Panel>
  );
}

export function LearningProgress({
  videoProgress, materialProgress, assignmentSubmissions, onViewReport,
}: {
  videoProgress: Record<string, unknown>[];
  materialProgress: Record<string, unknown>[];
  assignmentSubmissions: Record<string, unknown>[];
  onViewReport: () => void;
}) {
  const now = Date.now();
  const subjects = subjectProgress(videoProgress);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={PlayCircle} label="Videos watched" value={videoProgress.length} delta={{ count: recentCount(videoProgress, now - 7 * DAY_MS), label: 'this week' }} tint="primary" />
        <StatCard icon={CheckCircle2} label="Materials completed" value={materialProgress.length} delta={{ count: recentCount(materialProgress, now - 7 * DAY_MS), label: 'this week' }} tint="success" />
        <StatCard icon={ClipboardList} label="Assignments submitted" value={assignmentSubmissions.length} delta={{ count: recentCount(assignmentSubmissions, now - DAY_MS), label: 'today' }} tint="info" />
      </div>
      {subjects.length > 0 ? (
        <Panel>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-foreground">Subject progress</h3>
              <p className="text-xs text-muted-foreground">Lesson completion across enrolled subjects</p>
            </div>
            <button type="button" onClick={onViewReport} className="text-xs font-medium text-primary hover:underline">View report →</button>
          </div>
          <div className="space-y-5">
            {subjects.map((s) => (
              <div key={s.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{s.title}</p>
                    <p className="text-[11px] text-muted-foreground">{s.completedLessons} / {s.totalLessons} lessons</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PACE_CLASS[s.pace]}`}>{s.pace}</span>
                    <span className="text-xs font-semibold tabular-nums text-foreground">{s.pct}%</span>
                  </div>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-[image:var(--gradient-primary)] transition-all" style={{ width: `${Math.min(s.pct, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function TablePanel({
  icon, title, rows, columns, empty,
}: { icon: typeof Video; title: string; rows: Record<string, unknown>[]; columns: DataTableColumn[]; empty: string }) {
  return (
    <Panel>
      <SectionHeader icon={icon} title={title} />
      {rows.length > 0 ? <AdminDataTable columns={columns} rows={rows} searchable={false} exportable={false} /> : <EmptyLine>{empty}</EmptyLine>}
    </Panel>
  );
}

export function QuizHistory({ rows }: { rows: Record<string, unknown>[] }) {
  return (
    <TablePanel
      icon={ListChecks}
      title="Quiz History"
      rows={rows}
      empty="No quiz attempts found."
      columns={[
        { key: 'lesson_label', label: 'Lesson', render: (v) => asString(v) || '-' },
        { key: 'lesson_file_id', label: 'Quiz File ID', render: (v) => asString(v) || '-' },
        { key: 'score', label: 'Score', render: (v) => asString(v) || '-' },
        { key: 'correct', label: 'Correct', render: (v) => asString(v) || '-' },
        { key: 'incorrect', label: 'Incorrect', render: (v) => asString(v) || '-' },
        { key: 'skip', label: 'Skipped', render: (v) => asString(v) || '-' },
        { key: 'completed', label: 'Status', render: (v) => <AdminStatusBadge status={v ? 'Completed' : 'In Progress'} /> },
        { key: 'created_at', label: 'Attempted', render: (v) => formatDate(v) },
      ]}
    />
  );
}

export function LiveClassAttendance({ rows }: { rows: Record<string, unknown>[] }) {
  return (
    <TablePanel
      icon={Video}
      title="Live Class Attendance"
      rows={rows}
      empty="No live class attendance recorded."
      columns={[
        { key: 'live_class_title', label: 'Session', render: (v) => asString(v) || '-' },
        { key: 'live_class_date', label: 'Date', render: (v) => formatDate(v) },
        { key: 'platform', label: 'Platform', render: (v) => asString(v) || '-' },
        { key: 'total_seconds', label: 'Duration', render: (v) => formatDuration(asNumber(v)) },
        { key: 'percent_attended', label: 'Attendance', render: (v) => { const pct = asNumber(v); return pct ? `${pct}%` : '-'; } },
        { key: 'first_joined_at', label: 'Joined', render: (v) => formatDate(v) },
      ]}
    />
  );
}

export function AssignmentTable({ rows }: { rows: Record<string, unknown>[] }) {
  return (
    <TablePanel
      icon={PencilLine}
      title="Assignments"
      rows={rows}
      empty="No assignment submissions found."
      columns={[
        { key: 'subject_title', label: 'Subject', render: (v) => asString(v) || '-' },
        { key: 'assignment_title', label: 'Title', render: (v, row) => asString(v) || asString(row.assignment_id) || '-' },
        { key: 'total_marks', label: 'Total Marks', render: (v) => asString(v) || '-' },
        { key: 'due_date', label: 'Due Date', render: (v) => formatDate(v) },
        { key: 'created_at', label: 'Submitted', render: (v) => formatDate(v) },
        { key: 'marks', label: 'Marks Received', render: (v) => asString(v) || '-' },
        { key: 'remarks', label: 'Feedback', render: (v) => asString(v) || '-' },
      ]}
    />
  );
}

export function ExaminationTable({ rows }: { rows: Record<string, unknown>[] }) {
  return (
    <TablePanel
      icon={FileSignature}
      title="Examination"
      rows={rows}
      empty="No examination attempts found."
      columns={[
        { key: 'exam_code', label: 'Exam Code', render: (v) => asString(v) || '-' },
        { key: 'exam_title', label: 'Exam', render: (v) => asString(v) || '-' },
        { key: 'attempt_count', label: 'Attempt', render: (v) => asString(v) || '-' },
        {
          key: 'score', label: 'Score',
          render: (v, row) => {
            const score = asNumber(v);
            const max = asNumber(row.max_marks);
            if (!score && !max) return '-';
            return max ? `${score} / ${max}` : String(score);
          },
        },
        { key: 'correct', label: 'Correct', render: (v) => asString(v) || '-' },
        { key: 'incorrect', label: 'Incorrect', render: (v) => asString(v) || '-' },
        { key: 'submit_status', label: 'Status', render: (v) => <AdminStatusBadge status={v ? 'Submitted' : 'In Progress'} /> },
        { key: 'end_time', label: 'Submitted', render: (v) => formatDate(v) },
      ]}
    />
  );
}

export function CohortCards({ enrolment }: { enrolment: Record<string, unknown> }) {
  const cohorts = toRecords(enrolment.cohorts);
  return (
    <Panel>
      <SectionHeader icon={Users} title="Cohorts" description={`Subjects this student is grouped into for ${asString(enrolment.course_title) || 'this course'}.`} />
      {cohorts.length === 0 ? (
        <EmptyLine>Not assigned to any cohort for this course yet.</EmptyLine>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {cohorts.map((c, idx) => {
            const instructorName = asString(c.instructor_name);
            const instructorPhoto = asString(c.instructor_photo);
            const status = asString(c.status) || 'Active';
            return (
              <div key={asString(c.id) + idx} className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-[var(--shadow-soft)]">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{asString(c.cohort_code) || `C${asString(c.id)}`}</p>
                    <p className="line-clamp-2 break-words text-sm font-semibold text-foreground">{asString(c.subject_title) || asString(c.title) || 'Subject TBD'}</p>
                  </div>
                  <AdminStatusBadge status={status} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div><p className="text-[10px] uppercase tracking-wide">Start</p><p className="text-foreground">{formatDate(c.start_date) || '-'}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wide">End</p><p className="text-foreground">{formatDate(c.end_date) || '-'}</p></div>
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                  <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                    {instructorPhoto ? <img src={instructorPhoto} alt="" className="size-full object-cover" /> : <span>{initials(instructorName)}</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">{instructorName || 'Instructor not assigned'}</p>
                    <p className="text-[10px] text-muted-foreground">Instructor</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

export function EnrolmentStatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const tone = s === 'active' ? 'emerald' : s === 'dropout' ? 'rose' : s === 'on hold' ? 'amber' : s === 'graduated' ? 'blue' : s === 'completed' ? 'primary' : 'slate';
  return <Pill tone={tone}>{status}</Pill>;
}
