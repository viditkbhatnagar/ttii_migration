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
      { id: 'student-referrals', label: 'Student Referrals', href: '/admin/students/index' },
      { id: 'assignments-lm', label: 'Assignments', href: '/admin/assignment/index' },
      { id: 'intake', label: 'Intake', href: '/admin/batch/index' },
      { id: 'payments-lm', label: 'Payments', href: '/admin/payments/index' },
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
      { id: 'resources', label: 'Resources', href: '/admin/resources/index' },
      { id: 'training-videos', label: 'Training Videos', href: '/admin/training_videos' },
    ],
  },
  {
    id: 'courses',
    label: 'Courses',
    icon: 'BookOpen',
    children: [
      { id: 'course-directory', label: 'Course Directory', href: '/admin/course/index' },
      { id: 'add-lesson', label: 'Add Lesson', href: '/admin/course_new/index' },
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
      { id: 'assignments-cm', label: 'Assignments', href: '/admin/assignment/index' },
      { id: 'attendance-management', label: 'Attendance Management', href: '/admin/cohorts/attendance' },
      { id: 'sessions-feedbacks', label: 'Sessions Feedbacks', href: '/admin/cohorts/sessions' },
    ],
  },
  {
    id: 'fee-information',
    label: 'Fee Information',
    icon: 'IndianRupee',
    children: [
      { id: 'course-fee-status', label: 'Course Fee Status', href: '/admin/course_fee/index' },
      { id: 'fee-installments', label: 'Fee Installments', href: '/admin/fee_management/installments' },
      { id: 'payment-status', label: 'Payment Status', href: '/admin/fee_management/payment_status' },
      { id: 'scholarships', label: 'Scholarships', href: '/admin/scholarships/index' },
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
      { id: 'super-admin', label: 'Super Admin', href: '/admin/admin/index' },
      { id: 'admin', label: 'Admin', href: '/admin/sub_admin/index' },
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
      { id: 'associate-target', label: 'Associate Target', href: '/admin/associates_target/index' },
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
  {
    id: 'ai-mentor',
    label: 'AI Mentor',
    icon: 'Bot',
    children: [
      { id: 'mentorship-history', label: 'Mentorship History', href: '/admin/mentorship/history' },
      { id: 'mentorship-analysis', label: 'Mentorship Analysis', href: '/admin/mentorship/analysis' },
    ],
  },
  { id: 'events', label: 'Events', href: '/admin/events/index', icon: 'CalendarDays' },
  { id: 'circulars', label: 'Circulars', href: '/admin/circulars/index', icon: 'Megaphone' },
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
      { id: 'user-feedbacks', label: 'User Feedbacks', href: '/admin/review/index' },
      { id: 'faqs', label: 'FAQs', href: '/admin/faq/index' },
      { id: 'language', label: 'Language', href: '/admin/language/index' },
      { id: 'app-version', label: 'App Version', href: '/admin/settings/app_version' },
      { id: 'system-settings', label: 'System Settings', href: '/admin/settings/system_settings' },
      { id: 'contact-settings', label: 'Contact Settings', href: '/admin/settings/contact_settings' },
      { id: 'website-settings', label: 'Website Settings', href: '/admin/settings/website_settings' },
    ],
  },
];

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
