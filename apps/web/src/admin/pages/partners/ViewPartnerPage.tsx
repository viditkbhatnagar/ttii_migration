import { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Users, Wallet, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

// Naji UAT 2026-05-22 — Partner View detail page. Surfaces the partner
// header (logo / name / code / country / status / description) plus
// three tabs: Courses (every course this partner certifies), Students
// (every enrolment in those courses), and Liability (financial
// summary — placeholder until contract terms are confirmed).
const TABS = [
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'liability', label: 'Liability', icon: Wallet },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ViewPartnerPage({ api, session, onNavigate }: AdminPageProps) {
  const partnerId = useMemo(() => {
    const segments = window.location.pathname.split('/');
    return segments[segments.length - 1] || '';
  }, []);

  const [active, setActive] = useState<TabId>('courses');

  const { data, loading, error } = useAdminPageData(
    () => api.getCertificationPartnerDetail(session.token, partnerId),
    [partnerId],
  );

  const partner = useMemo(() => {
    const p = data?.partner;
    return typeof p === 'object' && p !== null ? (p as Record<string, unknown>) : null;
  }, [data]);
  const courses = useMemo(() => toRecords(data?.courses), [data]);
  const students = useMemo(() => toRecords(data?.students), [data]);
  const liability = useMemo(() => {
    const l = data?.liability;
    return typeof l === 'object' && l !== null ? (l as Record<string, unknown>) : null;
  }, [data]);

  const courseColumns: DataTableColumn[] = [
    { key: 'title', label: 'Course', sortable: true, render: (v) => asString(v) || '-' },
    {
      key: 'combinations',
      label: 'Combinations',
      render: (_v, row) => {
        const combos = Array.isArray(row.combinations) ? (row.combinations as Array<Record<string, unknown>>) : [];
        if (combos.length === 0) return <span className="text-xs text-gray-400">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {combos.map((c) => (
              <span key={asString(c.id)} className="inline-flex items-center rounded-full bg-ttii-primary/10 px-2 py-0.5 text-[11px] font-medium text-ttii-primary">
                {asString(c.code)}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'student_count',
      label: 'Students',
      sortable: true,
      render: (v) => <span className="font-medium text-gray-700">{asNumber(v)}</span>,
    },
    {
      key: 'course_type',
      label: 'Type',
      render: (v) => (asNumber(v) === 1 ? 'Cohort-based' : 'Self-study'),
    },
  ];

  const studentColumns: DataTableColumn[] = [
    {
      key: 'image',
      label: '',
      render: (_v, row) => {
        const src = asString(row.image);
        const name = asString(row.name);
        const initial = name ? name.trim().charAt(0).toUpperCase() : '?';
        return src ? (
          <img loading="lazy" decoding="async" src={src} alt="" className="size-8 rounded-full object-cover" />
        ) : (
          <div className="flex size-8 items-center justify-center rounded-full bg-ttii-primary/10 text-xs font-semibold text-ttii-primary">{initial}</div>
        );
      },
    },
    {
      key: 'name',
      label: 'Student',
      sortable: true,
      render: (_v, row) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">{asString(row.name) || '-'}</p>
          <p className="truncate text-xs text-gray-500">{asString(row.email)}</p>
        </div>
      ),
    },
    { key: 'student_id', label: 'Student ID', render: (v) => <span className="font-mono text-xs text-slate-700">{asString(v) || '—'}</span> },
    { key: 'enrollment_id', label: 'Enrollment ID', render: (v) => <span className="font-mono text-xs text-slate-700">{asString(v) || '—'}</span> },
    { key: 'course_title', label: 'Course', render: (v) => asString(v) || '-' },
    {
      key: 'enrollment_status',
      label: 'Status',
      render: (v) => <AdminStatusBadge status={asString(v) || 'Active'} />,
    },
    { key: 'enrollment_date', label: 'Enrolled', render: (v) => formatDate(v) || asString(v) || '—' },
  ];

  if (loading) return <PageLoader label="Loading partner details…" />;
  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }
  if (!partner) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-gray-500">Partner not found.</CardContent>
      </Card>
    );
  }

  const logo = asString(partner.logo);
  const name = asString(partner.name);
  const code = asString(partner.partner_code);
  const country = asString(partner.country);
  const description = asString(partner.description);
  const status = asString(partner.status) || 'active';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Back to Certification Partners"
          onClick={() => onNavigate('/admin/certification-partners/index')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <AdminPageHeader title="Partner Details" />
      </div>

      {/* Header card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white">
              {logo ? (
                <img src={logo} alt={`${name} logo`} className="size-full object-contain" />
              ) : (
                <span className="text-2xl font-bold text-ttii-primary">{name.charAt(0).toUpperCase() || '?'}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-gray-900">{name || '—'}</h2>
                <AdminStatusBadge status={status} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span><span className="text-gray-400">Code:</span> <span className="font-mono">{code || '—'}</span></span>
                <span><span className="text-gray-400">Country:</span> {country || '—'}</span>
              </div>
              {description ? (
                <p className="mt-3 text-sm leading-relaxed text-gray-700">{description}</p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          const count = t.id === 'courses' ? courses.length : t.id === 'students' ? students.length : null;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={`relative inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'text-ttii-primary' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
              {count !== null ? (
                <span className="ml-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-600">{count}</span>
              ) : null}
              {isActive ? <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ttii-primary" /> : null}
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      {active === 'courses' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Courses certified by {name || 'this partner'}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {courses.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No courses linked to this partner yet.</p>
            ) : (
              <AdminDataTable
                columns={courseColumns}
                rows={courses}
                actions={[
                  {
                    label: 'Open Course',
                    onClick: (row) => onNavigate(`/admin/course/index?course=${encodeURIComponent(asString(row.id))}`),
                  },
                ]}
              />
            )}
          </CardContent>
        </Card>
      )}

      {active === 'students' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Students earning {name || 'this partner'} certification</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {students.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No active enrolments in the linked courses.</p>
            ) : (
              <AdminDataTable
                columns={studentColumns}
                rows={students}
                actions={[
                  {
                    label: 'View Student',
                    onClick: (row) => {
                      const uid = asString(row.user_id);
                      if (uid) onNavigate(`/admin/students/view/${uid}`);
                    },
                  },
                ]}
              />
            )}
          </CardContent>
        </Card>
      )}

      {active === 'liability' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Liability Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: 'Total Courses', value: asNumber(liability?.total_courses) },
                { label: 'Total Students', value: asNumber(liability?.total_students) },
                { label: 'Currency', value: asString(liability?.currency) || 'INR' },
              ].map((c) => (
                <div key={c.label} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wider text-gray-500">{c.label}</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900">{c.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: 'Per-Student Amount', value: asNumber(liability?.per_student_amount), tone: 'text-gray-700' },
                { label: 'Gross Liability', value: asNumber(liability?.gross_liability), tone: 'text-gray-900' },
                { label: 'Paid to Partner', value: asNumber(liability?.paid_to_partner), tone: 'text-emerald-700' },
              ].map((c) => (
                <div key={c.label} className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-wider text-gray-500">{c.label}</p>
                  <p className={`mt-1 text-lg font-semibold ${c.tone}`}>₹{c.value.toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">Outstanding Liability</p>
              <p className="mt-1 text-3xl font-bold text-amber-900">₹{asNumber(liability?.outstanding).toLocaleString('en-IN')}</p>
              <p className="mt-2 text-xs text-amber-700">{asString(liability?.note) || 'Awaiting partner contract terms.'}</p>
            </div>
            <a
              href="mailto:naji@teachersindia.in?subject=Confirm%20liability%20terms%20for%20partner"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <ExternalLink className="size-3" /> Confirm contract terms to enable the calculations
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
