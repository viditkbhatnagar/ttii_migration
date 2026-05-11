import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { PhotoUpload } from '../../shared/components/PhotoUpload.js';

const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

const QUALIFICATIONS = [
  'Secondary School', 'Higher Secondary', 'Diploma', "Bachelor's Degree",
  'Postgraduate Diploma', "Master's Degree", 'M.Phil.', 'Ph.D.',
  'Professional Certification', 'Other',
];

const EXPERIENCE_BUCKETS = ['Fresher', '0-1 Years', '1-3 Years', '3-5 Years', '5-10 Years', '10+ Years'];
const MODE_OF_STUDY = ['Online', 'Offline', 'Hybrid'];
const LEAD_SOURCES = ['Facebook', 'WhatsApp', 'Email', 'Website', 'Walk-in', 'Call-in', 'Reference'];
const PIPELINE_ROLE_MAP: Record<string, number> = { Admin: 8, Counsellor: 9, Associate: 10 };

// Naji 2026-05-11 — TTII is India-focused so we ship a built-in list of
// Indian states + UTs for the State datalist. Free-text still works for
// international students; admins typing a non-Indian state value just
// won't match a suggestion.
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

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
    // Naji 2026-05-11 — Resolve a raw legacy value to the canonical option:
    // 1) Exact match wins.
    // 2) Case-insensitive match against option labels.
    // 3) Known legacy aliases (DB has "associates" / "Bachelor's" /
    //    "not_married" / "referral" etc — map to the closest dropdown option).
    // 4) Otherwise return the raw value unchanged so SelectRow can preserve
    //    it as a custom option (Naji sees what's stored, can change if he
    //    wants but data isn't silently lost).
    const ALIASES: Record<string, string> = {
      // Gender (legacy int-as-string also handled by backend normalizeGender)
      '1': 'Male', '2': 'Female', '3': 'Other',
      male: 'Male', female: 'Female', other: 'Other',
      // Marital status
      married: 'Married', single: 'Single', divorced: 'Divorced', widowed: 'Widowed',
      not_married: 'Single', unmarried: 'Single',
      // Pipeline (Add-Application stores e.g. "associates" plural lowercase)
      admin: 'Admin', counsellor: 'Counsellor', counselor: 'Counsellor',
      associate: 'Associate', associates: 'Associate', centre: 'Centre', center: 'Centre',
      // Lead source / marketing
      facebook: 'Facebook', whatsapp: 'WhatsApp', email: 'Email', website: 'Website',
      'walk-in': 'Walk-in', 'walkin': 'Walk-in', 'call-in': 'Call-in', 'callin': 'Call-in',
      reference: 'Reference', referral: 'Reference', referred: 'Reference',
      // Highest qualification
      "bachelor's": "Bachelor's Degree", 'bachelors': "Bachelor's Degree", bachelor: "Bachelor's Degree",
      "master's": "Master's Degree", masters: "Master's Degree", master: "Master's Degree",
      'high school': 'Secondary School', 'senior secondary': 'Higher Secondary',
      'intermediate': 'Higher Secondary', 'plus two': 'Higher Secondary', '+2': 'Higher Secondary',
      // Mode of study
      online: 'Online', offline: 'Offline', hybrid: 'Hybrid',
      // Employment status
      employed: 'Employed', 'self-employed': 'Self-Employed', selfemployed: 'Self-Employed',
      unemployed: 'Unemployed', student: 'Student', homemaker: 'Homemaker', retired: 'Retired',
    };
    const resolveOption = (raw: string, options: string[]): string => {
      const v = raw.trim();
      if (!v) return '';
      // 1) Exact match
      if (options.includes(v)) return v;
      // 2) Case-insensitive match against option labels
      const lower = v.toLowerCase();
      const ci = options.find((o) => o.toLowerCase() === lower);
      if (ci) return ci;
      // 3) Known alias
      if (ALIASES[lower]) return ALIASES[lower];
      // 4) Fall through — preserved as a "(current)" option by SelectRow
      return v;
    };
    setForm({
      name: asString(student.name),
      user_email: asString(student.user_email),
      phone: asString(student.phone),
      country_code: asString(student.country_code),
      alternate_phone: asString(student.second_phone) || asString(student.alternate_phone),
      whatsapp_no: asString(student.whatsapp_no),
      date_of_birth: dob ? new Date(dob as string).toISOString().split('T')[0] ?? '' : '',
      age: asString(student.age),
      gender: resolveOption(asString(student.gender), ['Male', 'Female', 'Other']),
      // Country / Nationality are free-text columns; show the resolved name
      // (from country lookup) for clarity. Save path takes the field as-is.
      nationality: asString(student.nationality_name) || asString(student.nationality),
      marital_status: resolveOption(asString(student.marital_status), ['Single', 'Married', 'Divorced', 'Widowed']),
      father_name: asString(student.father_name),
      mother_name: asString(student.mother_name),
      guardian_name: asString(student.guardian_name),
      aadhar_no: asString(student.aadhar_no),
      passport_no: asString(student.passport_no),
      emergency_name: asString(student.emergency_name),
      emergency_relation: asString(student.emergency_relation),
      emergency_phone: asString(student.emergency_phone),
      biography: asString(student.biography),
      learning_disabilities: asString(student.learning_disabilities),
      accessibility_needs: asString(student.accessibility_needs),
      country: asString(student.country_name) || asString(student.country),
      state: asString(student.state),
      city: asString(student.city),
      address: asString(student.address),
      native_address: asString(student.native_address),
      status: asString(student.status) || '1',
      highest_qualification: resolveOption(asString(student.highest_qualification), QUALIFICATIONS),
      specialization: asString(student.specialization),
      institution_name: asString(student.institution_name) || asString(student.previous_school),
      year_of_passing: asString(student.year_of_passing),
      percentage_or_grade: asString(student.percentage_or_grade),
      employment_status: resolveOption(
        asString(student.employment_status),
        ['Employed', 'Self-Employed', 'Unemployed', 'Student', 'Homemaker', 'Retired'],
      ),
      current_occupation: asString(student.current_occupation),
      experience_years: resolveOption(
        asString(student.work_experience) || asString(student.experience_years),
        EXPERIENCE_BUCKETS,
      ),
      // Enrolment + fee fields (carried on the linked application).
      course_id: asString(student.course_id),
      offering_id: asString(student.offering_id),
      certificate_combination_id: asString(student.certificate_combination_id),
      mode_of_study: resolveOption(asString(student.mode_of_study), MODE_OF_STUDY),
      preferred_language: asString(student.preferred_language),
      pipeline: resolveOption(asString(student.pipeline), ['Admin', 'Counsellor', 'Associate', 'Centre']),
      pipeline_user: asString(student.pipeline_user),
      lead_source: resolveOption(asString(student.lead_source), LEAD_SOURCES),
      reference_student_id: asString(student.reference_student_id),
      discount: asString((data?.applicationFee as Record<string, unknown> | undefined)?.discount) || '',
      discount_type: asString((data?.applicationFee as Record<string, unknown> | undefined)?.discount_type) || 'percent',
      registration_fee: asString((data?.applicationFee as Record<string, unknown> | undefined)?.registration_fee) || '',
      gst_percent: asString((data?.applicationFee as Record<string, unknown> | undefined)?.gst_percent) || '18',
      gst_applicability: ((data?.applicationFee as Record<string, unknown> | undefined)?.gst_percent ? 'Yes' : 'No'),
      final_course_fee: asString((data?.applicationFee as Record<string, unknown> | undefined)?.final_fee) || '',
    });
    setPhoto(asString(student.profile_picture) || asString(student.image));
  }, [student, data]);

  const set = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Dropdown sources for Enrolment / Fee section.
  const { data: refData } = useAdminPageData(() => api.loadApplications(session.token), []);
  const courses = useMemo(() => {
    const list = (refData?.courses ?? []) as Array<{ id: string; title: string }>;
    return list;
  }, [refData]);
  const { data: offeringsData } = useAdminPageData(
    () => form.course_id ? api.listOfferings(session.token, { course_id: form.course_id }) : Promise.resolve([]),
    [form.course_id],
  );
  const offerings = useMemo(() => toRecords(offeringsData), [offeringsData]);
  const { data: combinationsData } = useAdminPageData(
    () => api.listCertificateCombinations(session.token),
    [],
  );
  const combinations = useMemo(() => {
    const all = toRecords(combinationsData);
    if (!form.course_id) return all;
    return all.filter((c) => asString(c.course_id) === form.course_id);
  }, [combinationsData, form.course_id]);
  const { data: languagesData } = useAdminPageData(() => api.loadLanguages(session.token), []);
  const languages = useMemo(() => toRecords(languagesData), [languagesData]);
  // Naji 2026-05-11 — Country list for searchable Country / Nationality
  // datalist autocompletes. Loaded once per page mount.
  const { data: countriesData } = useAdminPageData(() => api.loadCountries(session.token), []);
  const countries = useMemo(() => toRecords(countriesData), [countriesData]);
  const countryNames = useMemo(
    () => countries.map((c) => asString(c.name)).filter(Boolean).sort(),
    [countries],
  );
  const { data: pipelineUsersData } = useAdminPageData(
    () => {
      const pipeline = form.pipeline ?? '';
      if (pipeline === 'Centre') return api.loadCentres(session.token);
      const roleId = PIPELINE_ROLE_MAP[pipeline];
      if (!roleId) return Promise.resolve([]);
      return api.loadPipelineUsers(session.token, roleId);
    },
    [form.pipeline],
  );
  const pipelineUsers = useMemo(() => toRecords(pipelineUsersData), [pipelineUsersData]);
  const { data: studentsData } = useAdminPageData(
    () => form.lead_source === 'Reference' ? api.loadStudents(session.token, {}) : Promise.resolve([]),
    [form.lead_source],
  );
  const students = useMemo(() => toRecords(studentsData), [studentsData]);

  // Auto-recompute Final Course Fee when pricing inputs change.
  useEffect(() => {
    const fee = parseFloat(form.final_course_fee || '') || 0;
    const baseStr = form.final_course_fee || '';
    // If admin hasn't typed final fee, derive: take Offered Fee from chosen
    // package, apply discount, apply GST.
    const pkgFee = (() => {
      // Heuristic: if final_course_fee is empty, look up the package and
      // recompute. Otherwise leave the user's manual entry alone.
      if (baseStr) return null;
      return null; // explicit no-op; admin types manually for now.
    })();
    void pkgFee;
    void fee;
  }, [form.final_course_fee, form.discount, form.discount_type, form.gst_percent, form.gst_applicability]);

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
            <FieldRow label="Age" value={form.age ?? ''} onChange={(v) => set('age', v)} />
            <SelectRow label="Gender" value={form.gender ?? ''} onChange={(v) => set('gender', v)}
              options={[{ value: '', label: 'Select' }, { value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]} />
            <SelectRow label="Marital Status" value={form.marital_status ?? ''} onChange={(v) => set('marital_status', v)}
              options={[{ value: '', label: 'Select' }, { value: 'Single', label: 'Single' }, { value: 'Married', label: 'Married' }, { value: 'Divorced', label: 'Divorced' }, { value: 'Widowed', label: 'Widowed' }]} />
            <DatalistField
              label="Nationality"
              value={form.nationality ?? ''}
              onChange={(v) => set('nationality', v)}
              listId="ccp-nationality-list"
              options={countryNames}
              placeholder="Type to search countries…"
            />
            <FieldRow label="Aadhar No" value={form.aadhar_no ?? ''} onChange={(v) => set('aadhar_no', v)} />
            <FieldRow label="Passport No" value={form.passport_no ?? ''} onChange={(v) => set('passport_no', v)} />
            <FieldRow label="Father Name" value={form.father_name ?? ''} onChange={(v) => set('father_name', v)} />
            <FieldRow label="Mother Name" value={form.mother_name ?? ''} onChange={(v) => set('mother_name', v)} />
            <FieldRow label="Guardian Name" value={form.guardian_name ?? ''} onChange={(v) => set('guardian_name', v)} />
            <DatalistField
              label="Country"
              value={form.country ?? ''}
              onChange={(v) => set('country', v)}
              listId="ccp-country-list"
              options={countryNames}
              placeholder="Type to search countries…"
            />
            <DatalistField
              label="State"
              value={form.state ?? ''}
              onChange={(v) => set('state', v)}
              listId="ccp-state-list"
              options={INDIAN_STATES}
              placeholder="Type to search states…"
            />
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

      {/* Emergency contact + health (Naji 2026-05-05): captured by the
          application form but never editable on the student profile. */}
      <Card>
        <CardHeader><CardTitle className="text-base">Emergency Contact &amp; Health</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <FieldRow label="Emergency Contact Name" value={form.emergency_name ?? ''} onChange={(v) => set('emergency_name', v)} />
            <FieldRow label="Relation" value={form.emergency_relation ?? ''} onChange={(v) => set('emergency_relation', v)} />
            <FieldRow label="Emergency Phone" value={form.emergency_phone ?? ''} onChange={(v) => set('emergency_phone', v)} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-1 text-xs">Learning Disabilities</Label>
              <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={2} value={form.learning_disabilities ?? ''} onChange={(e) => set('learning_disabilities', e.target.value)} />
            </div>
            <div>
              <Label className="mb-1 text-xs">Accessibility Needs</Label>
              <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={2} value={form.accessibility_needs ?? ''} onChange={(e) => set('accessibility_needs', e.target.value)} />
            </div>
          </div>
          <div className="mt-4">
            <Label className="mb-1 text-xs">Biography</Label>
            <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={3} value={form.biography ?? ''} onChange={(e) => set('biography', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Qualification & Employment</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <SelectRow label="Highest Qualification" value={form.highest_qualification ?? ''} onChange={(v) => set('highest_qualification', v)}
              options={[{ value: '', label: 'Select' }, ...QUALIFICATIONS.map((q) => ({ value: q, label: q }))]} />
            <FieldRow label="Specialization" value={form.specialization ?? ''} onChange={(v) => set('specialization', v)} />
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
        <CardHeader><CardTitle className="text-base">Enrolment Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-1 text-xs">Course</Label>
              <select className={selectClass} value={form.course_id ?? ''} onChange={(e) => set('course_id', e.target.value)}>
                <option value="">Select Course</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <Label className="mb-1 text-xs">Course Offering</Label>
              <select
                className={selectClass}
                value={form.offering_id ?? ''}
                onChange={(e) => set('offering_id', e.target.value)}
                disabled={!form.course_id}
              >
                <option value="">{form.course_id ? 'Select Offering' : 'Pick a course first'}</option>
                {offerings.map((o) => <option key={asString(o.id)} value={asString(o.id)}>{asString(o.title) || asString(o.offering_code) || 'Untitled'}</option>)}
              </select>
            </div>
            <div>
              <Label className="mb-1 text-xs">Certificate Combination</Label>
              <select
                className={selectClass}
                value={form.certificate_combination_id ?? ''}
                onChange={(e) => set('certificate_combination_id', e.target.value)}
                disabled={!form.course_id}
              >
                <option value="">{form.course_id ? 'Select Combination' : 'Pick a course first'}</option>
                {combinations.map((c) => {
                  const id = asString(c.id);
                  const code = asString(c.combination_code);
                  const courseTitle = asString(c.course_title);
                  return (
                    <option key={id} value={id}>{code}{courseTitle ? ` — ${courseTitle}` : ''}</option>
                  );
                })}
              </select>
            </div>
            <SelectRow label="Mode of Study" value={form.mode_of_study ?? ''} onChange={(v) => set('mode_of_study', v)}
              options={[{ value: '', label: 'Select Mode' }, ...MODE_OF_STUDY.map((m) => ({ value: m, label: m }))]} />
            <div>
              <Label className="mb-1 text-xs">Language</Label>
              <select className={selectClass} value={form.preferred_language ?? ''} onChange={(e) => set('preferred_language', e.target.value)}>
                <option value="">Select Language</option>
                {languages.map((l) => {
                  const id = asString(l.id);
                  const title = asString(l.title) || asString(l.name);
                  // Naji 2026-05-11 — legacy data stores numeric language IDs
                  // ("1" = Malayalam). Option value MUST be the ID so prefill
                  // matches. Save path also stores the ID (column is text but
                  // backend resolves it via the languages table).
                  return <option key={id || title} value={id || title}>{title}</option>;
                })}
              </select>
            </div>
            <SelectRow label="Pipeline" value={form.pipeline ?? ''} onChange={(v) => set('pipeline', v)}
              options={[{ value: '', label: 'Select' }, { value: 'Admin', label: 'Admin' }, { value: 'Counsellor', label: 'Counsellor' }, { value: 'Associate', label: 'Associate' }, { value: 'Centre', label: 'Centre' }]} />
            <div>
              <Label className="mb-1 text-xs">Pipeline User</Label>
              <select className={selectClass} value={form.pipeline_user ?? ''} onChange={(e) => set('pipeline_user', e.target.value)} disabled={!form.pipeline}>
                <option value="">{form.pipeline ? 'Select User' : 'Pick a pipeline first'}</option>
                {pipelineUsers.map((u) => {
                  const id = asString(u.id);
                  const label = asString(u.name) || asString(u.centre_name) || asString(u.title) || `#${id}`;
                  return <option key={id} value={id}>{label}</option>;
                })}
              </select>
            </div>
            <SelectRow label="Lead Source" value={form.lead_source ?? ''} onChange={(v) => set('lead_source', v)}
              options={[{ value: '', label: 'Select' }, ...LEAD_SOURCES.map((s) => ({ value: s, label: s }))]} />
            {form.lead_source === 'Reference' ? (
              <div>
                <Label className="mb-1 text-xs">Referred By (Student)</Label>
                <select className={selectClass} value={form.reference_student_id ?? ''} onChange={(e) => set('reference_student_id', e.target.value)}>
                  <option value="">Select Student</option>
                  {students.map((s) => {
                    const id = asString(s.id);
                    const name = asString(s.name);
                    const sid = asString(s.student_id);
                    return <option key={id} value={id}>{name}{sid ? ` (${sid})` : ''}</option>;
                  })}
                </select>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Application Fee</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <FieldRow label="Registration Fee (INR)" value={form.registration_fee ?? ''} onChange={(v) => set('registration_fee', v)} />
            <div>
              <Label className="mb-1 text-xs">Discount</Label>
              <div className="flex gap-2">
                <select className={`${selectClass} w-32`} value={form.discount_type ?? 'percent'} onChange={(e) => set('discount_type', e.target.value)}>
                  <option value="percent">Percentage</option>
                  <option value="flat">Flat (INR)</option>
                </select>
                <Input value={form.discount ?? ''} onChange={(e) => set('discount', e.target.value)} placeholder={form.discount_type === 'flat' ? 'e.g. 5000' : 'e.g. 10'} />
              </div>
            </div>
            <div>
              <Label className="mb-1 text-xs">GST</Label>
              <div className="flex gap-2">
                <select className={`${selectClass} w-32`} value={form.gst_applicability ?? 'No'} onChange={(e) => set('gst_applicability', e.target.value)}>
                  <option value="No">Not applicable</option>
                  <option value="Yes">Applicable</option>
                </select>
                <Input type="number" value={form.gst_percent ?? '18'} onChange={(e) => set('gst_percent', e.target.value)} disabled={form.gst_applicability !== 'Yes'} />
              </div>
            </div>
            <FieldRow label="Final Course Fee (INR)" value={form.final_course_fee ?? ''} onChange={(v) => set('final_course_fee', v)} />
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Editing course / offering / fee on an enrolled student updates the application record. Existing
            enrolment, paid instalments and certificates are not retroactively changed — coordinate with the
            student / counsellor before changing.
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

// Naji 2026-05-11 — searchable input backed by a native <datalist>. Gives
// instant filter-as-you-type plus free-text fallback for values not in the
// list. Each instance points to a <datalist id> rendered once in a shared
// pool below the form so we don't duplicate the option markup.
function DatalistField({
  label, value, onChange, listId, options, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  listId: string;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="mb-1 text-xs">{label}</Label>
      <Input
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <datalist id={listId}>
        {options.map((opt) => <option key={opt} value={opt} />)}
      </datalist>
    </div>
  );
}

function SelectRow({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  // Naji 2026-05-11 — If the saved value isn't one of the canonical options
  // (e.g. a legacy spelling resolveOption couldn't alias), append it as a
  // "(current)" entry so the dropdown shows what's stored instead of falling
  // back to the first option. Admin can then pick a canonical option to
  // normalize the data, or leave it alone.
  const hasMatch = options.some((o) => o.value === value);
  const effectiveOptions = !hasMatch && value
    ? [...options, { value, label: `${value} (current)` }]
    : options;
  return (
    <div>
      <Label className="mb-1 text-xs">{label}</Label>
      <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {effectiveOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
