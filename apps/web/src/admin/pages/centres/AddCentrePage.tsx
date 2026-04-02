import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
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

const CENTRE_TYPES = ['Study Centre', 'Exam Centre', 'Training Centre'];
const RECOGNITION_STATUSES = ['Recognized', 'Pending', 'Expired'];

const SECTION_LABELS = ['Basic Info', 'Contact Info', 'Affiliation Info', 'Course Plans'];

const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

interface FormState {
  // Basic Info
  centreName: string;
  centreCode: string;
  centreType: string;
  establishedDate: string;
  logo: string;
  description: string;
  status: string;
  // Contact Info
  contactPerson: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  googleMapsLink: string;
  // Affiliation Info
  affiliationNumber: string;
  affiliationDate: string;
  affiliationDocument: string;
  recognitionStatus: string;
  // Add mode fields
  countryCode: string;
  registrationDate: string;
  expiryDate: string;
  password: string;
}

const emptyForm: FormState = {
  centreName: '', centreCode: '', centreType: '', establishedDate: '',
  logo: '', description: '', status: 'active',
  contactPerson: '', phone: '', email: '', addressLine1: '', addressLine2: '',
  city: '', state: '', pincode: '', googleMapsLink: '',
  affiliationNumber: '', affiliationDate: '', affiliationDocument: '', recognitionStatus: '',
  countryCode: '+91', registrationDate: '', expiryDate: '', password: '',
};

