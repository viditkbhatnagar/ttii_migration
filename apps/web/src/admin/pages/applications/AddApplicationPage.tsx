import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const QUALIFICATIONS = [
  '10th Pass', '12th Pass', 'Diploma', 'Bachelor\'s Degree', 'Master\'s Degree',
  'Ph.D.', 'Professional Certification', 'Other',
];

const WORK_EXPERIENCE = [
  'Fresher', '0-1 Years', '1-3 Years', '3-5 Years', '5-10 Years', '10+ Years',
];

const LEAD_SOURCES = [
  'Website', 'Social Media', 'Referral', 'Walk-in', 'Advertisement',
  'Agent/Associate', 'Event', 'Other',
];

const MODE_OF_STUDY = ['Online', 'Offline', 'Hybrid'];

interface EducationRow {
  qualification: string;
  institution: string;
  yearOfPassing: string;
  percentage: string;
}

interface FormState {
  // Tab 1: Basic Info — Personal Information
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  maritalStatus: string;
  fatherName: string;
  motherName: string;
  guardianName: string;
  aadharNo: string;
  passportNo: string;
  // Tab 1: Basic Info — Contact Information
  email: string;
  phone: string;
  alternatePhone: string;
  whatsappNo: string;
  country: string;
  state: string;
  district: string;
  permanentAddress: string;
  correspondenceAddress: string;
  // Tab 2: Qualification
  highestQualification: string;
  specialization: string;
  institutionName: string;
  yearOfPassing: string;
  employmentStatus: string;
  currentOccupation: string;
  workExperience: string;
  // Tab 3: Enrolment
  courseId: string;
  offeringId: string;
  certificateCombination: string;
  enrollmentDate: string;
  modeOfStudy: string;
  language: string;
  pipeline: string;
  pipelineUser: string;
  leadSource: string;
  // Tab 4: Fee Information
  courseFee: string;
  discount: string;
  gstApplicability: string;
  finalCourseFee: string;
}

const emptyForm: FormState = {
  firstName: '', lastName: '', dateOfBirth: '', gender: '', nationality: 'Indian',
  maritalStatus: '', fatherName: '', motherName: '', guardianName: '',
  aadharNo: '', passportNo: '',
  email: '', phone: '', alternatePhone: '', whatsappNo: '',
  country: 'India', state: '', district: '', permanentAddress: '', correspondenceAddress: '',
  highestQualification: '', specialization: '', institutionName: '',
  yearOfPassing: '', employmentStatus: '', currentOccupation: '', workExperience: '',
  courseId: '', offeringId: '', certificateCombination: '', enrollmentDate: '',
  modeOfStudy: '', language: '', pipeline: '', pipelineUser: '', leadSource: '',
  courseFee: '', discount: '', gstApplicability: 'No', finalCourseFee: '',
};

const TAB_LABELS = ['Basic Info', 'Qualification', 'Enrolment', 'Fee Information'];

const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

function calculateAge(dob: string): string {
  if (!dob) return '';
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age > 0 ? String(age) : '';
}

