import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { AdminPortalApi } from '../admin-portal-api.js';
import type { AuthSession } from '@ttii/frontend-core';

export interface AdminPageProps {
  api: AdminPortalApi;
  session: AuthSession;
  onNavigate: (href: string) => void;
}

export interface AdminRouteConfig {
  path: string;
  aliases?: string[];
  pageComponent: LazyExoticComponent<ComponentType<AdminPageProps>>;
  title: string;
}

// Phase 1 pages
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage.js'));

// Phase 2: Exam & Assessment pages
const QuestionBankPage = lazy(() => import('../pages/question_bank/QuestionBankPage.js'));
const ExamsPage = lazy(() => import('../pages/exam/ExamsPage.js'));
const AssignmentsPage = lazy(() => import('../pages/assignment/AssignmentsPage.js'));
const ExamResultPage = lazy(() => import('../pages/exam_result/ExamResultPage.js'));
const ExamEvaluationPage = lazy(() => import('../pages/exam_evaluation/ExamEvaluationPage.js'));
const ReExamPage = lazy(() => import('../pages/re_exam/ReExamPage.js'));
const EntranceExamsPage = lazy(() => import('../pages/entrance_exam/EntranceExamsPage.js'));
const AddEntranceExamPage = lazy(() => import('../pages/entrance_exam/AddEntranceExamPage.js'));
const EntranceExamRegistrationsPage = lazy(() => import('../pages/entrance_exam/EntranceExamRegistrationsPage.js'));
const EntranceExamResultsPage = lazy(() => import('../pages/entrance_exam/EntranceExamResultsPage.js'));
const ApplicationsPage = lazy(() => import('../pages/applications/ApplicationsPage.js'));
const StudentsPage = lazy(() => import('../pages/students/StudentsPage.js'));
const IntakePage = lazy(() => import('../pages/batch/IntakePage.js'));
const PaymentsPage = lazy(() => import('../pages/payments/PaymentsPage.js'));
const CentreDirectoryPage = lazy(() => import('../pages/centres/CentreDirectoryPage.js'));
const CentreCohortsPage = lazy(() => import('../pages/centres/CentreCohortsPage.js'));
const CentrePaymentsPage = lazy(() => import('../pages/centres/CentrePaymentsPage.js'));
const WalletStatusPage = lazy(() => import('../pages/wallet/WalletStatusPage.js'));
const ResourcesPage = lazy(() => import('../pages/resources/ResourcesPage.js'));
const CourseDirectoryPage = lazy(() => import('../pages/course/CourseDirectoryPage.js'));
const AddLessonPage = lazy(() => import('../pages/course_new/AddLessonPage.js'));
const AppVersionPage = lazy(() => import('../pages/settings/AppVersionPage.js'));
const SystemSettingsPage = lazy(() => import('../pages/settings/SystemSettingsPage.js'));
const ContactSettingsPage = lazy(() => import('../pages/settings/ContactSettingsPage.js'));
const WebsiteSettingsPage = lazy(() => import('../pages/settings/WebsiteSettingsPage.js'));
const NotificationsPage = lazy(() => import('../pages/notification/NotificationsPage.js'));
const BannersPage = lazy(() => import('../pages/banners/BannersPage.js'));
const FaqPage = lazy(() => import('../pages/faq/FaqPage.js'));

// Phase 3: Operations & People pages
const CohortsPage = lazy(() => import('../pages/cohorts/CohortsPage.js'));

// Phase 4: CRM & Content pages
const CounsellorsPage = lazy(() => import('../pages/counsellor/CounsellorsPage.js'));
const CounsellorTargetPage = lazy(() => import('../pages/counsellor/CounsellorTargetPage.js'));
const AssociatesPage = lazy(() => import('../pages/associates/AssociatesPage.js'));
const AssociateTargetPage = lazy(() => import('../pages/associates/AssociateTargetPage.js'));
const DocumentRequestsPage = lazy(() => import('../pages/documents/DocumentRequestsPage.js'));
const DocumentsIssuedPage = lazy(() => import('../pages/documents/DocumentsIssuedPage.js'));
const DocumentsDeliveryPage = lazy(() => import('../pages/documents/DocumentsDeliveryPage.js'));
const EventsPage = lazy(() => import('../pages/events/EventsPage.js'));
const CircularsPage = lazy(() => import('../pages/circulars/CircularsPage.js'));
const MentorshipHistoryPage = lazy(() => import('../pages/mentorship/MentorshipHistoryPage.js'));
const MentorshipAnalysisPage = lazy(() => import('../pages/mentorship/MentorshipAnalysisPage.js'));
const GlobalCalendarPage = lazy(() => import('../pages/calendar/GlobalCalendarPage.js'));
const AddCohortPage = lazy(() => import('../pages/cohorts/AddCohortPage.js'));
const LiveClassPage = lazy(() => import('../pages/live_class/LiveClassPage.js'));
const AttendancePage = lazy(() => import('../pages/cohorts/AttendancePage.js'));
const SessionFeedbacksPage = lazy(() => import('../pages/cohorts/SessionFeedbacksPage.js'));
const CourseFeePage = lazy(() => import('../pages/fee/CourseFeePage.js'));
const FeeInstallmentsPage = lazy(() => import('../pages/fee/FeeInstallmentsPage.js'));
const PaymentStatusPage = lazy(() => import('../pages/fee/PaymentStatusPage.js'));
const ScholarshipsPage = lazy(() => import('../pages/scholarships/ScholarshipsPage.js'));
const InstructorsPage = lazy(() => import('../pages/instructor/InstructorsPage.js'));
const SuperAdminPage = lazy(() => import('../pages/users/SuperAdminPage.js'));
const AdminUsersPage = lazy(() => import('../pages/users/AdminUsersPage.js'));