export default function AddCentrePage({ api, session, onNavigate }: AdminPageProps) {
  const [activeSection, setActiveSection] = useState(0);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Determine mode from URL
  const { isEdit, centreId } = useMemo(() => {
    const path = window.location.pathname;
    const editMatch = path.match(/\/admin\/centres\/edit\/(.+)/);
    if (editMatch) {
      return { isEdit: true, centreId: editMatch[1] ?? '' };
    }
    return { isEdit: false, centreId: '' };
  }, []);

  // Load centre data for edit mode
  const { data: centreData, loading } = useAdminPageData(
    () => (isEdit && centreId ? api.getCentre(session.token, centreId) : Promise.resolve(null)),
    [isEdit, centreId],
  );

  const coursePlans = useMemo(() => {
    if (!centreData) return [];
    const raw = centreData.course_plans ?? centreData.coursePlans;
    return toRecords(raw);
  }, [centreData]);

  // Pre-fill form in edit mode
  useEffect(() => {
    if (!isEdit || !centreData) return;
    const c = centreData.centre as Record<string, unknown> | undefined;
    if (!c) return;
    setForm({
      centreName: asString(c.centre_name),
      centreCode: asString(c.centre_code),
      centreType: asString(c.centre_type),
      establishedDate: asString(c.established_date).slice(0, 10),
      logo: asString(c.logo),
      description: asString(c.description),
      status: asString(c.status) || 'active',
      contactPerson: asString(c.contact_person),
      phone: asString(c.phone),
      email: asString(c.email),
      addressLine1: asString(c.address),
      addressLine2: asString(c.address_line_2),
      city: asString(c.city),
      state: asString(c.state),
      pincode: asString(c.pincode),
      googleMapsLink: asString(c.google_maps_link),
      affiliationNumber: asString(c.affiliation_number),
      affiliationDate: asString(c.affiliation_date).slice(0, 10),
      affiliationDocument: asString(c.affiliation_document),
      recognitionStatus: asString(c.recognition_status),
      countryCode: asString(c.code) || '+91',
      registrationDate: asString(c.date_of_registration).slice(0, 10),
      expiryDate: asString(c.date_of_expiry).slice(0, 10),
      password: '',
    });
  }, [isEdit, centreData]);

  const set = useCallback((key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.centreName.trim()) { alert('Centre Name is required.'); setActiveSection(0); return; }
    if (!form.centreCode.trim()) { alert('Centre Code is required.'); setActiveSection(0); return; }

    setSaving(true);
    try {
      if (isEdit) {
        const payload: Record<string, unknown> = {
          centre_name: form.centreName.trim(),
          contact_person: form.contactPerson.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.addressLine1.trim(),
          city: form.city.trim(),
          state: form.state,
          pincode: form.pincode.trim(),
          google_maps_link: form.googleMapsLink.trim(),
          affiliation_number: form.affiliationNumber.trim(),
          affiliation_date: form.affiliationDate,
          affiliation_document: form.affiliationDocument.trim(),
          recognition_status: form.recognitionStatus,
          description: form.description.trim(),
          status: form.status,
          logo: form.logo.trim(),
          established_date: form.establishedDate,
          date_of_registration: form.registrationDate,
          date_of_expiry: form.expiryDate,
        };
        const result = await api.editCentre(session.token, centreId, payload);
        if (asString(result.status) === '0' || result.status === 0) {
          alert(asString(result.message) || 'Failed to update centre');
        } else {
          onNavigate('/admin/centres/index');
        }
      } else {
        const result = await api.addCentre(session.token, {
          centreName: form.centreName.trim(),
          contactPerson: form.contactPerson.trim(),
          countryCode: form.countryCode.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.addressLine1.trim(),
          registrationDate: form.registrationDate,
          expiryDate: form.expiryDate,
          password: form.password,
        });
        if (asString(result.status) === '0' || result.status === 0) {
          alert(asString(result.message) || 'Failed to add centre');
        } else {
          onNavigate('/admin/centres/index');
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save centre');
    } finally {
      setSaving(false);
    }
  }, [form, isEdit, centreId, api, session.token, onNavigate]);

  if (loading) {
    return <PageLoader label="Loading add centre..." />;
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title={isEdit ? 'Edit Centre' : 'Add Centre'}>
        <Button variant="outline" onClick={() => onNavigate('/admin/centres/index')}>
          Cancel
        </Button>
      </AdminPageHeader>

      {/* Section navigation */}
      <div className="flex gap-1 border-b border-gray-200">
        {SECTION_LABELS.map((label, idx) => (
          <button
            key={label}
            type="button"
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              activeSection === idx ? 'text-ttii-primary' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveSection(idx)}
          >
            <span className="flex items-center gap-1.5">
              <span className={`flex size-5 items-center justify-center rounded-full text-xs ${
                activeSection === idx ? 'bg-ttii-primary text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {idx + 1}
              </span>
              {label}
            </span>
            {activeSection === idx ? (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ttii-primary" />
            ) : null}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* Section 1: Basic Info */}
          {activeSection === 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Centre Name *</Label>
                <Input value={form.centreName} onChange={(e) => set('centreName', e.target.value)} placeholder="Enter centre name" />
              </div>
              <div className="grid gap-2">
                <Label>Centre Code *</Label>
                <Input value={form.centreCode} onChange={(e) => set('centreCode', e.target.value)} placeholder="Enter centre code" />
              </div>
              <div className="grid gap-2">
                <Label>Centre Type</Label>
                <select className={selectClass} value={form.centreType} onChange={(e) => set('centreType', e.target.value)}>
                  <option value="">Select Type</option>
                  {CENTRE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Established Date</Label>
                <Input type="date" value={form.establishedDate} onChange={(e) => set('establishedDate', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Centre Logo (URL)</Label>
                <Input value={form.logo} onChange={(e) => set('logo', e.target.value)} placeholder="Enter logo URL" />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <select className={selectClass} value={form.status} onChange={(e) => set('status', e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label>Description</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Enter centre description"
                />
              </div>
              {!isEdit && (
                <>
                  <div className="grid gap-2">
                    <Label>Registration Date</Label>
                    <Input type="date" value={form.registrationDate} onChange={(e) => set('registrationDate', e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Expiry Date</Label>
                    <Input type="date" value={form.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Password</Label>
                    <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Enter password" />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Section 2: Contact Info */}
          {activeSection === 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Contact Person Name</Label>
                <Input value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} placeholder="Enter contact person name" />
              </div>
              <div className="grid gap-2">
                <Label>Contact Phone</Label>
                <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Enter phone number" />
              </div>
              <div className="grid gap-2">
                <Label>Contact Email</Label>
                <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Enter email" />
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
              <div className="grid gap-2 md:col-span-2">
                <Label>Google Maps Link</Label>
                <Input value={form.googleMapsLink} onChange={(e) => set('googleMapsLink', e.target.value)} placeholder="Enter Google Maps URL" />
              </div>
            </div>
          )}

          {/* Section 3: Affiliation Info */}
          {activeSection === 2 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Affiliation Number</Label>
                <Input value={form.affiliationNumber} onChange={(e) => set('affiliationNumber', e.target.value)} placeholder="Enter affiliation number" />
              </div>
              <div className="grid gap-2">
                <Label>Affiliation Date</Label>
                <Input type="date" value={form.affiliationDate} onChange={(e) => set('affiliationDate', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Affiliation Document (URL)</Label>
                <Input value={form.affiliationDocument} onChange={(e) => set('affiliationDocument', e.target.value)} placeholder="Enter document URL" />
              </div>
              <div className="grid gap-2">
                <Label>Recognition Status</Label>
                <select className={selectClass} value={form.recognitionStatus} onChange={(e) => set('recognitionStatus', e.target.value)}>
                  <option value="">Select Status</option>
                  {RECOGNITION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Section 4: Course Plans (read-only) */}
          {activeSection === 3 && (
            <div>
              {coursePlans.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left">
                        <th className="px-3 py-2 font-medium text-gray-600">Course Title</th>
                        <th className="px-3 py-2 font-medium text-gray-600">Assigned Amount</th>
                        <th className="px-3 py-2 font-medium text-gray-600">Start Date</th>
                        <th className="px-3 py-2 font-medium text-gray-600">End Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coursePlans.map((plan, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="px-3 py-2 text-gray-900">{asString(plan.course_title) || asString(plan.title) || '-'}</td>
                          <td className="px-3 py-2 text-gray-900">{asString(plan.assigned_amount) || '-'}</td>
                          <td className="px-3 py-2 text-gray-900">{formatDate(plan.start_date) || '-'}</td>
                          <td className="px-3 py-2 text-gray-900">{formatDate(plan.end_date) || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-gray-400">
                  {isEdit ? 'No course plans assigned to this centre.' : 'Course plans can be assigned after creating the centre.'}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom buttons */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => onNavigate('/admin/centres/index')}>
          Cancel
        </Button>
        <Button
          className="bg-ttii-primary hover:bg-ttii-primary/90"
          disabled={saving}
          onClick={handleSubmit}
        >
          {saving ? 'Saving...' : 'Save Centre'}
        </Button>
      </div>
    </div>
  );
}
