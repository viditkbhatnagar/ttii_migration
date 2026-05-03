import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { PhotoUpload } from '../../shared/components/PhotoUpload.js';

const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

const QUALIFICATIONS = [
  'Secondary School', 'Higher Secondary', 'Diploma', "Bachelor's Degree",
  'Postgraduate Diploma', "Master's Degree", 'M.Phil.', 'Ph.D.',
  'Professional Certification', 'Other',
];

const EXPERIENCE_BUCKETS = ['Fresher', '0-1 Years', '1-3 Years', '3-5 Years', '5-10 Years', '10+ Years'];

export default function EditStudentPage({ api, session, onNavigate }: AdminPageProps) {
  const studentId = useMemo(() => {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || '';
  }, []);

  const { data, loading, error } = useAdminPageData(
    () => api.getStudentDetail(session.token, studentId),
    [studentId],
  );

  const [form, setForm] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState('');
  const [saving, setSaving] = useState(false);

  const student = useMemo(() => {
    if (!data) return null;
    const record = data.student;
    return typeof record === 'object' && record !== null ? (record as Record<string, unknown>) : null;
  }, [data]);

  useEffect(() => {
    if (!student) return;
    const dob = student.date_of_birth;
    setForm({
      name: asString(student.name),
      user_email: asString(student.user_email),
      phone: asString(student.phone),
      country_code: asString(student.country_code),
      alternate_phone: asString(student.second_phone) || asString(student.alternate_phone),
      whatsapp_no: asString(student.whatsapp_no),
      date_of_birth: dob ? new Date(dob as string).toISOString().split('T')[0] ?? '' : '',
      gender: asString(student.gender),
      nationality: asString(student.nationality),
      marital_status: asString(student.marital_status),
      father_name: asString(student.father_name),
      mother_name: asString(student.mother_name),
      guardian_name: asString(student.guardian_name),
      aadhar_no: asString(student.aadhar_no),
      passport_no: asString(student.passport_no),
      country: asString(student.country),
      state: asString(student.state),
      city: asString(student.city),
      address: asString(student.address),
      native_address: asString(student.native_address),
      status: asString(student.status) || '1',
      highest_qualification: asString(student.highest_qualification),
      institution_name: asString(student.institution_name) || asString(student.previous_school),
      year_of_passing: asString(student.year_of_passing),
      percentage_or_grade: asString(student.percentage_or_grade),
      employment_status: asString(student.employment_status),
      current_occupation: asString(student.current_occupation),
      experience_years: asString(student.work_experience) || asString(student.experience_years),
    });
    setPhoto(asString(student.profile_picture) || asString(student.image));
  }, [student]);

  const set = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateStudentFull(session.token, studentId, { ...form, profile_picture: photo });
      toast.success('Student updated.');
      onNavigate(`/admin/students/view/${studentId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update student');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader label="Loading student..." />;
  if (error || !student) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error || 'Student not found.'}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Edit Student">
        <Button variant="outline" onClick={() => onNavigate(`/admin/students/view/${studentId}`)}>
          ← Back to Student
        </Button>
        <Button
          className="bg-ttii-primary hover:bg-ttii-primary/90"
          disabled={saving}
          onClick={() => { void handleSave(); }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </AdminPageHeader>

      <Card>
        <CardHeader><CardTitle className="text-base">Profile Photo</CardTitle></CardHeader>
        <CardContent>
          <PhotoUpload
            value={photo}
            onChange={setPhoto}
            onUpload={async (file) => {
              const r = await api.uploadFile(session.token, file);
              return r.url;
            }}
            fallbackInitials={(form.name || '?').slice(0, 2).toUpperCase()}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <FieldRow label="Name" value={form.name ?? ''} onChange={(v) => set('name', v)} />
            <FieldRow label="Email" type="email" value={form.user_email ?? ''} onChange={(v) => set('user_email', v)} />
            <FieldRow label="Phone" value={form.phone ?? ''} onChange={(v) => set('phone', v)} />
            <FieldRow label="Alternate Phone" value={form.alternate_phone ?? ''} onChange={(v) => set('alternate_phone', v)} />
            <FieldRow label="WhatsApp" value={form.whatsapp_no ?? ''} onChange={(v) => set('whatsapp_no', v)} />
            <FieldRow label="Date of Birth" type="date" value={form.date_of_birth ?? ''} onChange={(v) => set('date_of_birth', v)} />
            <SelectRow label="Gender" value={form.gender ?? ''} onChange={(v) => set('gender', v)}
              options={[{ value: '', label: 'Select' }, { value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]} />
            <SelectRow label="Marital Status" value={form.marital_status ?? ''} onChange={(v) => set('marital_status', v)}
              options={[{ value: '', label: 'Select' }, { value: 'Single', label: 'Single' }, { value: 'Married', label: 'Married' }, { value: 'Divorced', label: 'Divorced' }, { value: 'Widowed', label: 'Widowed' }]} />
            <FieldRow label="Nationality" value={form.nationality ?? ''} onChange={(v) => set('nationality', v)} />
            <FieldRow label="Aadhar No" value={form.aadhar_no ?? ''} onChange={(v) => set('aadhar_no', v)} />
            <FieldRow label="Passport No" value={form.passport_no ?? ''} onChange={(v) => set('passport_no', v)} />
            <FieldRow label="Father Name" value={form.father_name ?? ''} onChange={(v) => set('father_name', v)} />
            <FieldRow label="Mother Name" value={form.mother_name ?? ''} onChange={(v) => set('mother_name', v)} />
            <FieldRow label="Guardian Name" value={form.guardian_name ?? ''} onChange={(v) => set('guardian_name', v)} />
            <FieldRow label="Country" value={form.country ?? ''} onChange={(v) => set('country', v)} />
            <FieldRow label="State" value={form.state ?? ''} onChange={(v) => set('state', v)} />
            <FieldRow label="City / District" value={form.city ?? ''} onChange={(v) => set('city', v)} />
            <SelectRow label="Status" value={form.status ?? '1'} onChange={(v) => set('status', v)}
              options={[{ value: '1', label: 'Active' }, { value: '0', label: 'Inactive' }, { value: '2', label: 'Graduated' }, { value: '3', label: 'Dropped' }]} />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-1 text-xs">Permanent Address</Label>
              <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={3} value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div>
              <Label className="mb-1 text-xs">Correspondence Address</Label>
              <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={3} value={form.native_address ?? ''} onChange={(e) => set('native_address', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Qualification & Employment</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <SelectRow label="Highest Qualification" value={form.highest_qualification ?? ''} onChange={(v) => set('highest_qualification', v)}
              options={[{ value: '', label: 'Select' }, ...QUALIFICATIONS.map((q) => ({ value: q, label: q }))]} />
            <FieldRow label="School / College" value={form.institution_name ?? ''} onChange={(v) => set('institution_name', v)} />
            <FieldRow label="Year of Passing" value={form.year_of_passing ?? ''} onChange={(v) => set('year_of_passing', v)} />
            <FieldRow label="Percentage / Grade" value={form.percentage_or_grade ?? ''} onChange={(v) => set('percentage_or_grade', v)} />
            <SelectRow label="Current Employment Status" value={form.employment_status ?? ''} onChange={(v) => set('employment_status', v)}
              options={[
                { value: '', label: 'Select' },
                { value: 'Employed', label: 'Employed' },
                { value: 'Self-Employed', label: 'Self-Employed' },
                { value: 'Unemployed', label: 'Unemployed' },
                { value: 'Student', label: 'Student' },
                { value: 'Homemaker', label: 'Homemaker' },
                { value: 'Retired', label: 'Retired' },
              ]} />
            <FieldRow label="Current Occupation" value={form.current_occupation ?? ''} onChange={(v) => set('current_occupation', v)} />
            <SelectRow label="Experience" value={form.experience_years ?? ''} onChange={(v) => set('experience_years', v)}
              options={[{ value: '', label: 'Select' }, ...EXPERIENCE_BUCKETS.map((b) => ({ value: b, label: b }))]} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4 text-xs text-gray-500">
          <p>
            <strong>Note:</strong> Course / Offering / Certificate Combination / Fee plan / Application documents are read-only here.
            Editing them after enrolment can affect billing, attendance and certificates — those changes will land once the policy
            is defined. View those values on the student detail page.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => onNavigate(`/admin/students/view/${studentId}`)}>Cancel</Button>
        <Button
          className="bg-ttii-primary hover:bg-ttii-primary/90"
          disabled={saving}
          onClick={() => { void handleSave(); }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

function FieldRow({ label, value, onChange, type }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label className="mb-1 text-xs">{label}</Label>
      <Input type={type ?? 'text'} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SelectRow({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <Label className="mb-1 text-xs">{label}</Label>
      <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
