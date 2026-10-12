import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, ExternalLink, Pencil, Search, Users, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, asString, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';
import { StatBox } from '../../shared/components/ui-kit.js';
import { ProfileTabs, type TabItem } from '../students/student-view/student-view-ui.js';
import { pageSlice } from '../cohorts/list-model.js';
import { ExportButtons, Pager } from '../cohorts/list-ui.js';
import { toCombinationRows, toPartnerRows } from '../certificates/partner-model.js';
import { Chip, PartnerLogo, StatusPill } from '../certificates/partner-ui.js';
import { PartnerFormDialog } from '../certificates/PartnerFormDialog.js';
import {
  combinationCount,
  courseCsvRows,
  filterPartnerStudents,
  studentCsvRows,
  studentStatuses,
  toPartnerCourses,
  toPartnerStudents,
  type StudentFilters,
} from './partner-detail-model.js';

// Partner page (Naji UAT 2026-05-22), restyled after Naji's PartnerProfile
// (TTII 2026-10-12): header card with Edit, stat tiles, underline tabs —
// Courses / Students / Liability — from the same detail endpoint. Naji's
// Payments and Certificates tabs, Record Payment and Deactivate are not here:
// partner payments and issued certificates have no tables yet.

const TABS: TabItem[] = [
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'liability', label: 'Liability', icon: Wallet },
];
const PAGE_SIZE = 10;
const SELECT_CLASS = 'h-9 rounded-md border border-input bg-background px-3 text-sm';

export default function ViewPartnerPage({ api, session, onNavigate }: AdminPageProps) {
  const partnerId = useMemo(() => {
    const segments = window.location.pathname.split('/');
    return segments[segments.length - 1] || '';
  }, []);
  const [tab, setTab] = useState('courses');
  const [editOpen, setEditOpen] = useState(false);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.getCertificationPartnerDetail(session.token, partnerId),
    [partnerId],
  );
  // The partner list feeds the Edit dialog (duplicate code / name check).
  const { data: partnerRows } = useAdminPageData(async () => {
    const [partners, combos] = await Promise.all([
      api.listCertificationPartners(session.token),
      api.listCertificateCombinations(session.token).catch(() => [] as Record<string, unknown>[]),
    ]);
    return toPartnerRows(partners, toCombinationRows(combos));
  }, []);

  const partner = useMemo(() => {
    const p = data?.partner;
    return typeof p === 'object' && p !== null ? (p as Record<string, unknown>) : null;
  }, [data]);
  const courses = useMemo(() => toPartnerCourses(data?.courses), [data]);
  const students = useMemo(() => toPartnerStudents(data?.students), [data]);
  const liability = useMemo(() => {
    const l = data?.liability;
    return typeof l === 'object' && l !== null ? (l as Record<string, unknown>) : null;
  }, [data]);
  const editing = useMemo(() => (partnerRows ?? []).find((p) => p.id === partnerId) ?? null, [partnerRows, partnerId]);

  if (loading) return <PageLoader label="Loading partner details…" />;
  if (error || !partner) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-destructive">
          {error || 'Partner not found.'}
          <div className="mt-4"><Button variant="outline" onClick={() => onNavigate('/admin/certification-partners/index')}>Back to Certification Partners</Button></div>
        </CardContent>
      </Card>
    );
  }

  const name = asString(partner.name);
  const code = asString(partner.partner_code);

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => onNavigate('/admin/certification-partners/index')}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to Certification Partners
      </button>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start gap-5">
          <PartnerLogo logo={asString(partner.logo)} code={code} className="size-20 rounded-xl text-sm" />
          <div className="min-w-64 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{name || '—'}</h1>
              <StatusPill status={asString(partner.status) || 'active'} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Code: <span className="font-mono text-foreground">{code || '—'}</span>
              {' · '}Country: <span className="text-foreground">{asString(partner.country) || '—'}</span>
            </p>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{asString(partner.description) || 'No description added.'}</p>
          </div>
          {editing ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
              <Pencil aria-hidden="true" className="size-4" /> Edit
            </Button>
          ) : null}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatBox label="Courses" value={courses.length} tone="primary" />
        <StatBox label="Students" value={students.length} tone="blue" />
        <StatBox label="Combinations" value={combinationCount(courses)} tone="slate" />
      </div>

      <ProfileTabs tabs={TABS} active={tab} onChange={setTab} label="Partner sections" />

      {tab === 'courses' ? <CoursesTab name={name} code={code} courses={courses} onOpen={(id) => onNavigate(`/admin/course/index?course=${encodeURIComponent(id)}`)} /> : null}
      {tab === 'students' ? <StudentsTab name={name} code={code} students={students} courses={courses} onOpen={(uid) => onNavigate(`/admin/students/view/${uid}`)} /> : null}
      {tab === 'liability' ? <LiabilityTab liability={liability} /> : null}

      <PartnerFormDialog
        open={editOpen}
        editing={editing}
        partners={partnerRows ?? []}
        api={api}
        token={session.token}
        onClose={() => setEditOpen(false)}
        onSaved={() => { setEditOpen(false); reload(); }}
      />
    </div>
  );
}

