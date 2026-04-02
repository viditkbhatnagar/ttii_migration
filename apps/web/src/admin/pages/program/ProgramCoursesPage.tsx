import { useState, useMemo, useCallback } from 'react';
import { Link2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';

export default function ProgramCoursesPage({ api, session }: AdminPageProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const programId = useMemo(() => {
    const match = window.location.pathname.match(/\/admin\/programs\/courses\/(.+)/);
    return match?.[1] ?? '';
  }, []);

  const { data: programData } = useAdminPageData(
    () => api.getProgram(session.token, programId),
    [programId],
  );

  const { data: coursesData, loading, error, reload } = useAdminPageData(
    () => api.listProgramCourses(session.token, programId),
    [programId],
  );

  const { data: allCoursesData, loading: allCoursesLoading } = useAdminPageData(
    () => (showLinkDialog ? api.listCoursesAdmin(session.token) : Promise.resolve([])),
    [showLinkDialog],
  );

  const rows = useMemo(() => toRecords(coursesData), [coursesData]);
  const allCourses = useMemo(() => toRecords(allCoursesData), [allCoursesData]);

  const programTitle = useMemo(() => {
    if (!programData || Array.isArray(programData)) return '';
    return asString((programData as Record<string, unknown>).title);
  }, [programData]);

  const handleRemoveCourse = useCallback(async (row: Record<string, unknown>) => {
    const courseId = asString(row.id);
    const title = asString(row.title);
    if (!window.confirm(`Remove "${title}" from this program?`)) return;
    setSaving(true);
    try {
      await api.removeCourseFromProgram(session.token, programId, courseId);
      reload();
    } catch { /* ignore */ } finally { setSaving(false); }
  }, [api, session.token, programId, reload]);

  const handleToggleCourse = useCallback((id: string) => {
    setSelectedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleLinkSelected = useCallback(async () => {
    if (selectedCourseIds.size === 0) return;
    setSaving(true);
    try {
      for (const courseId of selectedCourseIds) {
        await api.addCourseToProgram(session.token, programId, courseId);
      }
      setShowLinkDialog(false);
      setSelectedCourseIds(new Set());
      reload();
    } catch { /* ignore */ } finally { setSaving(false); }
  }, [api, session.token, programId, selectedCourseIds, reload]);

  const columns: DataTableColumn[] = [
    { key: 'title', label: 'Course Name', sortable: true },
    { key: 'short_name', label: 'Short Name' },
    { key: 'duration', label: 'Duration' },
    { key: 'is_elective', label: 'Type', render: (v) => (
      <Badge variant={v === 1 ? 'secondary' : 'default'}>{v === 1 ? 'Elective' : 'Core'}</Badge>
    )},
    { key: 'order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', render: (v) => (
      <Badge variant={v === 'active' ? 'default' : 'secondary'}>{String(v || 'active')}</Badge>
    )},
  ];

  const actions: DataTableAction[] = [
    { label: 'Remove', onClick: (row) => void handleRemoveCourse(row), variant: 'destructive' },
  ];

  if (loading) {
    return <PageLoader label="Loading program courses..." />;
  }

  if (error) {
    return <Card><CardContent className="py-8 text-center text-sm text-red-600">{error}</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {programTitle && (
        <p className="text-sm text-gray-500">
          Program: <span className="font-medium text-gray-800">{programTitle}</span>
        </p>
      )}

      <AdminPageHeader title="Program Courses">
        <Button className="gap-1.5" onClick={() => { setSelectedCourseIds(new Set()); setShowLinkDialog(true); }}>
          <Link2 className="size-4" />
          Add Courses
        </Button>
      </AdminPageHeader>

      {rows.length > 0 ? (
        <AdminDataTable columns={columns} rows={rows} actions={actions} />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-gray-400">
            No courses in this program yet. Click &quot;Add Courses&quot; to link existing courses.
          </CardContent>
        </Card>
      )}

      {/* Link Courses Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={(open) => { if (!open) { setShowLinkDialog(false); setSelectedCourseIds(new Set()); } }}>
        <DialogContent className="max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Courses to Program</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500">Select courses to include in this program. The same course can belong to multiple programs.</p>
          <div className="flex-1 overflow-y-auto space-y-2">
            {allCoursesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : allCourses.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No courses found.</p>
            ) : (
              allCourses.map((course) => {
                const id = asString(course.id);
                const checked = selectedCourseIds.has(id);
                const alreadyLinked = rows.some((r) => asString(r.id) === id);
                return (
                  <label
                    key={id}
                    className={`flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer ${alreadyLinked ? 'border-green-200 bg-green-50 opacity-60' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={alreadyLinked}
                      onChange={() => handleToggleCourse(id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {asString(course.title)}
                        {alreadyLinked && <span className="ml-2 text-xs text-green-600">(already added)</span>}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {asString(course.duration) || 'No duration'} · {asString(course.status) || 'active'}
                      </p>
                    </div>
                  </label>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowLinkDialog(false); setSelectedCourseIds(new Set()); }} disabled={saving}>Cancel</Button>
            <Button onClick={handleLinkSelected} disabled={saving || selectedCourseIds.size === 0}>
              {saving ? 'Adding...' : `Add ${selectedCourseIds.size > 0 ? `(${selectedCourseIds.size})` : ''} Selected`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
