import { GraduationCap, School, UserCircle2 } from 'lucide-react';
import { AdminStatusBadge } from '../../../shared/components/AdminStatusBadge.js';
import { asString, formatDate } from '../../../shared/utils/admin-data-utils.js';
import { EmptyLine, Panel, ProfileInfoCard, SectionHeader, type InfoField } from './student-view-ui.js';

// Student Profile tab in Naji's StudentProfileDetails layout: "Personal
// Information" (identity + contact in two columns) and "Qualification &
// Employment". Kept from the old page on top of his design: Login Username
// (when it differs from the email), the honest Account Status vs Course Status
// pair (Risha UAT 2026-07-27), Profile Completion and the Education Pathway.

export function ProfileTab({
  student, accountStatus, courseStatus, enrolmentCount, profileCompletion, educationPathway,
}: {
  student: Record<string, unknown>;
  accountStatus: string;
  courseStatus: string;
  enrolmentCount: number;
  profileCompletion: number;
  educationPathway: Record<string, unknown>[];
}) {
  const s = (k: string) => asString(student[k]);
  const username = s('username');
  const left: InfoField[] = [
    { label: 'Student ID', value: s('student_id') },
    { label: 'Name', value: s('name') },
    ...(username && username.toLowerCase() !== s('user_email').toLowerCase() ? [{ label: 'Login Username', value: username }] : []),
    { label: 'Email', value: s('user_email') },
    { label: 'Phone', value: s('phone') },
    { label: 'Alternate Phone', value: s('second_phone') || s('alternate_phone') },
    { label: 'WhatsApp', value: s('whatsapp_no') },
    { label: 'Date of Birth', value: formatDate(student.date_of_birth) },
    { label: 'Age', value: s('age') },
    { label: 'Gender', value: s('gender') },
    { label: 'Marital Status', value: s('marital_status') },
    { label: 'Nationality', value: s('nationality_name') || s('nationality') },
  ];
  const right: InfoField[] = [
    { label: 'Aadhaar No', value: s('aadhar_no') },
    { label: 'Passport No', value: s('passport_no') },
    { label: "Father's Name", value: s('father_name') },
    { label: "Mother's Name", value: s('mother_name') },
    { label: "Guardian's Name", value: s('guardian_name') },
    { label: 'Country', value: s('country_name') || s('country') },
    { label: 'State', value: s('state') },
    { label: 'City / District', value: s('city') },
    { label: 'Permanent Address', value: s('address') },
    { label: 'Native Address', value: s('native_address') },
    {
      label: 'Account Status',
      value: (
        <span className="inline-flex flex-col items-end gap-0.5">
          <AdminStatusBadge status={accountStatus} />
          <span className="text-[11px] font-normal text-muted-foreground">Login access — not course progress</span>
        </span>
      ),
    },
    ...(courseStatus ? [{
      label: 'Course Status',
      value: (
        <span className="inline-flex flex-col items-end gap-0.5">
          <AdminStatusBadge status={courseStatus} />
          <span className="text-[11px] font-normal text-muted-foreground">{enrolmentCount === 1 ? 'From the enrolment' : `Across ${enrolmentCount} enrolments`}</span>
        </span>
      ),
    }] : []),
  ];
  const qualLeft: InfoField[] = [
    { label: 'Highest Qualification', value: s('highest_qualification') },
    { label: 'Specialization', value: s('specialization') },
    { label: 'School / College', value: s('institution_name') },
    { label: 'Year of Passing', value: s('year_of_passing') },
  ];
  const qualRight: InfoField[] = [
    { label: 'Percentage / Grade', value: s('percentage_or_grade') },
    { label: 'Employment Status', value: s('employment_status') },
    { label: 'Current Occupation', value: s('current_occupation') },
    { label: 'Experience', value: s('work_experience') },
  ];
  const pct = Math.min(profileCompletion, 100);

  return (
    <div className="space-y-6">
      <ProfileInfoCard icon={UserCircle2} title="Personal Information" description="Identity, contact and demographic details" left={left} right={right}>
        <div className="mt-6">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">Profile Completion</span>
            <span className="font-semibold tabular-nums text-foreground">{profileCompletion}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completion">
            <div className="h-full rounded-full bg-[image:var(--gradient-primary)]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </ProfileInfoCard>

      <ProfileInfoCard icon={GraduationCap} title="Qualification & Employment" description="Education background and work details" left={qualLeft} right={qualRight} />

      <Panel>
        <SectionHeader icon={School} title="Education Pathway" description="History of qualifications, institutions and marks" />
        {educationPathway.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  {['Qualification', 'Specialization', 'Institution', 'Board', 'Year', 'Marks'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {educationPathway.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{asString(row.qualification) || '-'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{asString(row.specialization) || '-'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{asString(row.institution) || '-'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{asString(row.board) || '-'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{asString(row.year_passed) || '-'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{asString(row.marks) || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyLine>No education pathway entries recorded.</EmptyLine>
        )}
      </Panel>
    </div>
  );
}
