import { useState, useMemo, useCallback } from 'react';
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

interface FormState {
  // Tab 1: Basic Info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone: string;
  dateOfBirth: string;
  gender: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  // Tab 2: Qualification
  highestQualification: string;
  specialization: string;
  institutionName: string;
  yearOfPassing: string;
  percentageOrCgpa: string;
  workExperience: string;
  currentOccupation: string;
  // Tab 3: Enrolment
  courseId: string;
  centreId: string;
  batchId: string;
  enrollmentDate: string;
  feePlan: string;
  discount: string;
  referralCode: string;
  // Tab 4: LMS/CRM
  leadSource: string;
  assignedCounsellor: string;
  applicationStatus: string;
  notes: string;
  crmTags: string;
}

const emptyForm: FormState = {
  firstName: '', lastName: '', email: '', phone: '', alternatePhone: '',
  dateOfBirth: '', gender: '', addressLine1: '', addressLine2: '',
  city: '', state: '', pincode: '', country: 'India',
  highestQualification: '', specialization: '', institutionName: '',
  yearOfPassing: '', percentageOrCgpa: '', workExperience: '', currentOccupation: '',
  courseId: '', centreId: '', batchId: '', enrollmentDate: '',
  feePlan: '', discount: '', referralCode: '',
  leadSource: '', assignedCounsellor: '', applicationStatus: 'pending',
  notes: '', crmTags: '',
};

const TAB_LABELS = ['Basic Info', 'Qualification', 'Enrolment', 'LMS / CRM'];