export default function AddApplicationPage({ api, session, onNavigate }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [educationRows, setEducationRows] = useState<EducationRow[]>([]);

  // Load dropdown data
  const { data: refData, loading: refLoading } = useAdminPageData(
    () => api.loadApplications(session.token),
    [],
  );

  const courses = useMemo(() => refData?.courses ?? [], [refData]);

  // Load offerings for selected course
  const { data: offeringsData } = useAdminPageData(
    () => form.courseId ? api.listOfferings(session.token, { course_id: form.courseId }) : Promise.resolve([]),
    [form.courseId],
  );
  const offerings = useMemo(() => toRecords(offeringsData), [offeringsData]);

  // Load pipeline users (counsellors)
  const { data: counsellors } = useAdminPageData(
    () => api.loadPipelineUsers(session.token, 9),
    [],
  );

  // Load batches
  const { data: batchesData } = useAdminPageData(
    () => api.loadBatches(session.token),
    [],
  );
  const _batches = useMemo(() => toRecords(batchesData), [batchesData]);

  const set = useCallback((key: keyof FormState, value: string) => {
    setForm((f) => {
      const updated = { ...f, [key]: value };
      // Auto-calculate final course fee when discount or courseFee changes
      if (key === 'discount' || key === 'courseFee' || key === 'gstApplicability') {
        const fee = parseFloat(updated.courseFee) || 0;
        const disc = parseFloat(updated.discount) || 0;
        const afterDiscount = fee - (fee * disc / 100);
        const gst = updated.gstApplicability === 'Yes' ? afterDiscount * 0.18 : 0;
        updated.finalCourseFee = (afterDiscount + gst).toFixed(2);
      }
      return updated;
    });
  }, []);

  // Auto-fill course fee when offering is selected
  const handleOfferingChange = useCallback((offeringId: string) => {
    setForm((f) => {
      const offering = offerings.find((o) => asString(o.id) === offeringId);
      const fee = offering ? asString(offering.pricing_amount) : '';
      const updated = { ...f, offeringId, courseFee: fee };
      if (fee) {
        const feeNum = parseFloat(fee) || 0;
        const disc = parseFloat(updated.discount) || 0;
        const afterDiscount = feeNum - (feeNum * disc / 100);
        const gst = updated.gstApplicability === 'Yes' ? afterDiscount * 0.18 : 0;
        updated.finalCourseFee = (afterDiscount + gst).toFixed(2);
      }
      return updated;
    });
  }, [offerings]);

  const addEducationRow = () => {
    setEducationRows((prev) => [...prev, { qualification: '', institution: '', yearOfPassing: '', percentage: '' }]);
  };

  const updateEducationRow = (index: number, field: keyof EducationRow, value: string) => {
    setEducationRows((prev) => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const removeEducationRow = (index: number) => {
    setEducationRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = useCallback(async () => {
    if (!form.firstName.trim()) { toast.error('First name is required.'); setActiveTab(0); return; }
    if (!form.email.trim()) { toast.error('Email is required.'); setActiveTab(0); return; }
    if (!form.phone.trim()) { toast.error('Phone is required.'); setActiveTab(0); return; }

    setSaving(true);
    try {
      const payload: Record<string, string> = {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        alternate_phone: form.alternatePhone.trim(),
        date_of_birth: form.dateOfBirth,
        gender: form.gender,
        nationality: form.nationality.trim(),
        marital_status: form.maritalStatus,
        father_name: form.fatherName.trim(),
        mother_name: form.motherName.trim(),
        guardian_name: form.guardianName.trim(),
        aadhar_no: form.aadharNo.trim(),
        passport_no: form.passportNo.trim(),
        whatsapp_no: form.whatsappNo.trim(),
        country: form.country.trim(),
        state: form.state,
        city: form.district.trim(),
        permanent_address: form.permanentAddress.trim(),
        correspondence_address: form.correspondenceAddress.trim(),
        highest_qualification: form.highestQualification,
        specialization: form.specialization.trim(),
        institution_name: form.institutionName.trim(),
        year_of_passing: form.yearOfPassing.trim(),
        employment_status: form.employmentStatus.trim(),
        current_occupation: form.currentOccupation.trim(),
        work_experience: form.workExperience,
        course_id: form.courseId,
        offering_id: form.offeringId,
        enrollment_date: form.enrollmentDate,
        mode_of_study: form.modeOfStudy,
        language: form.language.trim(),
        pipeline: form.pipeline,
        pipeline_user: form.pipelineUser,
        lead_source: form.leadSource,
        discount: form.discount.trim(),
        gst_applicability: form.gstApplicability,
        application_status: 'pending',
      };

      const result = await api.createApplication(session.token, payload);
      if (asString(result.status) === '0' || result.status === 0) {
        toast.error(asString(result.message) || 'Failed to create application');
      } else {
        onNavigate('/admin/applications');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create application');
    } finally {
      setSaving(false);
    }
  }, [form, api, session.token, onNavigate]);

  const goNext = () => setActiveTab((t) => Math.min(t + 1, 3));
  const goPrev = () => setActiveTab((t) => Math.max(t - 1, 0));

  if (refLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Add Application">
        <Button variant="outline" onClick={() => onNavigate('/admin/applications')}>
          Cancel
        </Button>
      </AdminPageHeader>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-gray-200">
        {TAB_LABELS.map((label, idx) => (
          <button
            key={label}
            type="button"
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === idx ? 'text-ttii-primary' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab(idx)}
          >
            <span className="flex items-center gap-1.5">
              <span className={`flex size-5 items-center justify-center rounded-full text-xs ${
                activeTab === idx ? 'bg-ttii-primary text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {idx + 1}
              </span>
              {label}
            </span>
            {activeTab === idx ? (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ttii-primary" />
            ) : null}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* Tab 1: Basic Info */}
          {activeTab === 0 && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">Personal Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>First Name *</Label>
                    <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Enter first name" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Last Name</Label>
                    <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Enter last name" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Date of Birth</Label>
                    <Input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Age</Label>
                    <Input value={calculateAge(form.dateOfBirth)} readOnly className="bg-gray-50" placeholder="Auto-calculated" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Gender</Label>
                    <select className={selectClass} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Nationality</Label>
                    <Input value={form.nationality} onChange={(e) => set('nationality', e.target.value)} placeholder="Enter nationality" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Marital Status</Label>
                    <select className={selectClass} value={form.maritalStatus} onChange={(e) => set('maritalStatus', e.target.value)}>
                      <option value="">Select Marital Status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Father Name</Label>
                    <Input value={form.fatherName} onChange={(e) => set('fatherName', e.target.value)} placeholder="Enter father's name" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Mother Name</Label>
                    <Input value={form.motherName} onChange={(e) => set('motherName', e.target.value)} placeholder="Enter mother's name" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Guardian Name (if applicable)</Label>
                    <Input value={form.guardianName} onChange={(e) => set('guardianName', e.target.value)} placeholder="Enter guardian's name" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Aadhar Number</Label>
                    <Input value={form.aadharNo} onChange={(e) => set('aadharNo', e.target.value)} placeholder="Enter Aadhar number" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Passport Number</Label>
                    <Input value={form.passportNo} onChange={(e) => set('passportNo', e.target.value)} placeholder="Enter passport number" />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">Contact Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Email ID *</Label>
                    <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Enter email" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Phone Number *</Label>
                    <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Enter phone number" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Alternate Phone Number</Label>
                    <Input value={form.alternatePhone} onChange={(e) => set('alternatePhone', e.target.value)} placeholder="Enter alternate phone" />
                  </div>
                  <div className="grid gap-2">
                    <Label>WhatsApp Number</Label>
                    <Input value={form.whatsappNo} onChange={(e) => set('whatsappNo', e.target.value)} placeholder="Enter WhatsApp number" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Country</Label>
                    <Input value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="Enter country" />
                  </div>
                  <div className="grid gap-2">
                    <Label>State</Label>
                    <select className={selectClass} value={form.state} onChange={(e) => set('state', e.target.value)}>
                      <option value="">Select State</option>
                      {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>District</Label>
                    <Input value={form.district} onChange={(e) => set('district', e.target.value)} placeholder="Enter district" />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Permanent Address</Label>
                    <textarea
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={form.permanentAddress}
                      onChange={(e) => set('permanentAddress', e.target.value)}
                      placeholder="Enter permanent address"
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Correspondence Address</Label>
                    <textarea
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={form.correspondenceAddress}
                      onChange={(e) => set('correspondenceAddress', e.target.value)}
                      placeholder="Enter correspondence address"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Qualification */}
          {activeTab === 1 && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Highest Qualification</Label>
                  <select className={selectClass} value={form.highestQualification} onChange={(e) => set('highestQualification', e.target.value)}>
                    <option value="">Select Qualification</option>
                    {QUALIFICATIONS.map((q) => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Specialization</Label>
                  <Input value={form.specialization} onChange={(e) => set('specialization', e.target.value)} placeholder="Enter specialization" />
                </div>
                <div className="grid gap-2">
                  <Label>School / College</Label>
                  <Input value={form.institutionName} onChange={(e) => set('institutionName', e.target.value)} placeholder="Enter school/college name" />
                </div>
                <div className="grid gap-2">
                  <Label>Year of Passing</Label>
                  <Input value={form.yearOfPassing} onChange={(e) => set('yearOfPassing', e.target.value)} placeholder="e.g. 2023" />
                </div>
                <div className="grid gap-2">
                  <Label>Current Employment Status</Label>
                  <select className={selectClass} value={form.employmentStatus} onChange={(e) => set('employmentStatus', e.target.value)}>
                    <option value="">Select Status</option>
                    <option value="Employed">Employed</option>
                    <option value="Self-Employed">Self-Employed</option>
                    <option value="Unemployed">Unemployed</option>
                    <option value="Student">Student</option>
                    <option value="Homemaker">Homemaker</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Current Occupation</Label>
                  <Input value={form.currentOccupation} onChange={(e) => set('currentOccupation', e.target.value)} placeholder="Enter current occupation" />
                </div>
                <div className="grid gap-2">
                  <Label>Experience</Label>
                  <select className={selectClass} value={form.workExperience} onChange={(e) => set('workExperience', e.target.value)}>
                    <option value="">Select Experience</option>
                    {WORK_EXPERIENCE.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>

              {/* Education Pathway */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Education Pathway</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addEducationRow}>
                    Add Row
                  </Button>
                </div>
                {educationRows.length > 0 ? (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Qualification</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Institution</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Year of Passing</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Percentage / Grade</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {educationRows.map((row, idx) => (
                          <tr key={idx} className="border-b last:border-b-0">
                            <td className="px-2 py-1.5">
                              <Input value={row.qualification} onChange={(e) => updateEducationRow(idx, 'qualification', e.target.value)} placeholder="e.g. B.Ed." className="h-8 text-sm" />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input value={row.institution} onChange={(e) => updateEducationRow(idx, 'institution', e.target.value)} placeholder="Institution name" className="h-8 text-sm" />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input value={row.yearOfPassing} onChange={(e) => updateEducationRow(idx, 'yearOfPassing', e.target.value)} placeholder="e.g. 2023" className="h-8 text-sm" />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input value={row.percentage} onChange={(e) => updateEducationRow(idx, 'percentage', e.target.value)} placeholder="e.g. 85%" className="h-8 text-sm" />
                            </td>
                            <td className="px-2 py-1.5">
                              <Button type="button" variant="ghost" size="sm" className="size-7 p-0 text-red-500 hover:text-red-700" aria-label="Remove education row" onClick={() => removeEducationRow(idx)}>
                                <Trash2 className="size-3.5" aria-hidden="true" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-3 text-center border rounded-md">No education pathway entries. Click "Add Row" to add.</p>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Enrolment */}
          {activeTab === 2 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Course</Label>
                <select className={selectClass} value={form.courseId} onChange={(e) => set('courseId', e.target.value)}>
                  <option value="">Select Course</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Course Offering</Label>
                <select className={selectClass} value={form.offeringId} onChange={(e) => handleOfferingChange(e.target.value)}>
                  <option value="">Select Offering</option>
                  {offerings.map((o) => <option key={asString(o.id)} value={asString(o.id)}>{asString(o.title) || asString(o.offering_code) || 'Untitled'}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Certificate Combination</Label>
                <Input value={form.certificateCombination} onChange={(e) => set('certificateCombination', e.target.value)} placeholder="Enter certificate combination" />
              </div>
              <div className="grid gap-2">
                <Label>Date of Enrolment</Label>
                <Input type="date" value={form.enrollmentDate} onChange={(e) => set('enrollmentDate', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Mode of Study</Label>
                <select className={selectClass} value={form.modeOfStudy} onChange={(e) => set('modeOfStudy', e.target.value)}>
                  <option value="">Select Mode</option>
                  {MODE_OF_STUDY.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Language</Label>
                <Input value={form.language} onChange={(e) => set('language', e.target.value)} placeholder="Enter preferred language" />
              </div>
              <div className="grid gap-2">
                <Label>Pipeline</Label>
                <select className={selectClass} value={form.pipeline} onChange={(e) => set('pipeline', e.target.value)}>
                  <option value="">Select Pipeline</option>
                  <option value="senders">Senders</option>
                  <option value="9">Counsellors</option>
                  <option value="student_referral">Student Referral</option>
                  <option value="10">Associates</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Pipeline User</Label>
                <select className={selectClass} value={form.pipelineUser} onChange={(e) => set('pipelineUser', e.target.value)}>
                  <option value="">Select Pipeline User</option>
                  {toRecords(counsellors).map((c) => (
                    <option key={asString(c.id)} value={asString(c.id)}>{asString(c.name)}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Lead Source</Label>
                <select className={selectClass} value={form.leadSource} onChange={(e) => set('leadSource', e.target.value)}>
                  <option value="">Select Lead Source</option>
                  {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Tab 4: Fee Information */}
          {activeTab === 3 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Course Fee</Label>
                <Input value={form.courseFee} readOnly className="bg-gray-50" placeholder="Auto-filled from offering" />
                <p className="text-xs text-gray-400">Static — Based on Course Offering</p>
              </div>
              <div className="grid gap-2">
                <Label>Discount (%)</Label>
                <Input value={form.discount} onChange={(e) => set('discount', e.target.value)} placeholder="e.g. 10" />
              </div>
              <div className="grid gap-2">
                <Label>GST Applicability</Label>
                <select className={selectClass} value={form.gstApplicability} onChange={(e) => set('gstApplicability', e.target.value)}>
                  <option value="No">No</option>
                  <option value="Yes">Yes (18%)</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Final Course Fee</Label>
                <Input value={form.finalCourseFee ? `₹${form.finalCourseFee}` : ''} readOnly className="bg-gray-50 font-semibold" placeholder="Auto-calculated" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom buttons */}
      <div className="flex items-center justify-between">
        <div>
          {activeTab > 0 && (
            <Button variant="outline" onClick={goPrev}>
              Previous
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onNavigate('/admin/applications')}>
            Cancel
          </Button>
          {activeTab < 3 ? (
            <Button className="bg-ttii-primary hover:bg-ttii-primary/90" onClick={goNext}>
              Save and Next
            </Button>
          ) : (
            <Button
              className="bg-ttii-primary hover:bg-ttii-primary/90"
              disabled={saving}
              onClick={() => { void handleSubmit(); }}
            >
              {saving ? 'Submitting...' : 'Submit Application'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
