import { useMemo } from 'react';
import {
  BookOpen, Building2, ShieldUser, Mic, Layers, BookOpenCheck, HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import type { AdminPageProps } from '../../routing/admin-routes.js';

interface StatCardDef {
  label: string;
  key: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  href: string;
}

const STAT_CARDS: StatCardDef[] = [
  { label: 'Courses', key: 'courses_count', icon: BookOpen, iconColor: 'text-green-600', iconBg: 'bg-green-100', href: '/admin/course/index' },
  { label: 'Centers', key: 'centres_count', icon: Building2, iconColor: 'text-red-600', iconBg: 'bg-red-100', href: '/admin/centres/index' },
  { label: 'Students', key: 'students_count', icon: ShieldUser, iconColor: 'text-blue-600', iconBg: 'bg-blue-100', href: '/admin/students/index' },
  { label: 'Instructors', key: 'instructors_count', icon: Mic, iconColor: 'text-teal-600', iconBg: 'bg-teal-100', href: '/admin/instructor/index' },
  { label: 'Enrolments', key: 'enrolments_count', icon: Layers, iconColor: 'text-green-600', iconBg: 'bg-green-100', href: '/admin/enrol/index' },
  { label: 'Payments', key: 'payments_count', icon: BookOpenCheck, iconColor: 'text-teal-600', iconBg: 'bg-teal-100', href: '/admin/payments/index' },
  { label: 'Questions', key: 'questions_count', icon: HelpCircle, iconColor: 'text-teal-600', iconBg: 'bg-teal-100', href: '/admin/question_bank/index' },
];

const STUDENT_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'student_id', label: 'Student ID', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'phone', label: 'Phone' },
  { key: 'course', label: 'Course', sortable: true },
  { key: 'joined_date', label: 'Joined Date', sortable: true, render: (v) => formatDate(v) },
];

const EVENT_COLUMNS: DataTableColumn[] = [
  { key: 'title', label: 'Title', sortable: true },
  { key: 'event_date', label: 'Event Date', sortable: true, render: (v) => formatDate(v) },
  { key: 'from', label: 'From' },
  { key: 'to', label: 'To' },
];

export default function DashboardPage({ api, session, onNavigate }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadAdminDashboard(session.token),
    [api, session.token],
  );

  const recentStudents = useMemo(() => toRecords(data?.recent_students), [data]);
  const upcomingEvents = useMemo(() => toRecords(data?.upcoming_events), [data]);

  if (loading) return <PageLoader label="Loading dashboard..." />;

  if (error) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Dashboard" />
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Dashboard" />

      {/* 7 clickable stat cards — 2 col mobile, 3 col tablet, 4 col desktop */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {STAT_CARDS.map((stat) => {
          const Icon = stat.icon;
          const value = String(asNumber(data?.[stat.key]) || 0);
          return (
            <button
              key={stat.key}
              type="button"
              onClick={() => onNavigate(stat.href)}
              className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-ttii-primary/30 hover:shadow-md"
            >
              <div className={`flex size-12 shrink-0 items-center justify-center rounded-full ${stat.iconBg}`}>
                <Icon className={`size-6 ${stat.iconColor}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Recently Joined Students */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Recently Joined Students</h2>
        <AdminDataTable columns={STUDENT_COLUMNS} rows={recentStudents} searchable exportable />
      </div>

      {/* Upcoming Activities */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Upcoming Activities</h2>
        <AdminDataTable columns={EVENT_COLUMNS} rows={upcomingEvents} searchable exportable />
      </div>
    </div>
  );
}