const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function AddApplicationPage({ api, session, onNavigate }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Load dropdown data
  const { data: refData, loading: refLoading } = useAdminPageData(
    () => api.loadApplications(session.token),
    [],
  );

  const courses = useMemo(() => refData?.courses ?? [], [refData]);
  const centres = useMemo(() => refData?.centres ?? [], [refData]);

  // Load counsellors for dropdown
  const { data: counsellors } = useAdminPageData(
    () => api.loadPipelineUsers(session.token, 9),
    [],
  );

  // Load batches
  const { data: batchesData } = useAdminPageData(
    () => api.loadBatches(session.token),
    [],
  );
  const batches = useMemo(() => toRecords(batchesData), [batchesData]);

  const set = useCallback((key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.firstName.trim()) { alert('First name is required.'); setActiveTab(0); return; }
    if (!form.email.trim()) { alert('Email is required.'); setActiveTab(0); return; }
    if (!form.phone.trim()) { alert('Phone is required.'); setActiveTab(0); return; }

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
        address_line_1: form.addressLine1.trim(),
        address_line_2: form.addressLine2.trim(),
        city: form.city.trim(),
        state: form.state,
        pincode: form.pincode.trim(),
        country: form.country.trim(),
        highest_qualification: form.highestQualification,
        specialization: form.specialization.trim(),
        institution_name: form.institutionName.trim(),
        year_of_passing: form.yearOfPassing.trim(),
        percentage_or_cgpa: form.percentageOrCgpa.trim(),
        work_experience: form.workExperience,
        current_occupation: form.currentOccupation.trim(),
        course_id: form.courseId,
        centre_id: form.centreId,
        batch_id: form.batchId,
        enrollment_date: form.enrollmentDate,
        fee_plan: form.feePlan.trim(),
        discount: form.discount.trim(),
        referral_code: form.referralCode.trim(),
        lead_source: form.leadSource,
        assigned_counsellor: form.assignedCounsellor,
        application_status: form.applicationStatus || 'pending',
        notes: form.notes.trim(),
        crm_tags: form.crmTags.trim(),
      };

      const result = await api.createApplication(session.token, payload);
      if (asString(result.status) === '0' || result.status === 0) {
        alert(asString(result.message) || 'Failed to create application');
      } else {
        onNavigate('/admin/applications');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create application');
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
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Enter email" />
              </div>
              <div className="grid gap-2">
                <Label>Phone *</Label>
                <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Enter phone number" />
              </div>
              <div className="grid gap-2">
                <Label>Alternate Phone</Label>
                <Input value={form.alternatePhone} onChange={(e) => set('alternatePhone', e.target.value)} placeholder="Enter alternate phone" />
              </div>
              <div className="grid gap-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
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
                <Label>Address Line 1</Label>
                <Input value={form.addressLine1} onChange={(e) => set('addressLine1', e.target.value)} placeholder="Enter address" />
              </div>
              <div className="grid gap-2">
                <Label>Address Line 2</Label>
                <Input value={form.addressLine2} onChange={(e) => set('addressLine2', e.target.value)} placeholder="Enter address line 2" />
              </div>
              <div className="grid gap-2">
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Enter city" />
              </div>
              <div className="grid gap-2">
                <Label>State</Label>
                <select className={selectClass} value={form.state} onChange={(e) => set('state', e.target.value)}>
                  <option value="">Select State</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Pincode</Label>
                <Input value={form.pincode} onChange={(e) => set('pincode', e.target.value)} placeholder="Enter pincode" />
              </div>
              <div className="grid gap-2">
                <Label>Country</Label>
                <Input value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="Enter country" />
              </div>
            </div>
          )}

          {/* Tab 2: Qualification */}
          {activeTab === 1 && (
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
                <Label>Institution Name</Label>
                <Input value={form.institutionName} onChange={(e) => set('institutionName', e.target.value)} placeholder="Enter institution name" />
              </div>
              <div className="grid gap-2">
                <Label>Year of Passing</Label>
                <Input value={form.yearOfPassing} onChange={(e) => set('yearOfPassing', e.target.value)} placeholder="e.g. 2023" />
              </div>
              <div className="grid gap-2">
                <Label>Percentage / CGPA</Label>
                <Input value={form.percentageOrCgpa} onChange={(e) => set('percentageOrCgpa', e.target.value)} placeholder="e.g. 85% or 8.5 CGPA" />
              </div>
              <div className="grid gap-2">
                <Label>Work Experience</Label>
                <select className={selectClass} value={form.workExperience} onChange={(e) => set('workExperience', e.target.value)}>
                  <option value="">Select Experience</option>
                  {WORK_EXPERIENCE.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label>Current Occupation</Label>
                <Input value={form.currentOccupation} onChange={(e) => set('currentOccupation', e.target.value)} placeholder="Enter current occupation" />
              </div>
            </div>
          )}

          {/* Tab 3: Enrolment */}
          {activeTab === 2 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Select Course</Label>
                <select className={selectClass} value={form.courseId} onChange={(e) => set('courseId', e.target.value)}>
                  <option value="">Select Course</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Select Centre</Label>
                <select className={selectClass} value={form.centreId} onChange={(e) => set('centreId', e.target.value)}>
                  <option value="">Select Centre</option>
                  {centres.map((c) => <option key={c.id} value={c.id}>{c.centre_name}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Select Batch / Intake</Label>
                <select className={selectClass} value={form.batchId} onChange={(e) => set('batchId', e.target.value)}>
                  <option value="">Select Batch</option>
                  {batches.map((b) => <option key={asString(b.id)} value={asString(b.id)}>{asString(b.title)}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Enrolment Date</Label>
                <Input type="date" value={form.enrollmentDate} onChange={(e) => set('enrollmentDate', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Fee Plan</Label>
                <Input value={form.feePlan} onChange={(e) => set('feePlan', e.target.value)} placeholder="e.g. Full Payment, EMI" />
              </div>
              <div className="grid gap-2">
                <Label>Discount</Label>
                <Input value={form.discount} onChange={(e) => set('discount', e.target.value)} placeholder="e.g. 10%" />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label>Referral Code</Label>
                <Input value={form.referralCode} onChange={(e) => set('referralCode', e.target.value)} placeholder="Enter referral code" />
              </div>
            </div>
          )}

          {/* Tab 4: LMS / CRM */}
          {activeTab === 3 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Lead Source</Label>
                <select className={selectClass} value={form.leadSource} onChange={(e) => set('leadSource', e.target.value)}>
                  <option value="">Select Lead Source</option>
                  {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Assigned Counsellor</Label>
                <select className={selectClass} value={form.assignedCounsellor} onChange={(e) => set('assignedCounsellor', e.target.value)}>
                  <option value="">Select Counsellor</option>
                  {toRecords(counsellors).map((c) => (
                    <option key={asString(c.id)} value={asString(c.id)}>{asString(c.name)}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Application Status</Label>
                <select className={selectClass} value={form.applicationStatus} onChange={(e) => set('applicationStatus', e.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>CRM Tags</Label>
                <Input value={form.crmTags} onChange={(e) => set('crmTags', e.target.value)} placeholder="Comma-separated tags" />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label>Notes / Remarks</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Enter notes or remarks"
                />
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
              onClick={handleSubmit}
            >
              {saving ? 'Submitting...' : 'Submit Application'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
