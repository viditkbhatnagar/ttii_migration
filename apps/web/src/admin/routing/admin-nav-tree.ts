export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
}

export interface AdminNavGroup {
  id: string;
  label: string;
  icon: string;
  children: AdminNavItem[];
}

export type AdminNavEntry = (AdminNavItem & { icon: string }) | AdminNavGroup;

export function isNavGroup(entry: AdminNavEntry): entry is AdminNavGroup {
  return 'children' in entry;
}

export const ADMIN_NAV_TREE: readonly AdminNavEntry[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/admin/dashboard/index', icon: 'LayoutDashboard' },
  {
    id: 'learner-management',
    label: 'Learner Management',
    icon: 'GraduationCap',
    children: [
      { id: 'applications', label: 'Applications', href: '/admin/applications/index' },
      { id: 'students', label: 'Students', href: '/admin/students/index' },
      { id: 'enrollments', label: 'Enrollments', href: '/admin/enrol/index' },
    ],
  },
  {
    id: 'centres',
    label: 'Centres',
    icon: 'Building2',
    children: [
      { id: 'centre-directory', label: 'Centre Directory', href: '/admin/centres/index' },
      { id: 'centre-cohorts', label: 'Centre Cohorts', href: '/admin/centres/cohorts' },
      { id: 'centre-payments', label: 'Centre Payments', href: '/admin/centres/centre_payments' },
      { id: 'wallet-status', label: 'Wallet Status', href: '/admin/wallet/index' },
      { id: 'chat-support', label: 'Chat Support', href: '/admin/chat_support' },
    ],
  },
  // Naji 2026-06-30 — Resources + Training Videos pulled out of the Centres
  // group into their own top-level sidebar modules. Training videos uploaded
  // here sync to the counsellor, centre and associate portals (shared
  // training_videos table).
  { id: 'resources', label: 'Resources', href: '/admin/resources/index', icon: 'FolderOpen' },
  { id: 'training-videos', label: 'Training Videos', href: '/admin/training_videos', icon: 'PlayCircle' },
  {
    id: 'courses',
    label: 'Courses',
    icon: 'BookOpen',
    // Order locked by Naji 2026-04-30: Course Offerings first, then
    // Program → Course → Subject → Lessons → Content Library.
    // Naji UAT 2026-05-22 — certification stack moved into its own
    // top-level "Partner Management" group below; Completion Policies
    // + Certificates stay under Courses since they target the
    // students/courses (not the partners).
    children: [
      { id: 'offerings', label: 'Course Offerings', href: '/admin/offerings/index' },
      { id: 'programs', label: 'Program', href: '/admin/programs/index' },
      { id: 'course-directory', label: 'Course', href: '/admin/course/index' },
      { id: 'subjects', label: 'Subject', href: '/admin/subjects/index' },
      { id: 'lessons', label: 'Lessons', href: '/admin/course_new/index' },
      { id: 'content-library', label: 'Content Library', href: '/admin/content-library/index' },
      { id: 'completion-policies', label: 'Completion Policies', href: '/admin/completion-policies/index' },
      { id: 'certificates', label: 'Certificates', href: '/admin/certificates/index' },
    ],
  },
  {
    // Naji UAT 2026-05-22 — Partner Management is its own top-level
    // group so the partner stack (org-level) stays separated from
    // the course curriculum stack.
    id: 'partner-management',
    label: 'Partner Management',
    icon: 'Award',
    children: [
      { id: 'certification-partners', label: 'Certification Partners', href: '/admin/certification-partners/index' },
      { id: 'certificate-combinations', label: 'Certificate Combinations', href: '/admin/certificate-combinations/index' },
    ],
  },
  {
    id: 'cohorts-management',
    label: 'Cohorts Management',
    icon: 'Users',
    children: [
      { id: 'cohorts', label: 'Cohorts', href: '/admin/cohorts/index' },
      { id: 'add-cohorts', label: 'Add Cohorts', href: '/admin/cohorts/add' },
      { id: 'live-sessions', label: 'Live Sessions', href: '/admin/live_class/index' },
      // Naji 2026-08-14 asked us for an attendance report. The page and its two
      // endpoints already existed and worked — it simply had a route and no nav
      // entry, so the only way in was to type the URL.
      { id: 'attendance', label: 'Attendance', href: '/admin/cohorts/attendance' },
      { id: 'assignments-cm', label: 'Assignment Summary', href: '/admin/assignment/index' },
      { id: 'assignment-evaluation', label: 'Assignment Evaluation', href: '/admin/assignment/evaluation' },
      { id: 'announcements', label: 'Announcements', href: '/admin/announcements/index' },
    ],
  },
  {
    id: 'fee-information',
    label: 'Fee Information',
    icon: 'IndianRupee',
    // Naji 2026-05-09 — Course Fee Status, Scholarships, Student
    // Payments hidden from the sidebar. Routes still registered in
    // admin-routes.ts so deep links and any future re-enable work.
    children: [
      { id: 'course-fee-structure', label: 'Course Fee Structure', href: '/admin/fee_management/course_fee_structure' },
      { id: 'fee-summary', label: 'Fee Summary', href: '/admin/fee_management/fee_summary' },
      { id: 'fee-installments', label: 'Fee Installments', href: '/admin/fee_management/installments' },
      { id: 'payment-status', label: 'Payment Status', href: '/admin/fee_management/payment_status' },
      { id: 'payment-approval', label: 'Payment Approval', href: '/admin/fee_management/payment_approvals' },
    ],
  },
  {
    id: 'instructors',
    label: 'Instructors',
    icon: 'UserCheck',
    children: [
      { id: 'instructors-directory', label: 'Instructors Directory', href: '/admin/instructor/index' },
    ],
  },
  {
    id: 'users-admin',
    label: 'Users',
    icon: 'Shield',
    children: [
      { id: 'admin-users', label: 'Admin Users', href: '/admin/sub_admin/index' },
      { id: 'roles-permissions', label: 'Roles & Permissions', href: '/admin/roles/index' },
    ],
  },
  {
    id: 'counsellors',
    label: 'Counsellors',
    icon: 'HeartHandshake',
    children: [
      { id: 'counsellors-directory', label: 'Counsellors Directory', href: '/admin/counsellor/index' },
      { id: 'counsellor-target', label: 'Counsellor Target', href: '/admin/counsellor_target/index' },
    ],
  },
  {
    id: 'associates',
    label: 'Associates',
    icon: 'Handshake',
    children: [
      { id: 'associates-directory', label: 'Associates Directory', href: '/admin/associates/index' },
    ],
  },
  // CRM, AI Mentor, Circulars: hidden on Naji's request 2026-05-07.
  // Routes still registered so deep links + future re-enable work.
  {
    id: 'content-library',
    label: 'Content Library',
    icon: 'Library',
    children: [
      { id: 'books-library', label: 'Books Library', href: '/admin/books/index' },
      { id: 'short-content', label: 'Short Content', href: '/admin/short_content/index' },
    ],
  },
  {
    id: 'exam',
    label: 'Exam',
    icon: 'FileText',
    children: [
      { id: 'exams', label: 'Exams', href: '/admin/exam/index' },
      { id: 're-examination', label: 'Re-Examination', href: '/admin/Re_exam/index' },
      { id: 'evaluation', label: 'Evaluation', href: '/admin/Exam_evaluation/index' },
      { id: 'result', label: 'Result', href: '/admin/Exam_result/index' },
      { id: 'question-bank', label: 'Question Bank', href: '/admin/question_bank/index' },
      // Naji 2026-05-09 — Student Eligibility scaffolded; spec pending.
      { id: 'student-eligibility', label: 'Student Eligibility', href: '/admin/exam/eligibility/index' },
    ],
  },
  {
    id: 'documents-manager',
    label: 'Documents Manager',
    icon: 'FolderOpen',
    children: [
      { id: 'doc-requests', label: 'Requests', href: '/admin/documents/requests' },
      { id: 'doc-issued', label: 'Documents Issued', href: '/admin/documents/issued' },
      { id: 'doc-delivery', label: 'Documents Delivery', href: '/admin/documents/delivery' },
    ],
  },
  { id: 'events', label: 'Events', href: '/admin/events/index', icon: 'CalendarDays' },
  {
    id: 'entrance-exam',
    label: 'Entrance Exam',
    icon: 'ClipboardCheck',
    children: [
      { id: 'ee-registrations', label: 'Registrations', href: '/admin/entrance_exam/registrations' },
      { id: 'ee-exams', label: 'Entrance Exams', href: '/admin/entrance_exam/index' },
      { id: 'ee-results', label: 'Exam Results', href: '/admin/entrance_exam/results' },
      { id: 'ee-add', label: 'Add Entrance', href: '/admin/entrance_exam/add' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'Settings',
    children: [
      { id: 'app-enrollments', label: 'App Enrollments', href: '/admin/enrol/index' },
      { id: 'notifications', label: 'Notifications', href: '/admin/notification/index' },
      { id: 'banners', label: 'Banners', href: '/admin/banners/index' },
      { id: 'feeds', label: 'Feeds', href: '/admin/feed/index' },
      { id: 'integrations', label: 'Integrations', href: '/admin/integration/index' },
      { id: 'teams-meeting-hosts', label: 'Teams Meeting Hosts', href: '/admin/integrations/teams_meeting_hosts' },
      { id: 'user-feedbacks', label: 'User Feedbacks', href: '/admin/review/index' },
      { id: 'testimonials', label: 'Testimonials', href: '/admin/testimonials/index' },
      { id: 'faqs', label: 'FAQs', href: '/admin/faq/index' },
      { id: 'language', label: 'Language', href: '/admin/language/index' },
      { id: 'document-types', label: 'Document Types', href: '/admin/settings/document_types' },
      { id: 'app-version', label: 'App Version', href: '/admin/settings/app_version' },
      { id: 'system-settings', label: 'System Settings', href: '/admin/settings/system_settings' },
      { id: 'contact-settings', label: 'Contact Settings', href: '/admin/settings/contact_settings' },
      { id: 'website-settings', label: 'Website Settings', href: '/admin/settings/website_settings' },
    ],
  },
];

/**
 * Returns the nav tree for the admin shell. Counsellors (role 9) get
 * routed to /counsellor (their own portal) before this function is reached,
 * so we no longer need a role-9 carve-out here.
 */
export function getNavTreeForRole(_roleId: number): readonly AdminNavEntry[] {
  return ADMIN_NAV_TREE;
}

export function findActiveNavIds(pathname: string): { groupId: string | null; itemId: string | null } {
  const normalized = pathname.replace(/\/$/, '');
  for (const entry of ADMIN_NAV_TREE) {
    if (isNavGroup(entry)) {
      for (const child of entry.children) {
        if (normalized === child.href || normalized.startsWith(child.href + '/')) {
          return { groupId: entry.id, itemId: child.id };
        }
      }
    } else if (normalized === entry.href || normalized.startsWith(entry.href + '/')) {
      return { groupId: null, itemId: entry.id };
    }
  }
  return { groupId: null, itemId: null };
}
