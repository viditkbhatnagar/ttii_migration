import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { PhoneInput } from '../../shared/components/PhoneInput.js';
import { PhotoUpload } from '../../shared/components/PhotoUpload.js';
import { COUNTRIES, INDIAN_STATES, getDistrictsForState } from '@/lib/locations';
import { verifyEmailWithFeedback } from '@/lib/email-verify-helper';
import { titleCaseOnBlur } from '@/lib/text-format';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const QUALIFICATIONS = [
  'Secondary School', 'Higher Secondary', 'Diploma', "Bachelor's Degree",
  'Postgraduate Diploma', "Master's Degree", 'M.Phil.', 'Ph.D.',
  'Professional Certification', 'Other',
];

const WORK_EXPERIENCE = [
  'Fresher', '0-1 Years', '1-3 Years', '3-5 Years', '5-10 Years', '10+ Years',
];

const LEAD_SOURCES = [
  'Facebook', 'WhatsApp', 'Email', 'Website', 'Walk-in', 'Call-in', 'Reference',
];

const MODE_OF_STUDY = ['Online', 'Offline', 'Hybrid'];

const PIPELINE_ROLE_MAP: Record<string, number> = {
  Admin: 8,
  Counsellor: 9,
  Associate: 10,
};


// Year-of-passing options: current+1 down to 1960. Generated once.
const YEAR_OPTIONS = (() => {
  const current = new Date().getFullYear();
  const years: string[] = [];
  for (let y = current + 1; y >= 1960; y--) years.push(String(y));
  return years;
})();

interface EducationRow {
  qualification: string;
  institution: string;
  yearOfPassing: string;
  percentage: string;
}

interface FormState {
  // Tab 1: Basic Info — Personal Information
  photoUrl: string;
  fullName: string;
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
  phoneCountryCode: string;
  phone: string;
  alternatePhone: string;
  whatsappCountryCode: string;
  whatsappNo: string;
  country: string;
  state: string;
  district: string;
  permanentAddress: string;
  correspondenceAddress: string;
  correspondenceSameAsPermanent: boolean;
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
  applicationDate: string;
  enrollmentDate: string;
  modeOfStudy: string;
  language: string;
  pipeline: string;
  pipelineUser: string;
  leadSource: string;
  referenceStudentId: string;
  // Tab 4: Fee Information
  courseFee: string;
  registrationFee: string;
  discountType: 'percent' | 'flat';
  discount: string;
  gstPercent: string;
  gstApplicability: string;
  finalCourseFee: string;
  installmentCount: string;
  installmentStartDate: string;
  preferredPaymentDay: string;
}

interface InstallmentRow {
  description: string;
  due_date: string;
  amount: string;
  gst: string;
  total: string;
}

interface DocumentRow {
  name: string;
  url: string;
  document_type_id?: string;
}

interface RequiredDocSlot {
  document_type_id: string;
  label: string;
  is_mandatory: boolean;
}

const emptyForm: FormState = {
  photoUrl: '',
  fullName: '', dateOfBirth: '', gender: '', nationality: 'India',
  maritalStatus: '', fatherName: '', motherName: '', guardianName: '',
  aadharNo: '', passportNo: '',
  email: '',
  phoneCountryCode: '91', phone: '',
  alternatePhone: '',
  whatsappCountryCode: '91', whatsappNo: '',
  country: 'India', state: '', district: '',
  permanentAddress: '', correspondenceAddress: '', correspondenceSameAsPermanent: false,
  highestQualification: '', specialization: '', institutionName: '',
  yearOfPassing: '', employmentStatus: '', currentOccupation: '', workExperience: '',
  courseId: '', offeringId: '', certificateCombination: '',
  applicationDate: new Date().toISOString().split('T')[0] ?? '',
  enrollmentDate: '',
  modeOfStudy: '', language: '', pipeline: '', pipelineUser: '', leadSource: '',
  referenceStudentId: '',
  courseFee: '', registrationFee: '', discountType: 'percent', discount: '',
  gstPercent: '18', gstApplicability: 'No', finalCourseFee: '',
  installmentCount: '', installmentStartDate: '', preferredPaymentDay: '5',
};

