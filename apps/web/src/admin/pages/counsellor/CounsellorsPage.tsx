import { useMemo, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { PhoneInput } from '../../shared/components/PhoneInput.js';
import { COUNTRIES } from '@/lib/locations';
import { verifyEmailWithFeedback } from '@/lib/email-verify-helper';
// Naji UAT 2026-05-16 — title-case name-like fields on blur.
import { titleCaseOnBlur } from '@/lib/text-format';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
import { PhotoUpload } from '../../shared/components/PhotoUpload.js';
import { useConfirm } from '@/components/confirm-dialog';

export default function CounsellorsPage({ api, session }: AdminPageProps) {
  const confirm = useConfirm();
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadCounsellors(session.token),
    [],
  );

  const allCounsellors = useMemo(() => toRecords(data), [data]);

  // --- Filters ---
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');

  // --- Add/Edit dialog ---
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState('');
  const [formDob, setFormDob] = useState('');
  const [formNationality, setFormNationality] = useState('India');
  const [formLanguages, setFormLanguages] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhoneCountryCode, setFormPhoneCountryCode] = useState('91');
  const [formPhone, setFormPhone] = useState('');
  const [formQualification, setFormQualification] = useState('');
  const [formDoj, setFormDoj] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formStatus, setFormStatus] = useState('1');
  const [formSaving, setFormSaving] = useState(false);

  const filters: FilterField[] = useMemo(
    () => [
      {
        key: 'search',
        label: 'Search',
        type: 'text' as const,
        value: searchFilter,
        placeholder: 'Search by counsellor name, p…',
        onChange: setSearchFilter,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select' as const,
        value: statusFilter,
        placeholder: 'Select Status',
        options: [
          { label: 'Active', value: '1' },
          { label: 'Inactive', value: '0' },
        ],
        onChange: setStatusFilter,
      },
    ],
    [searchFilter, statusFilter],
  );

  const handleApplyFilters = useCallback(() => {
    setAppliedSearch(searchFilter);
    setAppliedStatus(statusFilter);
  }, [searchFilter, statusFilter]);

  const handleClearFilters = useCallback(() => {
    setSearchFilter('');
    setStatusFilter('');
    setAppliedSearch('');
    setAppliedStatus('');
  }, []);

  const filteredCounsellors = useMemo(() => {
    let rows = allCounsellors;
    if (appliedSearch.trim()) {
      const q = appliedSearch.toLowerCase();
      rows = rows.filter(
        (r) =>
          asString(r.name).toLowerCase().includes(q) ||
          asString(r.user_email).toLowerCase().includes(q) ||
          asString(r.phone).toLowerCase().includes(q),
      );
    }
    if (appliedStatus !== '') {
      const s = Number(appliedStatus);
      rows = rows.filter((r) => asNumber(r.status) === s);
    }
    return rows;
  }, [allCounsellors, appliedSearch, appliedStatus]);

  const activeCount = useMemo(
    () => allCounsellors.filter((row) => asNumber(row.status) === 1).length,
    [allCounsellors],
  );

  // --- Table columns ---
  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'phone', label: 'Phone' },
      { key: 'user_email', label: 'Email' },
      {
        key: 'status',
        label: 'Active Status',
        render: (v) => (
          <AdminStatusBadge status={asNumber(v) === 1 ? 'Active' : 'Inactive'} />
        ),
      },
    ],
    [],
  );

  // --- Dialog handlers ---
  const resetForm = useCallback(() => {
    setFormName(''); setFormGender(''); setFormDob(''); setFormNationality('India');
    setFormLanguages(''); setFormEmail(''); setFormPhoneCountryCode('91'); setFormPhone(''); setFormQualification('');
    setFormDoj(''); setFormImage(''); setFormStatus('1');
  }, []);

  const openAddDialog = useCallback(() => {
    setDialogMode('add');
    setEditRow(null);
    resetForm();
    setDialogOpen(true);
  }, [resetForm]);

  const openEditDialog = useCallback((row: Record<string, unknown>) => {
    setDialogMode('edit');
    setEditRow(row);
    setFormName(asString(row.name));
    setFormGender(asString(row.gender));
    setFormDob(asString(row.dob).slice(0, 10));
    setFormNationality(asString(row.nationality) || 'India');
    setFormLanguages(asString(row.languages_spoken));
    setFormEmail(asString(row.user_email));
    {
      // Split stored "+91 9876543210" into ("91", "9876543210") for the input.
      const raw = asString(row.phone);
      const m = raw.match(/^\+?(\d{1,4})\s+(.+)$/);
      if (m) {
        setFormPhoneCountryCode(m[1] ?? '91');
        setFormPhone(m[2] ?? '');
      } else {
        setFormPhoneCountryCode('91');
        setFormPhone(raw);
      }
    }
    setFormQualification(asString(row.highest_qualification));
    setFormDoj(asString(row.doj).slice(0, 10));
    setFormImage(asString(row.image) || asString(row.profile_picture));
    setFormStatus(String(asNumber(row.status)));
    setDialogOpen(true);
  }, []);

  const handleDialogSave = useCallback(async () => {
    // All fields mandatory on add (Naji QA, 2026-04-30). On edit we don't
    // re-require fields the user already filled — only the editable ones.
    if (dialogMode === 'add') {
      const missing = !formName.trim() || !formGender || !formDob || !formNationality.trim()
        || !formLanguages.trim() || !formEmail.trim() || !formPhone.trim()
        || !formQualification.trim() || !formDoj;
      if (missing) {
        toast.error('All fields are required.');
        return;
      }
    } else if (!formName.trim()) {
      toast.error('Full name is required.');
      return;
    }
    if (formEmail.trim() && !EMAIL_REGEX.test(formEmail.trim())) {
      toast.error('Email is not a valid format.');
      return;
    }
    setFormSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: formName.trim(),
        gender: formGender,
        dob: formDob,
        nationality: formNationality.trim(),
        languages_spoken: formLanguages.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim() ? `+${formPhoneCountryCode} ${formPhone.trim()}` : undefined,
        country_code: formPhoneCountryCode,
        highest_qualification: formQualification.trim(),
        doj: formDoj,
        image: formImage.trim() || undefined,
        status: Number(formStatus),
      };

      if (dialogMode === 'add') {
        const res = await api.addCounsellor(session.token, payload);
        const message = asString(res.message);
        if (message) toast.success(message);
      } else if (editRow) {
        await api.editCounsellor(session.token, asString(editRow.id) || asString(editRow._id), payload);
      }
      setDialogOpen(false);
      reload();
    } catch (err) {
      toast.error(
        `Failed to ${dialogMode === 'add' ? 'add' : 'update'} counsellor: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setFormSaving(false);
    }
  }, [api, session.token, dialogMode, editRow, formName, formGender, formDob, formNationality, formLanguages, formEmail, formPhone, formPhoneCountryCode, formQualification, formDoj, formImage, formStatus, reload]);

  const handleDelete = useCallback(
    async (row: Record<string, unknown>) => {
      const confirmed = await confirm({
        title: `Delete "${asString(row.name)}"?`,
        description: 'This action cannot be undone.',
        confirmText: 'Delete',
        variant: 'destructive',
      });
      if (!confirmed) return;
      try {
        await api.deleteCounsellor(session.token, asString(row.id) || asString(row._id));
        reload();
      } catch (err) {
        toast.error(`Failed to delete counsellor: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [api, session.token, reload, confirm],
  );

  const handleResendCredentials = useCallback(async (row: Record<string, unknown>) => {
    const id = asString(row.id) || asString(row._id);
    if (!(await confirm({
      title: `Resend login email to "${asString(row.name)}"?`,
      description: 'A new temporary password will be generated and emailed. The user’s previous password will stop working.',
      confirmText: 'Resend',
      variant: 'default',
    }))) return;
    try {
      const res = await api.resendLoginCredentials(session.token, id);
      const message = typeof res.message === 'string' ? res.message : 'Login email sent.';
      if (res.status === 1) toast.success(message);
      else toast.error(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send login email');
    }
  }, [api, session.token, confirm]);

  const actions: DataTableAction[] = useMemo(
    () => [
      { label: 'View', onClick: (row) => openEditDialog(row) },
      { label: 'Edit', onClick: (row) => openEditDialog(row) },
      { label: 'Resend Login Email', onClick: (row) => { void handleResendCredentials(row); } },
      { label: 'Delete', onClick: (row) => handleDelete(row), variant: 'destructive' as const },
      { label: 'Change Username/Password', onClick: (row) => openEditDialog(row) },
      {
        label: (row) => (row.disabled_at ? 'Enable' : 'Disable'),
        onClick: (row) => {
          void (async () => {
            const id = asString(row.id) || asString(row._id);
            if (!id) return;
            const isDisabled = !!row.disabled_at;
            const name = asString(row.name) || 'this counsellor';
            if (!isDisabled && !(await confirm({
              title: `Disable ${name}?`,
              description: 'They will be blocked from logging in until you re-enable them.',
              confirmText: 'Disable',
              variant: 'destructive',
            }))) return;
            try {
              await api.toggleUserStatus(session.token, id, isDisabled);
              toast.success(isDisabled ? 'Counsellor enabled.' : 'Counsellor disabled.');
              reload();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Failed to update status');
            }
          })();
        },
      },
    ],
    [openEditDialog, handleDelete, handleResendCredentials, api, session.token, reload, confirm],
  );

  // --- Render ---
  if (loading) {
    return <PageLoader label="Loading counsellors..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Counsellors" addLabel="+ Create Counsellors" onAdd={openAddDialog} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-teal-500">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-teal-100">
              <svg className="size-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">ACTIVE COUNSELLORS</p>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <AdminFilterBar filters={filters} onApply={handleApplyFilters} onClear={handleClearFilters} />

      <AdminDataTable columns={columns} rows={filteredCounsellors} actions={actions} />

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleDialogSave();
            }}
          >
          <DialogHeader>
            <DialogTitle>{dialogMode === 'add' ? 'Add counsellor' : 'Update counsellor Details'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <Label>Profile Photo</Label>
              <PhotoUpload
                value={formImage}
                onChange={setFormImage}
                onUpload={async (file) => {
                  const r = await api.uploadFile(session.token, file);
                  return r.url;
                }}
                fallbackInitials={formName.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="c-name">Full Name *</Label>
              <Input id="c-name" value={formName} onChange={(e) => setFormName(e.target.value)} onBlur={titleCaseOnBlur(setFormName)} placeholder="Full Name" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-gender">Gender *</Label>
              <select id="c-gender" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formGender} onChange={(e) => setFormGender(e.target.value)}>
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-dob">Date of Birth *</Label>
              <Input id="c-dob" type="date" value={formDob} onChange={(e) => setFormDob(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-nat">Nationality *</Label>
              <select
                id="c-nat"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formNationality}
                onChange={(e) => setFormNationality(e.target.value)}
              >
                <option value="">Select Nationality</option>
                {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-lang">Languages Spoken *</Label>
              <Input id="c-lang" value={formLanguages} onChange={(e) => setFormLanguages(e.target.value)} placeholder="e.g. English, Hindi" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-phone">Phone Number *</Label>
              <PhoneInput
                id="c-phone"
                countryCode={formPhoneCountryCode}
                number={formPhone}
                onChange={({ countryCode, number }) => {
                  setFormPhoneCountryCode(countryCode);
                  setFormPhone(number);
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-qual">Highest Qualification *</Label>
              <Input id="c-qual" value={formQualification} onChange={(e) => setFormQualification(e.target.value)} placeholder="e.g. Masters" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-doj">Date of Joining *</Label>
              <Input id="c-doj" type="date" value={formDoj} onChange={(e) => setFormDoj(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-email">Email Address *</Label>
              <Input
                id="c-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@example.com"
                disabled={dialogMode === 'edit'}
                required
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (!v || dialogMode === 'edit') return;
                  if (!EMAIL_REGEX.test(v)) {
                    toast.error('Email is not a valid format.');
                    return;
                  }
                  void verifyEmailWithFeedback(api, session.token, v, setFormEmail);
                }}
              />
            </div>
            {dialogMode === 'add' && (
              <p className="md:col-span-2 rounded-md border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                A secure temporary password will be auto-generated and emailed to <span className="font-semibold">{formEmail || 'this counsellor'}</span> on save. They&rsquo;ll be prompted to change it on first sign-in.
              </p>
            )}
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="c-status">Status *</Label>
              <select id="c-status" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              disabled={formSaving || !formName.trim() || (dialogMode === 'add' && !formEmail.trim())}
              className="bg-ttii-primary hover:bg-ttii-primary/90"
            >
              {formSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
