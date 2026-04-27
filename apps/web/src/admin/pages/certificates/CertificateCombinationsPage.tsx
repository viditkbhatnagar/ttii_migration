import { useState, useMemo, useCallback } from 'react';
import { PageLoader } from '@/components/ui/page-loader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { useConfirm } from '@/components/confirm-dialog';

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

interface CombinationForm {
  combination_code: string;
  program_id: string;
  course_id: string;
  partner_ids: string[];
  gst_applicable: boolean;
  gst_percent: string;
  status: string;
}

const emptyForm: CombinationForm = {
  combination_code: '',
  program_id: '',
  course_id: '',
  partner_ids: [],
  gst_applicable: true,
  gst_percent: '18',
  status: 'active',
};

function generateCombinationCode(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-6);
  return `CC-${ts}`;
}

export default function CertificateCombinationsPage({ api, session }: AdminPageProps) {
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState('');
  const [form, setForm] = useState<CombinationForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.listCertificateCombinations(session.token),
    [],
  );
  const { data: programsData } = useAdminPageData(() => api.listPrograms(session.token), []);
  const { data: coursesData } = useAdminPageData(() => api.loadCourses(session.token), []);
  const { data: partnersData } = useAdminPageData(
    () => api.listCertificationPartners(session.token),
    [],
  );

  const rows = useMemo(() => toRecords(data), [data]);
  const programs = useMemo(() => toRecords(programsData), [programsData]);
  const courses = useMemo(() => toRecords(coursesData), [coursesData]);
  const partners = useMemo(() => toRecords(partnersData), [partnersData]);

  const handleOpenAdd = useCallback(() => {
    setEditId('');
    setForm({ ...emptyForm, combination_code: generateCombinationCode() });
    setShowForm(true);
  }, []);

  const handleOpenEdit = useCallback((row: Record<string, unknown>) => {
    setEditId(asString(row.id));
    const partnersList = Array.isArray(row.partners) ? (row.partners as Record<string, unknown>[]) : [];
    setForm({
      combination_code: asString(row.combination_code),
      program_id: asString(row.program_id),
      course_id: asString(row.course_id),
      partner_ids: partnersList.map((p) => asString(p.id)),
      gst_applicable: row.gst_applicable !== false && row.gst_applicable !== 0,
      gst_percent: row.gst_percent == null ? '18' : String(row.gst_percent as number),
      status: asString(row.status) || 'active',
    });
    setShowForm(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.combination_code.trim()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        combination_code: form.combination_code.trim(),
        program_id: form.program_id || undefined,
        course_id: form.course_id || undefined,
        partner_ids: form.partner_ids,
        gst_applicable: form.gst_applicable,
        gst_percent: form.gst_applicable ? Number(form.gst_percent) || 18 : 0,
        status: form.status,
      };
      if (editId) await api.updateCertificateCombination(session.token, editId, payload);
      else await api.createCertificateCombination(session.token, payload);
      setShowForm(false);
      setEditId('');
      setForm(emptyForm);
      reload();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }, [api, session.token, editId, form, reload]);

  const handleDelete = useCallback(
    async (row: Record<string, unknown>) => {
      if (
        !(await confirm({
          title: `Delete combination "${asString(row.combination_code)}"?`,
          description: 'This action cannot be undone.',
          confirmText: 'Delete',
          variant: 'destructive',
        }))
      )
        return;
      try {
        await api.deleteCertificateCombination(session.token, asString(row.id));
        reload();
      } catch {
        /* ignore */
      }
    },
    [api, session.token, reload, confirm],
  );

  const togglePartner = useCallback((partnerId: string) => {
    setForm((f) => ({
      ...f,
      partner_ids: f.partner_ids.includes(partnerId)
        ? f.partner_ids.filter((id) => id !== partnerId)
        : [...f.partner_ids, partnerId],
    }));
  }, []);

  const columns: DataTableColumn[] = [
    { key: 'combination_code', label: 'Code', sortable: true },
    { key: 'program_title', label: 'Program', render: (v) => asString(v) || '—' },
    { key: 'course_title', label: 'Course', render: (v) => asString(v) || '—' },
    {
      key: 'partners',
      label: 'Partners',
      render: (v) => {
        const list = Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
        if (list.length === 0) return <span className="text-slate-400">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {list.slice(0, 3).map((p, idx) => (
              <span key={asString(p.id) + idx} className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                {asString(p.partner_code) || asString(p.name)}
              </span>
            ))}
            {list.length > 3 ? <span className="text-xs text-slate-500">+{list.length - 3}</span> : null}
          </div>
        );
      },
    },
    {
      key: 'gst_applicable',
      label: 'GST',
      render: (v, row) => {
        const pct = row.gst_percent;
        const pctText = typeof pct === 'number' || typeof pct === 'string' ? String(pct) : '18';
        return v ? `Yes (${pctText}%)` : 'No';
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (v) => {
        const s = asString(v) || 'active';
        return (
          <span
            className={
              s === 'active'
                ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700'
                : 'rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700'
            }
          >
            {s}
          </span>
        );
      },
    },
  ];

  const actions: DataTableAction[] = [
    { label: 'Edit', onClick: (row) => handleOpenEdit(row) },
    { label: 'Delete', onClick: (row) => void handleDelete(row), variant: 'destructive' },
  ];

  if (loading) return <PageLoader label="Loading certificate combinations..." />;
  if (error)
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Certificate Combinations" addLabel="Create Combination" onAdd={handleOpenAdd} />
      <AdminDataTable columns={columns} rows={rows} actions={actions} />

      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            setEditId('');
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent className="w-[min(640px,calc(100vw-2rem))] max-w-[min(640px,calc(100vw-2rem))] overflow-hidden">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
            className="w-full min-w-0"
          >
            <DialogHeader className="mb-5">
              <DialogTitle>{editId ? 'Edit Combination' : 'New Certificate Combination'}</DialogTitle>
            </DialogHeader>
            {/* Spec order: Program → Course → Choose Multiple Partners → Combination Code (Auto) → GST Applicability + If Yes (%). Status appended at the end. */}
            <div className="w-full min-w-0 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="combo-program">Program</Label>
                <select
                  id="combo-program"
                  className={selectClass}
                  value={form.program_id}
                  onChange={(e) => setForm((f) => ({ ...f, program_id: e.target.value }))}
                >
                  <option value="">— Select Program —</option>
                  {programs.map((p) => (
                    <option key={asString(p.id)} value={asString(p.id)}>
                      {asString(p.name) || asString(p.title) || asString(p.code)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="combo-course">Course</Label>
                <select
                  id="combo-course"
                  className={selectClass}
                  value={form.course_id}
                  onChange={(e) => setForm((f) => ({ ...f, course_id: e.target.value }))}
                >
                  <option value="">— Select Course —</option>
                  {courses.map((c) => (
                    <option key={asString(c.id)} value={asString(c.id)}>
                      {asString(c.title)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Combination (Choose Multiple Partners)</Label>
                {partners.length === 0 ? (
                  <p className="rounded border border-dashed border-slate-300 p-3 text-xs text-slate-500">
                    No certification partners yet. Add them under <em>Course → Certification Partners</em> first.
                  </p>
                ) : (
                  <div className="max-h-40 space-y-1 overflow-auto rounded border border-slate-200 p-2">
                    {partners.map((p) => {
                      const id = asString(p.id);
                      const checked = form.partner_ids.includes(id);
                      return (
                        <label
                          key={id}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePartner(id)}
                            className="h-4 w-4"
                          />
                          <span className="text-sm">
                            {asString(p.partner_code)} — {asString(p.name)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="combo-code">Combination Code (auto)</Label>
                <Input
                  id="combo-code"
                  value={form.combination_code}
                  onChange={(e) => setForm((f) => ({ ...f, combination_code: e.target.value }))}
                  placeholder="CC-XXXXXX"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>GST Applicability</Label>
                  <label className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3">
                    <input
                      type="checkbox"
                      checked={form.gst_applicable}
                      onChange={(e) => setForm((f) => ({ ...f, gst_applicable: e.target.checked }))}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{form.gst_applicable ? 'Yes' : 'No'}</span>
                  </label>
                </div>
                {form.gst_applicable ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="combo-gst-pct">GST % (default 18)</Label>
                    <Input
                      id="combo-gst-pct"
                      type="number"
                      step="0.01"
                      value={form.gst_percent}
                      onChange={(e) => setForm((f) => ({ ...f, gst_percent: e.target.value }))}
                    />
                  </div>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="combo-status">Status</Label>
                <select
                  id="combo-status"
                  className={selectClass}
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <DialogFooter className="mt-6 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditId('');
                  setForm(emptyForm);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !form.combination_code.trim()}>
                {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