function TabCard({ title, actions, children }: { title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <h2 className="font-semibold text-foreground">{title}</h2>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>
      {children}
    </Card>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-56">
      <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input aria-label={placeholder} placeholder={placeholder} className="h-9 pl-9" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function CoursesTab({ name, code, courses, onOpen }: {
  name: string; code: string; courses: ReturnType<typeof toPartnerCourses>; onOpen: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const rows = courses.filter((c) => c.title.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <TabCard
      title={`Courses certified by ${name || 'this partner'}`}
      actions={(
        <>
          <SearchInput value={q} onChange={setQ} placeholder="Search courses…" />
          <ExportButtons csvLabel="Export" disabled={rows.length === 0} onCsv={() => downloadCsv(`${code || 'partner'}-courses.csv`, toCsv(courseCsvRows(rows)))} />
        </>
      )}
    >
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{courses.length === 0 ? 'No courses linked to this partner yet.' : 'No courses match.'}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10 text-xs">#</TableHead>
              <TableHead className="text-xs">Course</TableHead>
              <TableHead className="text-xs">Combinations</TableHead>
              <TableHead className="text-xs">Students</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-right text-xs print:hidden">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c, i) => (
              <TableRow key={c.id} className="hover:bg-muted/30">
                <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="text-sm font-medium">{c.title || '—'}</TableCell>
                <TableCell>
                  {c.combinations.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : (
                    <div className="flex flex-wrap gap-1">{c.combinations.map((x) => <Chip key={x.id}>{x.code}</Chip>)}</div>
                  )}
                </TableCell>
                <TableCell className="text-sm font-medium">{c.students}</TableCell>
                <TableCell className="text-sm">{c.type}</TableCell>
                <TableCell className="text-right print:hidden">
                  <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => onOpen(c.id)}>
                    <ExternalLink aria-hidden="true" className="size-3.5" /> Open Course
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </TabCard>
  );
}

function StudentsTab({ name, code, students, courses, onOpen }: {
  name: string;
  code: string;
  students: ReturnType<typeof toPartnerStudents>;
  courses: ReturnType<typeof toPartnerCourses>;
  onOpen: (userId: string) => void;
}) {
  const [filters, setFilters] = useState<StudentFilters>({ search: '', courseId: '', status: '' });
  const [page, setPage] = useState(1);
  const statuses = useMemo(() => studentStatuses(students), [students]);
  const filtered = useMemo(() => filterPartnerStudents(students, filters), [students, filters]);
  const { current, pages, page: safePage } = pageSlice(filtered, page, PAGE_SIZE);
  useEffect(() => { if (page !== safePage) setPage(safePage); }, [page, safePage]);
  const set = (patch: Partial<StudentFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };

  return (
    <TabCard
      title={`Students earning ${name || 'this partner'} certification`}
      actions={(
        <>
          <SearchInput value={filters.search} onChange={(search) => set({ search })} placeholder="Search student…" />
          <select aria-label="Course" className={`${SELECT_CLASS} w-48`} value={filters.courseId} onChange={(e) => set({ courseId: e.target.value })}>
            <option value="">All Courses</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <select aria-label="Status" className={`${SELECT_CLASS} w-36`} value={filters.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="">All Statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <ExportButtons
            csvLabel="Export"
            disabled={filtered.length === 0}
            onCsv={() => downloadCsv(`${code || 'partner'}-students.csv`, toCsv(studentCsvRows(filtered, formatDate)))}
          />
        </>
      )}
    >
      {current.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{students.length === 0 ? 'No active enrolments in the linked courses.' : 'No students match.'}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10 text-xs">#</TableHead>
              <TableHead className="text-xs">Student</TableHead>
              <TableHead className="text-xs">Student ID</TableHead>
              <TableHead className="text-xs">Enrollment ID</TableHead>
              <TableHead className="text-xs">Course</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Enrolled</TableHead>
              <TableHead className="text-right text-xs print:hidden">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {current.map((s, i) => (
              <TableRow key={s.key} className="hover:bg-muted/30">
                <TableCell className="text-xs text-muted-foreground">{(safePage - 1) * PAGE_SIZE + i + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {s.image ? (
                      <img loading="lazy" decoding="async" src={s.image} alt="" className="size-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{s.name.trim().charAt(0).toUpperCase() || '?'}</div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{s.name || '—'}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{s.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{s.studentId || '—'}</TableCell>
                <TableCell className="font-mono text-xs">{s.enrollmentId || '—'}</TableCell>
                <TableCell className="text-sm">{s.course || '—'}</TableCell>
                <TableCell><AdminStatusBadge status={s.status} /></TableCell>
                <TableCell className="whitespace-nowrap text-sm">{formatDate(s.enrolledOn) || '—'}</TableCell>
                <TableCell className="text-right print:hidden">
                  {s.userId ? <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onOpen(s.userId)}>View Student</Button> : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Pager page={safePage} pages={pages} shown={current.length} total={filtered.length} noun="students" onPage={setPage} />
    </TabCard>
  );
}

function LiabilityTab({ liability }: { liability: Record<string, unknown> | null }) {
  const inr = (v: unknown) => `₹${asNumber(v).toLocaleString('en-IN')}`;
  return (
    <TabCard title="Liability Summary">
      <div className="space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <StatBox label="Total Courses" value={asNumber(liability?.total_courses)} tone="slate" />
          <StatBox label="Total Students" value={asNumber(liability?.total_students)} tone="slate" />
          <StatBox label="Currency" value={asString(liability?.currency) || 'INR'} tone="slate" />
          <StatBox label="Per-Student Amount" value={inr(liability?.per_student_amount)} tone="slate" />
          <StatBox label="Gross Liability" value={inr(liability?.gross_liability)} tone="slate" />
          <StatBox label="Paid to Partner" value={inr(liability?.paid_to_partner)} tone="emerald" />
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">Outstanding Liability</p>
          <p className="mt-1 text-3xl font-bold text-amber-900">{inr(liability?.outstanding)}</p>
          <p className="mt-1 text-xs text-amber-700">{asString(liability?.note) || 'Awaiting partner contract terms.'}</p>
        </div>
        <a
          href="mailto:naji@teachersindia.in?subject=Confirm%20liability%20terms%20for%20partner"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <ExternalLink aria-hidden="true" className="size-3" /> Confirm contract terms to enable the calculations
        </a>
      </div>
    </TabCard>
  );
}