const TAB_LABELS = ['Basic Info', 'Qualification', 'Enrolment', 'Documents', 'Fee Information'];
const TAB_BASIC = 0;
const TAB_QUAL = 1;
const TAB_ENROL = 2;
const TAB_DOCS = 3;
const TAB_FEE = 4;

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
  // Naji 2026-05-08 — same component handles both Add and Edit. The
  // route /admin/applications/edit/:id (or ?edit=1 query) flips us into
  // edit mode: we load the application once, prefill the form, change
  // the page title, and POST to /admin/applications/edit on save.
  const editId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const path = window.location.pathname;
    const m = path.match(/^\/admin\/applications\/edit\/(\d+)$/);
    if (m) return m[1] ?? '';
    return '';
  }, []);
  const isEditMode = editId !== '';

  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editLoading, setEditLoading] = useState(isEditMode);
  const [educationRows, setEducationRows] = useState<EducationRow[]>([]);
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);

  // Pre-fill from the existing application row when in edit mode.
  useEffect(() => {
    if (!isEditMode || !editId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.getApplication(session.token, editId);
        if (cancelled) return;
        const r = (res as { application?: Record<string, unknown> }).application;
        if (!r) {
          toast.error('Application not found');
          return;
        }
        const a = r;
        const dob = asString(a.date_of_birth);
        const enrolDate = asString(a.enrollment_date);
        const appDate = asString(a.created_at);
        const fullName = asString(a.name);
        // Best-effort split of "Last, First" / "First Last" / "First M Last".
        const nameParts = fullName.split(/\s+/);
        const phoneRaw = asString(a.phone);
        const phoneCC = asString(a.country_code).replace(/\+/g, '') || '91';
        const whatsRaw = asString(a.whatsapp) || asString(a.whatsapp_no);
        const whatsParts = whatsRaw.match(/^\+?(\d{1,3})\s+(.+)$/);
        // Pull biography JSON keys back out for prefill.
        let bio: Record<string, unknown> = {};
        try { bio = a.biography ? (JSON.parse(asString(a.biography)) as Record<string, unknown>) : {}; }
        catch { bio = {}; }
        setForm((cur) => ({
          ...cur,
          fullName,
          firstName: nameParts.slice(0, -1).join(' ') || nameParts[0] || '',
          lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] || '' : '',
          dateOfBirth: dob ? dob.slice(0, 10) : '',
          gender: asString(a.gender),
          nationality: asString(a.nationality_name) || asString(a.nationality) || 'India',
          maritalStatus: asString(a.marital_status),
          fatherName: asString(a.father_name),
          motherName: asString(a.mother_name),
          guardianName: asString(a.guardian_name),
          aadharNo: asString(a.aadhar_no),
          passportNo: asString(a.passport_no),
          email: asString(a.user_email) || asString(a.email),
          phoneCountryCode: phoneCC,
          phone: phoneRaw.replace(/^\+\d+\s*/, '').trim(),
          alternatePhone: asString(a.second_phone),
          whatsappCountryCode: whatsParts ? (whatsParts[1] ?? '91') : '91',
          whatsappNo: whatsParts ? (whatsParts[2] ?? '') : whatsRaw,
          country: asString(a.country_name) || asString(a.country) || asString(a.country_id) || '',
          state: asString(a.state),
          district: asString(a.district),
          permanentAddress: asString(a.address),
          correspondenceAddress: asString(a.native_address),
          photoUrl: asString(a.image),
          highestQualification: asString(a.highest_qualification),
          specialization: asString(bio.specialization) || asString(a.specialization),
          institutionName: asString(a.previous_school),
          yearOfPassing: asString(a.year_of_passing),
          employmentStatus: asString(a.employment_status),
          currentOccupation: asString(a.current_occupation),
          workExperience: asString(a.experience_years) || asString(a.teaching_experience),
          courseId: asString(a.course_id),
          offeringId: asString(a.offering_id),
          certificateCombination: asString(a.certificate_combination_id),
          applicationDate: appDate ? appDate.slice(0, 10) : '',
          enrollmentDate: enrolDate || '',
          modeOfStudy: asString(a.mode_of_study),
          language: asString(a.language_name) || asString(a.preferred_language),
          pipeline: asString(a.pipeline),
          pipelineUser: asString(a.pipeline_user),
          leadSource: asString(a.marketing_source).startsWith('Reference#') ? 'Reference' : asString(a.marketing_source),
          referenceStudentId: asString(a.marketing_source).startsWith('Reference#') ? asString(a.marketing_source).slice('Reference#'.length) : '',
          discount: a.application_discount != null ? asString(a.application_discount) || asNumber(a.application_discount).toString() : '',
          discountType: (asString(bio.discount_type) || 'percent') as 'percent' | 'flat',
          registrationFee: asString(bio.registration_fee),
          gstPercent: a.application_gst_percent != null ? asString(a.application_gst_percent) || asNumber(a.application_gst_percent).toString() : '',
          gstApplicability: a.application_gst_percent != null ? 'Yes' : 'No',
          finalCourseFee: a.application_final_fee != null ? asString(a.application_final_fee) || asNumber(a.application_final_fee).toString() : '',
        }));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load application');
      } finally {
        if (!cancelled) setEditLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, session.token, isEditMode, editId]);

  // Load dropdown data
  const { data: refData, loading: refLoading } = useAdminPageData(
    () => api.loadApplications(session.token),
    [],
  );

  // Naji 2026-05-12 — only Published courses in the Application dropdown.
  // Drafts were leaking in.
  const courses = useMemo(() => {
    const all = (refData?.courses ?? []) as Array<Record<string, unknown>>;
    return all.filter((c) => {
      const status = c.status;
      return typeof status === 'string' && status.toLowerCase() === 'published';
    });
  }, [refData]);

  // Load offerings for selected course
  const { data: offeringsData } = useAdminPageData(
    () => form.courseId ? api.listOfferings(session.token, { course_id: form.courseId }) : Promise.resolve([]),
    [form.courseId],
  );
  const offerings = useMemo(() => toRecords(offeringsData), [offeringsData]);

  // Load batches
  const { data: batchesData } = useAdminPageData(
    () => api.loadBatches(session.token),
    [],
  );
  const _batches = useMemo(() => toRecords(batchesData), [batchesData]);

  // Load certificate combinations once; filter client-side by selected course
  // (combinations carry course_id; offering scope is implied by course).
  const { data: combinationsData } = useAdminPageData(
    () => api.listCertificateCombinations(session.token),
    [],
  );
  const certificateCombinations = useMemo(() => {
    const all = toRecords(combinationsData);
    if (!form.courseId) return all;
    return all.filter((c) => asString(c.course_id) === form.courseId);
  }, [combinationsData, form.courseId]);

  // Languages dropdown source (replaces free-text input).
  const { data: languagesData } = useAdminPageData(
    () => api.loadLanguages(session.token),
    [],
  );
  const languages = useMemo(() => toRecords(languagesData), [languagesData]);

  // Pipeline User options depend on the selected Pipeline (Admin/Counsellor/
  // Associate map to a role; Centre lists centres).
  const { data: pipelineUsersData } = useAdminPageData(
    () => {
      if (form.pipeline === 'Centre') return api.loadCentres(session.token);
      const roleId = PIPELINE_ROLE_MAP[form.pipeline];
      if (!roleId) return Promise.resolve([]);
      return api.loadPipelineUsers(session.token, roleId);
    },
    [form.pipeline],
  );
  const pipelineUsers = useMemo(() => toRecords(pipelineUsersData), [pipelineUsersData]);

  // Lead Source = Reference reveals a student picker.
  const { data: studentsData } = useAdminPageData(
    () => form.leadSource === 'Reference' ? api.loadStudents(session.token, {}) : Promise.resolve([]),
    [form.leadSource],
  );
  const students = useMemo(() => toRecords(studentsData), [studentsData]);

  // Required documents per the chosen course (defined under Settings →
  // Document Types and attached to a course on the Course form). Drives
  // the labelled upload slots on Tab 4.
  const { data: requiredDocsData } = useAdminPageData(
    () => form.courseId
      ? api.listCourseRequiredDocuments(session.token, form.courseId)
      : Promise.resolve([]),
    [form.courseId],
  );

  // Certificate packages for the chosen offering — each row carries the
  // registration_fee and gst_percent that drive Tab 4's pricing once a
  // certificate combination is picked.
  const { data: offeringPackagesData } = useAdminPageData(
    () => form.offeringId
      ? api.listOfferingPackages(session.token, form.offeringId)
      : Promise.resolve([]),
    [form.offeringId],
  );
  const offeringPackages = useMemo(() => toRecords(offeringPackagesData), [offeringPackagesData]);
  const requiredDocSlots = useMemo<RequiredDocSlot[]>(() => {
    return toRecords(requiredDocsData).map((r) => ({
      document_type_id: asString(r.document_type_id),
      label: asString(r.label),
      is_mandatory: r.is_mandatory !== false,
    })).filter((r) => r.document_type_id);
  }, [requiredDocsData]);


  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => {
      const updated = { ...f, [key]: value };
      if (
        key === 'discount' || key === 'courseFee' || key === 'gstApplicability' ||
        key === 'discountType' || key === 'gstPercent'
      ) {
        const fee = parseFloat(updated.courseFee) || 0;
        const disc = parseFloat(updated.discount) || 0;
        const afterDiscount = updated.discountType === 'flat'
          ? Math.max(0, fee - disc)
          : fee - (fee * disc / 100);
        const gstPct = parseFloat(updated.gstPercent) || 0;
        const gst = updated.gstApplicability === 'Yes' ? afterDiscount * (gstPct / 100) : 0;
        updated.finalCourseFee = (afterDiscount + gst).toFixed(2);
      }
      return updated;
    });
  }, []);

  // "Use same as permanent" — keep correspondence address synced when toggle on.
  useEffect(() => {
    if (form.correspondenceSameAsPermanent && form.correspondenceAddress !== form.permanentAddress) {
      setForm((f) => ({ ...f, correspondenceAddress: f.permanentAddress }));
    }
  }, [form.correspondenceSameAsPermanent, form.permanentAddress, form.correspondenceAddress]);

  // Reset district when state changes (the previous value almost certainly
  // doesn't belong to the new state).
  useEffect(() => {
    setForm((f) => (f.district ? { ...f, district: '' } : f));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.state]);

  // When country changes off India, clear state/district (those lists are
  // India-specific) and let the user enter free-text below.
  useEffect(() => {
    if (form.country !== 'India') {
      setForm((f) => (f.state || f.district ? { ...f, state: '', district: '' } : f));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.country]);

  // Cascade: changing Course invalidates the chosen Offering / Combination.
  useEffect(() => {
    setForm((f) => (f.offeringId || f.certificateCombination ? { ...f, offeringId: '', certificateCombination: '' } : f));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.courseId]);

  // Cascade: changing Pipeline invalidates the chosen Pipeline User.
  useEffect(() => {
    setForm((f) => (f.pipelineUser ? { ...f, pipelineUser: '' } : f));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.pipeline]);

  // Cascade: leaving Lead Source = Reference clears the referenced student.
  useEffect(() => {
    if (form.leadSource !== 'Reference') {
      setForm((f) => (f.referenceStudentId ? { ...f, referenceStudentId: '' } : f));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.leadSource]);

  // When the user picks a Certificate Combination, pull its package's
  // pricing (offered_fee, registration_fee, gst_percent) so Tab 5's pricing
  // matches Naji's "Registration Fee defined per package" model.
  useEffect(() => {
    if (!form.certificateCombination) return;
    const pkg = offeringPackages.find(
      (p) => asString(p.combination_id) === form.certificateCombination,
    );
    if (!pkg) return;
    const offered = asNumber(pkg.offered_fee);
    const baseFee = offered ? String(offered) : asString(pkg.base_fee) ? String(asNumber(pkg.base_fee)) : '';
    const regFee = pkg.registration_fee != null ? String(asNumber(pkg.registration_fee)) : '';
    const gstPct = pkg.gst_percent != null ? String(asNumber(pkg.gst_percent)) : '';
    setForm((f) => {
      const updated = {
        ...f,
        courseFee: baseFee || f.courseFee,
        registrationFee: regFee || f.registrationFee,
        gstPercent: gstPct || f.gstPercent,
      };
      const fee = parseFloat(updated.courseFee) || 0;
      const disc = parseFloat(updated.discount) || 0;
      const afterDiscount = updated.discountType === 'flat'
        ? Math.max(0, fee - disc)
        : fee - (fee * disc / 100);
      const gstNum = parseFloat(updated.gstPercent) || 0;
      const gst = updated.gstApplicability === 'Yes' ? afterDiscount * (gstNum / 100) : 0;
      updated.finalCourseFee = (afterDiscount + gst).toFixed(2);
      return updated;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.certificateCombination, offeringPackages]);

  const districtList = useMemo(
    () => (form.country === 'India' && form.state ? getDistrictsForState(form.state) : null),
    [form.country, form.state],
  );

  // Auto-fill fee fields when offering is selected. Pull registration_fee
  // and gst_percent off the offering record if the backend exposes them;
  // fall back to sensible defaults otherwise.
  const handleOfferingChange = useCallback((offeringId: string) => {
    setForm((f) => {
      const offering = offerings.find((o) => asString(o.id) === offeringId);
      const fee = offering ? asString(offering.pricing_amount) : '';
      const regFee = offering ? (asString(offering.registration_fee) || asString(offering.reg_fee)) : '';
      const offeringGst = offering ? asString(offering.gst_percent) : '';
      const updated = {
        ...f,
        offeringId,
        courseFee: fee,
        registrationFee: regFee || f.registrationFee,
        gstPercent: offeringGst || f.gstPercent || '18',
      };
      if (fee) {
        const feeNum = parseFloat(fee) || 0;
        const disc = parseFloat(updated.discount) || 0;
        const afterDiscount = updated.discountType === 'flat'
          ? Math.max(0, feeNum - disc)
          : feeNum - (feeNum * disc / 100);
        const gstPct = parseFloat(updated.gstPercent) || 0;
        const gst = updated.gstApplicability === 'Yes' ? afterDiscount * (gstPct / 100) : 0;
        updated.finalCourseFee = (afterDiscount + gst).toFixed(2);
      }
      return updated;
    });
  }, [offerings]);

  const generateInstallments = useCallback(() => {
    const count = parseInt(form.installmentCount, 10) || 0;
    if (count <= 0) { toast.error('Enter how many installments to generate.'); return; }
    if (!form.installmentStartDate) { toast.error('Pick a start date.'); return; }
    const total = parseFloat(form.finalCourseFee) || 0;
    const reg = parseFloat(form.registrationFee) || 0;
    const remaining = Math.max(0, total - reg);
    const per = count > 0 ? remaining / count : 0;
    const gstPct = parseFloat(form.gstPercent) || 0;
    const includeGst = form.gstApplicability === 'Yes';

    const start = new Date(form.installmentStartDate);
    const day = parseInt(form.preferredPaymentDay, 10) || start.getDate();
    const rows: InstallmentRow[] = [];
    if (reg > 0) {
      const gstAmt = includeGst ? (reg * gstPct / 100) : 0;
      rows.push({
        description: 'Registration Fee',
        due_date: form.installmentStartDate,
        amount: reg.toFixed(2),
        gst: gstAmt.toFixed(2),
        total: (reg + gstAmt).toFixed(2),
      });
    }
    for (let i = 0; i < count; i++) {
      const due = new Date(start.getFullYear(), start.getMonth() + i, day);
      const yyyy = due.getFullYear();
      const mm = String(due.getMonth() + 1).padStart(2, '0');
      const dd = String(due.getDate()).padStart(2, '0');
      const gstAmt = includeGst ? (per * gstPct / 100) : 0;
      rows.push({
        description: `Installment ${i + 1}`,
        due_date: `${yyyy}-${mm}-${dd}`,
        amount: per.toFixed(2),
        gst: gstAmt.toFixed(2),
        total: (per + gstAmt).toFixed(2),
      });
    }
    setInstallments(rows);
  }, [form.installmentCount, form.installmentStartDate, form.finalCourseFee, form.registrationFee, form.gstPercent, form.gstApplicability, form.preferredPaymentDay]);

  const updateInstallment = (idx: number, patch: Partial<InstallmentRow>) => {
    setInstallments((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const removeInstallment = (idx: number) => {
    setInstallments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDocumentUpload = useCallback(async (file: File, documentTypeId?: string) => {
    try {
      const result = await api.uploadFile(session.token, file);
      setDocuments((prev) => {
        // For a typed slot, replace any existing upload for that slot.
        const filtered = documentTypeId
          ? prev.filter((d) => d.document_type_id !== documentTypeId)
          : prev;
        const row: DocumentRow = { name: file.name, url: result.url };
        if (documentTypeId) row.document_type_id = documentTypeId;
        return [...filtered, row];
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload document');
    }
  }, [api, session.token]);
  const removeDocument = (idx: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== idx));
  };

  const addEducationRow = () => {
    setEducationRows((prev) => [...prev, { qualification: '', institution: '', yearOfPassing: '', percentage: '' }]);
  };

  const updateEducationRow = (index: number, field: keyof EducationRow, value: string) => {
    setEducationRows((prev) => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const removeEducationRow = (index: number) => {
    setEducationRows((prev) => prev.filter((_, i) => i !== index));
  };

  // Per-tab mandatory-field check. Returns { tab, label } of the first
  // missing field on or before `upTo`, or null when everything's filled.
  // Used by both goNext (validate current tab before advancing) and
  // handleSubmit (validate all 5 tabs before sending the payload).
  const findMissingField = useCallback((upTo: number): { tab: number; label: string } | null => {
    if (upTo >= TAB_BASIC) {
      const fullName = form.fullName.trim();
      const tab1: { value: string; label: string }[] = [
        { value: form.photoUrl, label: 'Profile Photo' },
        { value: fullName, label: 'Full Name' },
        { value: form.dateOfBirth, label: 'Date of Birth' },
        { value: form.gender, label: 'Gender' },
        { value: form.nationality.trim(), label: 'Nationality' },
        { value: form.maritalStatus, label: 'Marital Status' },
        { value: form.fatherName.trim(), label: "Father's Name" },
        { value: form.motherName.trim(), label: "Mother's Name" },
        { value: form.aadharNo.trim(), label: 'Aadhar Number' },
        { value: form.passportNo.trim(), label: 'Passport Number' },
        { value: form.email.trim(), label: 'Email' },
        { value: form.phone.trim(), label: 'Phone' },
        { value: form.alternatePhone.trim(), label: 'Alternate Phone' },
        { value: form.whatsappNo.trim(), label: 'WhatsApp Number' },
        { value: form.country.trim(), label: 'Country' },
        { value: form.state.trim(), label: 'State' },
        { value: form.district.trim(), label: 'District' },
        { value: form.permanentAddress.trim(), label: 'Permanent Address' },
        {
          value: form.correspondenceSameAsPermanent
            ? form.permanentAddress.trim()
            : form.correspondenceAddress.trim(),
          label: 'Correspondence Address',
        },
      ];
      const miss1 = tab1.find((r) => !r.value);
      if (miss1) return { tab: TAB_BASIC, label: miss1.label };
      if (!EMAIL_REGEX.test(form.email.trim())) return { tab: TAB_BASIC, label: 'Email (invalid format)' };
    }
    if (upTo >= TAB_QUAL) {
      const tab2: { value: string; label: string }[] = [
        { value: form.highestQualification, label: 'Highest Qualification' },
        { value: form.institutionName.trim(), label: 'School / College' },
        { value: form.yearOfPassing, label: 'Year of Passing' },
        { value: form.employmentStatus, label: 'Current Employment Status' },
        { value: form.workExperience, label: 'Experience' },
      ];
      const miss2 = tab2.find((r) => !r.value);
      if (miss2) return { tab: TAB_QUAL, label: miss2.label };
    }
    if (upTo >= TAB_ENROL) {
      const tab3: { value: string; label: string }[] = [
        { value: form.courseId, label: 'Course' },
        { value: form.offeringId, label: 'Course Offering' },
        { value: form.certificateCombination, label: 'Certificate Combination' },
        { value: form.applicationDate, label: 'Date of Application' },
        { value: form.modeOfStudy, label: 'Mode of Study' },
        { value: form.language, label: 'Language' },
        { value: form.pipeline, label: 'Pipeline' },
        { value: form.pipelineUser, label: 'Pipeline User' },
        { value: form.leadSource, label: 'Lead Source' },
      ];
      const miss3 = tab3.find((r) => !r.value);
      if (miss3) return { tab: TAB_ENROL, label: miss3.label };
      if (form.leadSource === 'Reference' && !form.referenceStudentId) {
        return { tab: TAB_ENROL, label: 'Referred By (student)' };
      }
    }
    if (upTo >= TAB_DOCS) {
      const missingDoc = requiredDocSlots.find(
        (slot) => slot.is_mandatory && !documents.some((d) => d.document_type_id === slot.document_type_id),
      );
      if (missingDoc) return { tab: TAB_DOCS, label: `${missingDoc.label} document` };
    }
    return null;
  }, [form, requiredDocSlots, documents]);

  const handleSubmit = useCallback(async () => {
    const fullName = form.fullName.trim();
    const missingAll = findMissingField(TAB_FEE);
    if (missingAll) {
      toast.error(`${missingAll.label} is required.`);
      setActiveTab(missingAll.tab);
      return;
    }

    // Split full name into first/last for the legacy schema. Last name = the
    // last whitespace-separated token; first name = everything before. If
    // the user only typed one word, last name comes through empty (legacy
    // tolerates that).
    const parts = fullName.split(/\s+/);
    const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
    const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : fullName;

    setSaving(true);
    try {
      const payload: Record<string, string> = {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName ?? '',
        email: form.email.trim(),
        phone: `+${form.phoneCountryCode} ${form.phone.trim()}`.trim(),
        country_code: form.phoneCountryCode,
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
        whatsapp_no: form.whatsappNo.trim() ? `+${form.whatsappCountryCode} ${form.whatsappNo.trim()}` : '',
        whatsapp_country_code: form.whatsappCountryCode,
        country: form.country.trim(),
        state: form.state,
        city: form.district.trim(),
        permanent_address: form.permanentAddress.trim(),
        correspondence_address: (form.correspondenceSameAsPermanent ? form.permanentAddress : form.correspondenceAddress).trim(),
        photo_url: form.photoUrl,
        highest_qualification: form.highestQualification,
        specialization: form.specialization.trim(),
        institution_name: form.institutionName.trim(),
        year_of_passing: form.yearOfPassing.trim(),
        employment_status: form.employmentStatus.trim(),
        current_occupation: form.currentOccupation.trim(),
        work_experience: form.workExperience,
        course_id: form.courseId,
        offering_id: form.offeringId,
        certificate_combination_id: form.certificateCombination,
        application_date: form.applicationDate,
        enrollment_date: form.enrollmentDate,
        mode_of_study: form.modeOfStudy,
        language: form.language,
        pipeline: form.pipeline,
        pipeline_user: form.pipelineUser,
        lead_source: form.leadSource,
        reference_student_id: form.leadSource === 'Reference' ? form.referenceStudentId : '',
        discount: form.discount.trim(),
        discount_type: form.discountType,
        registration_fee: form.registrationFee,
        gst_percent: form.gstPercent,
        gst_applicability: form.gstApplicability,
        final_course_fee: form.finalCourseFee,
        installment_plan: JSON.stringify(installments),
        documents: JSON.stringify(documents),
        application_status: 'pending',
      };

      const result = isEditMode && editId
        ? await api.editApplication(session.token, editId, payload)
        : await api.createApplication(session.token, payload);
      if (asString(result.status) === '0' || result.status === 0) {
        toast.error(asString(result.message) || (isEditMode ? 'Failed to update application' : 'Failed to create application'));
      } else {
        toast.success(isEditMode ? 'Application updated.' : 'Application created.');
        onNavigate(isEditMode && editId ? '/admin/applications/view/' + editId : '/admin/applications');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (isEditMode ? 'Failed to update application' : 'Failed to create application'));
    } finally {
      setSaving(false);
    }
  }, [form, api, session.token, onNavigate]);

  const goNext = useCallback(() => {
    // Validate the active tab before advancing — Naji's UAT note:
    // "shouldn't move to next section without filling mandatory fields".
    const missing = findMissingField(activeTab);
    if (missing) {
      toast.error(`${missing.label} is required.`);
      setActiveTab(missing.tab);
      return;
    }
    setActiveTab((t) => Math.min(t + 1, TAB_FEE));
  }, [activeTab, findMissingField]);
  const goPrev = () => setActiveTab((t) => Math.max(t - 1, TAB_BASIC));

  if (refLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (editLoading) {
    return (
      <div className="space-y-4">
        <AdminPageHeader title="Edit Application" />
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          Loading application…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title={isEditMode ? 'Edit Application' : 'Add Application'}>
        <Button variant="outline" onClick={() => onNavigate(isEditMode && editId ? '/admin/applications/view/' + editId : '/admin/applications')}>
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
              {/* Photo */}
              <div>
                <h3 className="mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">Profile Photo</h3>
                <PhotoUpload
                  value={form.photoUrl}
                  onChange={(url) => set('photoUrl', url)}
                  onUpload={async (file) => {
                    const r = await api.uploadFile(session.token, file);
                    return r.url;
                  }}
                  fallbackInitials={(form.fullName || '?').slice(0, 2).toUpperCase()}
                />
              </div>

              {/* Personal Information */}
              <div>
                <h3 className="mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">Personal Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Full Name *</Label>
                    <Input
                      value={form.fullName}
                      onChange={(e) => set('fullName', e.target.value)}
                      onBlur={titleCaseOnBlur((value) => set('fullName', value))}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Date of Birth (dd/mm/yyyy) *</Label>
                    <Input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Age</Label>
                    <Input value={calculateAge(form.dateOfBirth)} readOnly className="bg-gray-50" placeholder="Auto-calculated" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Gender *</Label>
                    <select className={selectClass} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Nationality *</Label>
                    <select className={selectClass} value={form.nationality} onChange={(e) => set('nationality', e.target.value)}>
                      <option value="">Select Nationality</option>
                      {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Marital Status *</Label>
                    <select className={selectClass} value={form.maritalStatus} onChange={(e) => set('maritalStatus', e.target.value)}>
                      <option value="">Select Marital Status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Father Name *</Label>
                    <Input value={form.fatherName} onChange={(e) => set('fatherName', e.target.value)} placeholder="Enter father's name" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Mother Name *</Label>
                    <Input value={form.motherName} onChange={(e) => set('motherName', e.target.value)} placeholder="Enter mother's name" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Guardian Name (if applicable)</Label>
                    <Input value={form.guardianName} onChange={(e) => set('guardianName', e.target.value)} placeholder="Enter guardian's name" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Aadhar Number *</Label>
                    <Input value={form.aadharNo} onChange={(e) => set('aadharNo', e.target.value)} placeholder="Enter Aadhar number" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Passport Number *</Label>
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
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      placeholder="Enter email"
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (!v) return;
                        if (!EMAIL_REGEX.test(v)) {
                          toast.error('Email is not a valid format.');
                          return;
                        }
                        void verifyEmailWithFeedback(api, session.token, v, (corrected) => set('email', corrected));
                      }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Phone Number *</Label>
                    <PhoneInput
                      countryCode={form.phoneCountryCode}
                      number={form.phone}
                      onChange={({ countryCode, number }) => {
                        set('phoneCountryCode', countryCode);
                        set('phone', number);
                      }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Alternate Phone Number *</Label>
                    <Input value={form.alternatePhone} onChange={(e) => set('alternatePhone', e.target.value)} placeholder="Enter alternate phone" />
                  </div>
                  <div className="grid gap-2">
                    <Label>WhatsApp Number *</Label>
                    <PhoneInput
                      countryCode={form.whatsappCountryCode}
                      number={form.whatsappNo}
                      onChange={({ countryCode, number }) => {
                        set('whatsappCountryCode', countryCode);
                        set('whatsappNo', number);
                      }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Country *</Label>
                    <select className={selectClass} value={form.country} onChange={(e) => set('country', e.target.value)}>
                      <option value="">Select Country</option>
                      {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>State *</Label>
                    {form.country === 'India' ? (
                      <select className={selectClass} value={form.state} onChange={(e) => set('state', e.target.value)}>
                        <option value="">Select State</option>
                        {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <Input value={form.state} onChange={(e) => set('state', e.target.value)} placeholder="Enter state / province" />
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label>District *</Label>
                    {districtList ? (
                      <select className={selectClass} value={form.district} onChange={(e) => set('district', e.target.value)}>
                        <option value="">Select District</option>
                        {districtList.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    ) : (
                      <Input
                        value={form.district}
                        onChange={(e) => set('district', e.target.value)}
                        placeholder={form.country === 'India' && form.state ? `Enter district in ${form.state}` : 'Enter district / city'}
                      />
                    )}
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Permanent Address *</Label>
                    <textarea
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={form.permanentAddress}
                      onChange={(e) => set('permanentAddress', e.target.value)}
                      placeholder="Enter permanent address"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-2">
                    <input
                      id="same-as-permanent"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={form.correspondenceSameAsPermanent}
                      onChange={(e) => set('correspondenceSameAsPermanent', e.target.checked)}
                    />
                    <Label htmlFor="same-as-permanent" className="cursor-pointer text-sm font-normal">
                      Correspondence address same as permanent
                    </Label>
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Correspondence Address *</Label>
                    <textarea
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                      value={form.correspondenceAddress}
                      onChange={(e) => set('correspondenceAddress', e.target.value)}
                      placeholder="Enter correspondence address"
                      disabled={form.correspondenceSameAsPermanent}
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
                  <Label>Highest Qualification *</Label>
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
                  <Label>School / College *</Label>
                  <Input value={form.institutionName} onChange={(e) => set('institutionName', e.target.value)} placeholder="Enter school/college name" />
                </div>
                <div className="grid gap-2">
                  <Label>Year of Passing *</Label>
                  <select className={selectClass} value={form.yearOfPassing} onChange={(e) => set('yearOfPassing', e.target.value)}>
                    <option value="">Select Year</option>
                    {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Current Employment Status *</Label>
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
                  <Label>Experience *</Label>
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
                              <select
                                className={`${selectClass} h-8 text-sm`}
                                value={row.yearOfPassing}
                                onChange={(e) => updateEducationRow(idx, 'yearOfPassing', e.target.value)}
                              >
                                <option value="">Year</option>
                                {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                              </select>
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
                <Label>Course *</Label>
                <select className={selectClass} value={form.courseId} onChange={(e) => set('courseId', e.target.value)}>
                  <option value="">Select Course</option>
                  {courses.map((c) => <option key={String(c.id)} value={String(c.id)}>{String(c.title ?? '')}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Course Offering *</Label>
                <select
                  className={selectClass}
                  value={form.offeringId}
                  onChange={(e) => handleOfferingChange(e.target.value)}
                  disabled={!form.courseId}
                >
                  <option value="">{form.courseId ? 'Select Offering' : 'Select a course first'}</option>
                  {offerings.map((o) => <option key={asString(o.id)} value={asString(o.id)}>{asString(o.title) || asString(o.offering_code) || 'Untitled'}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Certificate Combination *</Label>
                <select
                  className={selectClass}
                  value={form.certificateCombination}
                  onChange={(e) => set('certificateCombination', e.target.value)}
                  disabled={!form.offeringId}
                >
                  <option value="">{form.offeringId ? 'Select Combination' : 'Select an offering first'}</option>
                  {certificateCombinations.map((c) => {
                    const id = asString(c.id);
                    const code = asString(c.combination_code);
                    const courseTitle = asString(c.course_title);
                    return (
                      <option key={id} value={id}>
                        {code}{courseTitle ? ` — ${courseTitle}` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Date of Application *</Label>
                <Input type="date" value={form.applicationDate} onChange={(e) => set('applicationDate', e.target.value)} />
                <p className="text-xs text-gray-400">Date of Enrolment is auto-set when the admin accepts the application.</p>
              </div>
              <div className="grid gap-2">
                <Label>Mode of Study *</Label>
                <select className={selectClass} value={form.modeOfStudy} onChange={(e) => set('modeOfStudy', e.target.value)}>
                  <option value="">Select Mode</option>
                  {MODE_OF_STUDY.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Language *</Label>
                <select className={selectClass} value={form.language} onChange={(e) => set('language', e.target.value)}>
                  <option value="">Select Language</option>
                  {languages.map((l) => {
                    const id = asString(l.id);
                    const title = asString(l.title) || asString(l.name);
                    return <option key={id || title} value={title}>{title}</option>;
                  })}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Pipeline *</Label>
                <select className={selectClass} value={form.pipeline} onChange={(e) => set('pipeline', e.target.value)}>
                  <option value="">Select Pipeline</option>
                  <option value="Admin">Admin</option>
                  <option value="Counsellor">Counsellor</option>
                  <option value="Associate">Associate</option>
                  <option value="Centre">Centre</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Pipeline User *</Label>
                <select
                  className={selectClass}
                  value={form.pipelineUser}
                  onChange={(e) => set('pipelineUser', e.target.value)}
                  disabled={!form.pipeline}
                >
                  <option value="">{form.pipeline ? 'Select Pipeline User' : 'Select a pipeline first'}</option>
                  {pipelineUsers.map((u) => {
                    const id = asString(u.id);
                    const label = asString(u.name) || asString(u.centre_name) || asString(u.title) || `#${id}`;
                    return <option key={id} value={id}>{label}</option>;
                  })}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Lead Source *</Label>
                <select className={selectClass} value={form.leadSource} onChange={(e) => set('leadSource', e.target.value)}>
                  <option value="">Select Lead Source</option>
                  {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {form.leadSource === 'Reference' && (
                <div className="grid gap-2">
                  <Label>Referred By *</Label>
                  <select
                    className={selectClass}
                    value={form.referenceStudentId}
                    onChange={(e) => set('referenceStudentId', e.target.value)}
                  >
                    <option value="">Select Student</option>
                    {students.map((s) => {
                      const id = asString(s.id);
                      const name = asString(s.name);
                      const sid = asString(s.student_id);
                      return <option key={id} value={id}>{name}{sid ? ` (${sid})` : ''}</option>;
                    })}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Documents — labelled per-course slots + ad-hoc extras */}
          {activeTab === TAB_DOCS && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-700">Documents</h3>
                {!form.courseId ? (
                  <p className="rounded-md border border-dashed px-3 py-4 text-sm text-gray-500">
                    Pick a Course on the Enrolment tab to see which documents are required.
                  </p>
                ) : requiredDocSlots.length === 0 ? (
                  <p className="rounded-md border border-dashed px-3 py-4 text-sm text-gray-500">
                    This course has no required documents configured. (Configure under Courses → Edit Course → Required Documents.)
                  </p>
                ) : (
                  <div className="space-y-2">
                    {requiredDocSlots.map((slot) => {
                      const existing = documents.find((d) => d.document_type_id === slot.document_type_id);
                      return (
                        <div key={slot.document_type_id} className="rounded-md border p-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">
                              {slot.label}
                              {slot.is_mandatory ? <span className="ml-1 text-red-500">*</span> : null}
                            </Label>
                            {existing ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => setDocuments((prev) => prev.filter((d) => d.document_type_id !== slot.document_type_id))}
                              >
                                <Trash2 className="size-3.5" aria-hidden="true" /> Remove
                              </Button>
                            ) : null}
                          </div>
                          {existing ? (
                            <a href={existing.url} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-xs text-blue-600 hover:underline">
                              {existing.name}
                            </a>
                          ) : (
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              className="mt-2 block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-ttii-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  void handleDocumentUpload(f, slot.document_type_id);
                                  e.target.value = '';
                                }
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 rounded-md border-t pt-3">
                  <p className="mb-2 text-xs text-gray-500">Other documents (optional)</p>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-gray-700"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        void handleDocumentUpload(f);
                        e.target.value = '';
                      }
                    }}
                  />
                  {documents.filter((d) => !d.document_type_id).length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {documents.map((d, idx) => {
                        if (d.document_type_id) return null;
                        return (
                          <li key={idx} className="flex items-center justify-between rounded border px-3 py-1.5 text-sm">
                            <a href={d.url} target="_blank" rel="noopener noreferrer" className="truncate text-blue-600 hover:underline">
                              {d.name}
                            </a>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="size-7 p-0 text-red-500 hover:text-red-700"
                              onClick={() => removeDocument(idx)}
                              aria-label="Remove document"
                            >
                              <Trash2 className="size-3.5" aria-hidden="true" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Fee Information */}
          {activeTab === TAB_FEE && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-700">Pricing</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Course Fee</Label>
                    <Input value={form.courseFee} readOnly className="bg-gray-50" placeholder="Auto-filled from offering" />
                    <p className="text-xs text-gray-400">From Course Offering</p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Registration Fee</Label>
                    <Input
                      value={form.registrationFee}
                      onChange={(e) => set('registrationFee', e.target.value)}
                      placeholder="From offering"
                    />
                    <p className="text-xs text-gray-400">Pulled from offering when available; editable for one-off cases.</p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Discount</Label>
                    <div className="flex gap-2">
                      <select
                        className={`${selectClass} w-32`}
                        value={form.discountType}
                        onChange={(e) => set('discountType', e.target.value as 'percent' | 'flat')}
                      >
                        <option value="percent">Percentage</option>
                        <option value="flat">Flat (INR)</option>
                      </select>
                      <Input
                        value={form.discount}
                        onChange={(e) => set('discount', e.target.value)}
                        placeholder={form.discountType === 'percent' ? 'e.g. 10' : 'e.g. 5000'}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>GST</Label>
                    <div className="flex gap-2">
                      <select
                        className={`${selectClass} w-32`}
                        value={form.gstApplicability}
                        onChange={(e) => set('gstApplicability', e.target.value)}
                      >
                        <option value="No">Not applicable</option>
                        <option value="Yes">Applicable</option>
                      </select>
                      <Input
                        type="number"
                        value={form.gstPercent}
                        onChange={(e) => set('gstPercent', e.target.value)}
                        placeholder="%"
                        disabled={form.gstApplicability !== 'Yes'}
                      />
                    </div>
                    <p className="text-xs text-gray-400">Default 18%; override if the offering specifies otherwise.</p>
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Final Course Fee</Label>
                    <Input
                      value={form.finalCourseFee ? `₹${form.finalCourseFee}` : ''}
                      readOnly
                      className="bg-gray-50 font-semibold"
                      placeholder="Auto-calculated"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-700">Instalment Plan</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>Number of Instalments</Label>
                    <Input
                      type="number"
                      value={form.installmentCount}
                      onChange={(e) => set('installmentCount', e.target.value)}
                      placeholder="e.g. 6"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={form.installmentStartDate}
                      onChange={(e) => set('installmentStartDate', e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Preferred Payment Day</Label>
                    <Input
                      type="number"
                      min="1"
                      max="28"
                      value={form.preferredPaymentDay}
                      onChange={(e) => set('preferredPaymentDay', e.target.value)}
                      placeholder="1–28"
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={generateInstallments}>
                    Generate Schedule
                  </Button>
                </div>

                {installments.length > 0 && (
                  <div className="mt-3 overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-2 text-left font-medium text-gray-600">#</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-600">Description</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-600">Due Date</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-600">Amount</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-600">GST</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-600">Total</th>
                          <th className="px-2 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {installments.map((row, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-2 py-1.5">{idx + 1}</td>
                            <td className="px-2 py-1.5">
                              <Input
                                value={row.description}
                                onChange={(e) => updateInstallment(idx, { description: e.target.value })}
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input
                                type="date"
                                value={row.due_date}
                                onChange={(e) => updateInstallment(idx, { due_date: e.target.value })}
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input
                                value={row.amount}
                                onChange={(e) => updateInstallment(idx, { amount: e.target.value })}
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input
                                value={row.gst}
                                onChange={(e) => updateInstallment(idx, { gst: e.target.value })}
                                className="h-8 text-sm"
                                disabled={form.gstApplicability !== 'Yes'}
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input
                                value={row.total}
                                onChange={(e) => updateInstallment(idx, { total: e.target.value })}
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="size-7 p-0 text-red-500 hover:text-red-700"
                                onClick={() => removeInstallment(idx)}
                                aria-label="Remove instalment"
                              >
                                <Trash2 className="size-3.5" aria-hidden="true" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {installments.length === 0 && (
                  <p className="mt-3 rounded-md border border-dashed px-3 py-4 text-center text-sm text-gray-400">
                    Set the number of instalments and dates, then click <strong>Generate Schedule</strong>.
                  </p>
                )}
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
          {activeTab < TAB_FEE ? (
            <Button className="bg-ttii-primary hover:bg-ttii-primary/90" onClick={goNext}>
              Save and Next
            </Button>
          ) : (
            <Button
              className="bg-ttii-primary hover:bg-ttii-primary/90"
              disabled={saving}
              onClick={() => { void handleSubmit(); }}
            >
              {saving ? (isEditMode ? 'Updating...' : 'Submitting...') : (isEditMode ? 'Update Application' : 'Submit Application')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
