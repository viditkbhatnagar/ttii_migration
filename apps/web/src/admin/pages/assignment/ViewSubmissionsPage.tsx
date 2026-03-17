import { useState, useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function ViewSubmissionsPage({ api, session, onNavigate }: AdminPageProps) {
  const assignmentId = useMemo(() => {
    const segments = window.location.pathname.split('/');
    return segments[segments.length - 1] || '';
  }, []);

  const [editedRows, setEditedRows] = useState<Record<string, { marks: string; remarks: string }>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadAssignmentSubmissions(session.token, assignmentId),
    [assignmentId],
  );

  const submissions = useMemo(() => toRecords(data), [data]);

  const getEdited = useCallback((rowId: string) => editedRows[rowId], [editedRows]);

  const handleFieldChange = useCallback((rowId: string, field: 'marks' | 'remarks', value: string) => {
    setEditedRows((prev) => ({
      ...prev,
      [rowId]: {
        marks: prev[rowId]?.marks ?? '',
        remarks: prev[rowId]?.remarks ?? '',
        [field]: value,
      },
    }));
  }, []);

  const handleSave = useCallback(async (row: Record<string, unknown>) => {
    const rowId = asString(row.id);
    const edited = editedRows[rowId];
    if (!edited) return;
    setSaving((prev) => ({ ...prev, [rowId]: true }));
    try {
      await api.evaluateSubmission(session.token, rowId, edited.marks, edited.remarks);
      setEditedRows((prev) => {
        const next = { ...prev };
        delete next[rowId];
        return next;
      });
      reload();
    } catch {
      // silently handle
    } finally {
      setSaving((prev) => ({ ...prev, [rowId]: false }));
    }
  }, [api, session.token, editedRows, reload]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'student_name', label: 'Student Name', sortable: true },
    { key: 'student_id', label: 'Student ID' },
    {
      key: 'assignment_files',
      label: 'Submitted File',
      render: (value) => {
        const fileUrl = asString(value);
        if (!fileUrl) return <span className="text-muted-foreground text-sm">No file</span>;
        return (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm"
          >
            Download
          </a>
        );
      },
    },
    { key: 'created_at', label: 'Submission Date', render: (v) => formatDate(v) },
    {
      key: 'marks',
      label: 'Status',
      render: (value) => {
        const marks = value != null && value !== '' && value !== 0 ? true : false;
        return marks
          ? <AdminStatusBadge status="Reviewed" />
          : <AdminStatusBadge status="Pending Review" />;
      },
    },
    {
      key: 'marks',
      label: 'Score',
      render: (value, row) => {
        const rowId = asString(row.id);
        const edited = getEdited(rowId);
        const currentValue = edited?.marks ?? String(value ?? '');
        return (
          <Input
            className="w-20 h-8 text-sm"
            type="number"
            value={currentValue}
            placeholder="--"
            onChange={(e) => {
              handleFieldChange(rowId, 'marks', e.target.value);
            }}
          />
        );
      },
    },
    {
      key: 'remarks',
      label: 'Remarks',
      render: (value, row) => {
        const rowId = asString(row.id);
        const edited = getEdited(rowId);
        const currentValue = edited?.remarks ?? asString(value);
        return (
          <Input
            className="w-40 h-8 text-sm"
            value={currentValue}
            placeholder="Add remarks..."
            onChange={(e) => {
              handleFieldChange(rowId, 'remarks', e.target.value);
            }}
          />
        );
      },
    },
    {
      key: 'id',
      label: 'Action',
      render: (_value, row) => {
        const rowId = asString(row.id);
        const edited = editedRows[rowId];
        const isSaving = saving[rowId];
        return (
          <Button
            size="sm"
            disabled={!edited || isSaving}
            onClick={() => { void handleSave(row); }}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        );
      },
    },
  ], [getEdited, handleFieldChange, editedRows, saving, handleSave]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => onNavigate('/admin/assignment')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <AdminPageHeader title="Assignment Submissions" />
      </div>

      <AdminDataTable
        columns={columns}
        rows={submissions}
      />
    </div>
  );
}