// Phase 5: Integrations & Polish pages
const ChatSupportPage = lazy(() => import('../pages/chat_support/ChatSupportPage.js'));
const TrainingVideosPage = lazy(() => import('../pages/training_videos/TrainingVideosPage.js'));
const EnrollmentsPage = lazy(() => import('../pages/enrollments/EnrollmentsPage.js'));
const FeedsPage = lazy(() => import('../pages/feeds/FeedsPage.js'));
const IntegrationsPage = lazy(() => import('../pages/integrations/IntegrationsPage.js'));
const UserFeedbacksPage = lazy(() => import('../pages/reviews/UserFeedbacksPage.js'));
const LanguagePage = lazy(() => import('../pages/language/LanguagePage.js'));

export const ADMIN_ROUTES: AdminRouteConfig[] = [
  // Dashboard
  { path: '/admin/dashboard/index', aliases: ['/admin', '/admin/', '/admin/dashboard'], pageComponent: DashboardPage, title: 'Dashboard' },

  // Learner Management
  { path: '/admin/applications/index', aliases: ['/admin/applications'], pageComponent: ApplicationsPage, title: 'Applications' },
  { path: '/admin/students/index', aliases: ['/admin/students'], pageComponent: StudentsPage, title: 'Students' },
  { path: '/admin/assignment/index', aliases: ['/admin/assignment'], pageComponent: AssignmentsPage, title: 'Assignments' },
  { path: '/admin/batch/index', aliases: ['/admin/batch'], pageComponent: IntakePage, title: 'Intake' },
  { path: '/admin/payments/index', aliases: ['/admin/payments'], pageComponent: PaymentsPage, title: 'Payments' },

  // Centres
  { path: '/admin/centres/index', aliases: ['/admin/centres'], pageComponent: CentreDirectoryPage, title: 'Centre Directory' },
  { path: '/admin/centres/cohorts', pageComponent: CentreCohortsPage, title: 'Centre Cohorts' },
  { path: '/admin/centres/centre_payments', pageComponent: CentrePaymentsPage, title: 'Centre Payments' },
  { path: '/admin/wallet/index', aliases: ['/admin/wallet'], pageComponent: WalletStatusPage, title: 'Wallet Status' },
  { path: '/admin/chat_support', pageComponent: ChatSupportPage, title: 'Chat Support' },
  { path: '/admin/resources/index', aliases: ['/admin/resources'], pageComponent: ResourcesPage, title: 'Resources' },
  { path: '/admin/training_videos', pageComponent: TrainingVideosPage, title: 'Training Videos' },

  // Courses
  { path: '/admin/course/index', aliases: ['/admin/course'], pageComponent: CourseDirectoryPage, title: 'Course Directory' },
  { path: '/admin/course_new/index', aliases: ['/admin/course_new'], pageComponent: AddLessonPage, title: 'Add Lesson' },

  // Cohorts Management
  { path: '/admin/cohorts/index', aliases: ['/admin/cohorts'], pageComponent: CohortsPage, title: 'Cohorts' },
  { path: '/admin/cohorts/add', pageComponent: AddCohortPage, title: 'Add Cohorts' },
  { path: '/admin/live_class/index', aliases: ['/admin/live_class'], pageComponent: LiveClassPage, title: 'Live Sessions' },
  { path: '/admin/cohorts/attendance', pageComponent: AttendancePage, title: 'Attendance Management' },
  { path: '/admin/cohorts/sessions', pageComponent: SessionFeedbacksPage, title: 'Sessions Feedbacks' },

  // Fee Information
  { path: '/admin/course_fee/index', aliases: ['/admin/course_fee'], pageComponent: CourseFeePage, title: 'Course Fee Status' },
  { path: '/admin/fee_management/installments', pageComponent: FeeInstallmentsPage, title: 'Fee Installments' },
  { path: '/admin/fee_management/payment_status', pageComponent: PaymentStatusPage, title: 'Payment Status' },
  { path: '/admin/scholarships/index', pageComponent: ScholarshipsPage, title: 'Scholarships' },

  // Instructors
  { path: '/admin/instructor/index', aliases: ['/admin/instructor'], pageComponent: InstructorsPage, title: 'Instructors Directory' },

  // Users (Admin)
  { path: '/admin/admin/index', pageComponent: SuperAdminPage, title: 'Super Admin' },
  { path: '/admin/sub_admin/index', pageComponent: AdminUsersPage, title: 'Admin' },

  // Counsellors
  { path: '/admin/counsellor/index', pageComponent: CounsellorsPage, title: 'Counsellors Directory' },
  { path: '/admin/counsellor_target/index', pageComponent: CounsellorTargetPage, title: 'Counsellor Target' },

  // Associates
  { path: '/admin/associates/index', pageComponent: AssociatesPage, title: 'Associates Directory' },
  { path: '/admin/associates_target/index', pageComponent: AssociateTargetPage, title: 'Associate Target' },

  // Exam
  { path: '/admin/exam/index', aliases: ['/admin/exam'], pageComponent: ExamsPage, title: 'Exams' },
  { path: '/admin/Re_exam/index', pageComponent: ReExamPage, title: 'Re-Examination' },
  { path: '/admin/Exam_evaluation/index', pageComponent: ExamEvaluationPage, title: 'Evaluation' },
  { path: '/admin/Exam_result/index', pageComponent: ExamResultPage, title: 'Exam Result' },
  { path: '/admin/question_bank/index', pageComponent: QuestionBankPage, title: 'Question Bank' },

  // Documents Manager
  { path: '/admin/documents/requests', pageComponent: DocumentRequestsPage, title: 'Document Requests' },
  { path: '/admin/documents/issued', pageComponent: DocumentsIssuedPage, title: 'Documents Issued' },
  { path: '/admin/documents/delivery', pageComponent: DocumentsDeliveryPage, title: 'Documents Delivery' },

  // AI Mentor
  { path: '/admin/mentorship/history', pageComponent: MentorshipHistoryPage, title: 'Mentorship History' },
  { path: '/admin/mentorship/analysis', pageComponent: MentorshipAnalysisPage, title: 'Mentorship Analysis' },

  // Events & Circulars
  { path: '/admin/events/index', aliases: ['/admin/events'], pageComponent: EventsPage, title: 'Events' },
  { path: '/admin/circulars/index', aliases: ['/admin/circulars'], pageComponent: CircularsPage, title: 'Circulars' },

  // Entrance Exam
  { path: '/admin/entrance_exam/registrations', pageComponent: EntranceExamRegistrationsPage, title: 'Entrance Exam Registrations' },
  { path: '/admin/entrance_exam/index', pageComponent: EntranceExamsPage, title: 'Entrance Exams' },
  { path: '/admin/entrance_exam/results', pageComponent: EntranceExamResultsPage, title: 'Entrance Exam Results' },
  { path: '/admin/entrance_exam/add', pageComponent: AddEntranceExamPage, title: 'Add Entrance Exam' },

  // Global Calendar
  { path: '/admin/global_calender/index', pageComponent: GlobalCalendarPage, title: 'Global Calendar' },

  // Settings
  { path: '/admin/enrol/index', pageComponent: EnrollmentsPage, title: 'App Enrollments' },
  { path: '/admin/notification/index', aliases: ['/admin/notification'], pageComponent: NotificationsPage, title: 'Notifications' },
  { path: '/admin/banners/index', aliases: ['/admin/banners'], pageComponent: BannersPage, title: 'Banners' },
  { path: '/admin/feed/index', aliases: ['/admin/feed'], pageComponent: FeedsPage, title: 'Feeds' },
  { path: '/admin/integration/index', pageComponent: IntegrationsPage, title: 'Integrations' },
  { path: '/admin/review/index', aliases: ['/admin/review'], pageComponent: UserFeedbacksPage, title: 'User Feedbacks' },
  { path: '/admin/faq/index', aliases: ['/admin/faq'], pageComponent: FaqPage, title: 'FAQs' },
  { path: '/admin/language/index', aliases: ['/admin/language'], pageComponent: LanguagePage, title: 'Language' },
  { path: '/admin/settings/app_version', pageComponent: AppVersionPage, title: 'App Version' },
  { path: '/admin/settings/system_settings', pageComponent: SystemSettingsPage, title: 'System Settings' },
  { path: '/admin/settings/contact_settings', pageComponent: ContactSettingsPage, title: 'Contact Settings' },
  { path: '/admin/settings/website_settings', pageComponent: WebsiteSettingsPage, title: 'Website Settings' },
];

export function resolveAdminRoute(pathname: string): AdminRouteConfig | null {
  const normalized = pathname.replace(/\/$/, '') || '/admin';

  const direct = ADMIN_ROUTES.find((r) => r.path === normalized);
  if (direct) return direct;

  const aliased = ADMIN_ROUTES.find((r) => r.aliases?.includes(normalized));
  if (aliased) return aliased;

  return null;
}
