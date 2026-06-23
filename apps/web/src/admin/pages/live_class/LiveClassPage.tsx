import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminTabBar, type AdminTab } from '../../shared/components/AdminTabBar.js';
import { AddLiveSessionModal, type CohortOption } from '../cohorts/AddLiveSessionModal.js';

export default function LiveClassPage({ api, session }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState('all');

  // Add Live Session — reachable directly from the Live Sessions list (Risha
  // UAT 2026-06-23). Picks a cohort first, then reuses the cohort dialog.
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cohortOptions, setCohortOptions] = useState<CohortOption[]>([]);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadLiveClasses(session.token),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await api.loadAdminCohorts(session.token, {});
        if (cancelled) return;
        const options = rows
          .map((r) => ({
            id: asString(r._id) || asString(r.id),
            title: asString(r.title) || asString(r.cohort_id) || 'Untitled cohort',
          }))
          .filter((o) => o.id);
        setCohortOptions(options);
      } catch {
        if (!cancelled) toast.error('Failed to load cohorts for Add Live Session.');
      }
    })();
    return () => { cancelled = true; };
  }, [api, session.token]);

  const allSessions = useMemo(() => toRecords(data), [data]);

  const today = new Date().toISOString().slice(0, 10);

  const upcomingCount = useMemo(
    () => allSessions.filter((r) => asString(r.date).slice(0, 10) > today).length,
    [allSessions, today],
  );

  const pastCount = useMemo(
    () => allSessions.filter((r) => asString(r.date).slice(0, 10) <= today).length,
    [allSessions, today],
  );

  const filteredSessions = useMemo(() => {
    if (activeTab === 'all') return allSessions;
    if (activeTab === 'upcoming') return allSessions.filter((r) => asString(r.date).slice(0, 10) > today);
    if (activeTab === 'past') return allSessions.filter((r) => asString(r.date).slice(0, 10) <= today);
    return allSessions;
  }, [allSessions, activeTab, today]);

  const tabs: AdminTab[] = useMemo(() => [
    { id: 'all', label: 'All', count: allSessions.length },
    { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
    { id: 'past', label: 'Past', count: pastCount },
  ], [allSessions.length, upcomingCount, pastCount]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'session_id', label: 'ID', sortable: true },
    { key: 'title', label: 'Title', sortable: true },
    { key: 'cohort_title', label: 'Cohort' },
    { key: 'course_title', label: 'Course' },
    { key: 'date', label: 'Date', render: (v) => formatDate(v) },
    { key: 'fromTime', label: 'From' },
    { key: 'toTime', label: 'To' },
    {
      key: 'platform',
      label: 'Platform',
      render: (v, row) => {
        const raw = typeof v === 'string' ? v : '';
        const p = raw || (row.zoom_id ? 'zoom' : '-');
        const labels: Record<string, string> = { teams: 'Microsoft Teams', zoom: 'Zoom', manual: 'Manual Link', other: 'Other' };
        return labels[p] ?? p;
      },
    },
    {
      key: 'join_url',
      label: 'Meeting',
      render: (_v, row) => {
        const url = typeof row.join_url === 'string' ? row.join_url : '';
        const zoomId = typeof row.zoom_id === 'string' ? row.zoom_id : '';
        if (!url && !zoomId) return '-';
        if (url.startsWith('http')) {
          return (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Join
            </a>
          );
        }
        return url || (zoomId ? `Zoom ID ${zoomId}` : '-');
      },
    },
  ], []);

  if (loading) {
    return <PageLoader label="Loading live class..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Live Sessions" addLabel="+ Add Live Session" onAdd={() => setAddOpen(true)} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {[
          { label: 'Total Sessions', value: allSessions.length },
          { label: 'Upcoming', value: upcomingCount },
          { label: 'Past', value: pastCount },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <AdminDataTable columns={columns} rows={filteredSessions} />

      {addOpen && (
        <AddLiveSessionModal
          open
          onClose={() => setAddOpen(false)}
          api={api}
          token={session.token}
          cohorts={cohortOptions}
          submitting={submitting}
          setSubmitting={setSubmitting}
          onSuccess={() => {
            setAddOpen(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
