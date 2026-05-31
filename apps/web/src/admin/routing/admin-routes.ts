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
const ViewSubjectQuestionsPage = lazy(() => import('../pages/question_bank/ViewSubjectQuestionsPage.js'));
const ExamsPage = lazy(() => import('../pages/exam/ExamsPage.js'));
const AddExamPage = lazy(() => import('../pages/exam/AddExamPage.js'));
const AssignmentsPage = lazy(() => import('../pages/assignment/AssignmentsPage.js'));
const AssignmentEvaluationPage = lazy(() => import('../pages/assignment/AssignmentEvaluationPage.js'));
const ExamResultPage = lazy(() => import('../pages/exam_result/ExamResultPage.js'));
const ExamEvaluationPage = lazy(() => import('../pages/exam_evaluation/ExamEvaluationPage.js'));
const StudentEligibilityPage = lazy(() => import('../pages/exam_eligibility/StudentEligibilityPage.js'));
const ReExamPage = lazy(() => import('../pages/re_exam/ReExamPage.js'));
const EntranceExamsPage = lazy(() => import('../pages/entrance_exam/EntranceExamsPage.js'));
const AddEntranceExamPage = lazy(() => import('../pages/entrance_exam/AddEntranceExamPage.js'));
const EntranceExamRegistrationsPage = lazy(() => import('../pages/entrance_exam/EntranceExamRegistrationsPage.js'));
const EntranceExamResultsPage = lazy(() => import('../pages/entrance_exam/EntranceExamResultsPage.js'));
const ApplicationsPage = lazy(() => import('../pages/applications/ApplicationsPage.js'));
const AddApplicationPage = lazy(() => import('../pages/applications/AddApplicationPage.js'));
const AddLeadPage = lazy(() => import('../pages/applications/AddLeadPage.js'));
const ViewApplicationPage = lazy(() => import('../pages/applications/ViewApplicationPage.js'));
const StudentsPage = lazy(() => import('../pages/students/StudentsPage.js'));
const ViewStudentPage = lazy(() => import('../pages/students/ViewStudentPage.js'));
const IntakePage = lazy(() => import('../pages/batch/IntakePage.js'));
const ViewSubmissionsPage = lazy(() => import('../pages/assignment/ViewSubmissionsPage.js'));
const PaymentsPage = lazy(() => import('../pages/payments/PaymentsPage.js'));
const CentreDirectoryPage = lazy(() => import('../pages/centres/CentreDirectoryPage.js'));
const AddCentrePage = lazy(() => import('../pages/centres/AddCentrePage.js'));
const ViewCentrePage = lazy(() => import('../pages/centres/ViewCentrePage.js'));
const CentreCohortsPage = lazy(() => import('../pages/centres/CentreCohortsPage.js'));
const CentrePaymentsPage = lazy(() => import('../pages/centres/CentrePaymentsPage.js'));
const WalletStatusPage = lazy(() => import('../pages/wallet/WalletStatusPage.js'));
const ResourcesPage = lazy(() => import('../pages/resources/ResourcesPage.js'));
const ProgramDirectoryPage = lazy(() => import('../pages/program/ProgramDirectoryPage.js'));
const ProgramCoursesPage = lazy(() => import('../pages/program/ProgramCoursesPage.js'));
const ViewProgramPage = lazy(() => import('../pages/program/ViewProgramPage.js'));
const OfferingsPage = lazy(() => import('../pages/offering/OfferingsPage.js'));
const AddOfferingPage = lazy(() => import('../pages/offering/AddOfferingPage.js'));
const ContentLibraryPage = lazy(() => import('../pages/content_library/ContentLibraryPage.js'));
const CompletionPoliciesPage = lazy(() => import('../pages/certificates/CompletionPoliciesPage.js'));
const CertificatesPage = lazy(() => import('../pages/certificates/CertificatesPage.js'));
const CertificationPartnersPage = lazy(() => import('../pages/certificates/CertificationPartnersPage.js'));
const CertificateCombinationsPage = lazy(() => import('../pages/certificates/CertificateCombinationsPage.js'));
const ViewPartnerPage = lazy(() => import('../pages/partners/ViewPartnerPage.js'));
const CourseDirectoryPage = lazy(() => import('../pages/course/CourseDirectoryPage.js'));
const AddCoursePage = lazy(() => import('../pages/course/AddCoursePage.js'));
const ViewCoursePage = lazy(() => import('../pages/course/ViewCoursePage.js'));
const CourseSubjectsPage = lazy(() => import('../pages/course/CourseSubjectsPage.js'));
const SubjectsPage = lazy(() => import('../pages/course/SubjectsPage.js'));
const SubjectDetailPage = lazy(() => import('../pages/subject/SubjectDetailPage.js'));
const AddLessonPage = lazy(() => import('../pages/course_new/AddLessonPage.js'));
const LessonsListPage = lazy(() => import('../pages/course_new/LessonsListPage.js'));
const AppVersionPage = lazy(() => import('../pages/settings/AppVersionPage.js'));
const TeamsMeetingHostsPage = lazy(() => import('../pages/integrations/TeamsMeetingHostsPage.js'));
const SystemSettingsPage = lazy(() => import('../pages/settings/SystemSettingsPage.js'));
const ContactSettingsPage = lazy(() => import('../pages/settings/ContactSettingsPage.js'));
const WebsiteSettingsPage = lazy(() => import('../pages/settings/WebsiteSettingsPage.js'));
const DocumentTypesPage = lazy(() => import('../pages/settings/DocumentTypesPage.js'));
const EditStudentPage = lazy(() => import('../pages/students/EditStudentPage.js'));
const NotificationsPage = lazy(() => import('../pages/notification/NotificationsPage.js'));
const BannersPage = lazy(() => import('../pages/banners/BannersPage.js'));
const FaqPage = lazy(() => import('../pages/faq/FaqPage.js'));

// Phase 3: Operations & People pages
const CohortsPage = lazy(() => import('../pages/cohorts/CohortsPage.js'));
const AnnouncementsPage = lazy(() => import('../pages/cohorts/AnnouncementsPage.js'));
const CourseFeeStructurePage = lazy(() => import('../pages/fee/CourseFeeStructurePage.js'));
const FeeSummaryPage = lazy(() => import('../pages/fee/FeeSummaryPage.js'));

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
const ViewCohortPage = lazy(() => import('../pages/cohorts/ViewCohortPage.js'));
const LiveClassPage = lazy(() => import('../pages/live_class/LiveClassPage.js'));
const AttendancePage = lazy(() => import('../pages/cohorts/AttendancePage.js'));
const SessionFeedbacksPage = lazy(() => import('../pages/cohorts/SessionFeedbacksPage.js'));
const CourseFeePage = lazy(() => import('../pages/fee/CourseFeePage.js'));
const FeeInstallmentsPage = lazy(() => import('../pages/fee/FeeInstallmentsPage.js'));
const PaymentStatusPage = lazy(() => import('../pages/fee/PaymentStatusPage.js'));
const PaymentApprovalPage = lazy(() => import('../pages/fee/PaymentApprovalPage.js'));
const ScholarshipsPage = lazy(() => import('../pages/scholarships/ScholarshipsPage.js'));
const InstructorsPage = lazy(() => import('../pages/instructor/InstructorsPage.js'));
const AdminUsersPage = lazy(() => import('../pages/users/AdminUsersPage.js'));

// Phase 5: Integrations & Polish pages
const ChatSupportPage = lazy(() => import('../pages/chat_support/ChatSupportPage.js'));
const TrainingVideosPage = lazy(() => import('../pages/training_videos/TrainingVideosPage.js'));
const EnrollmentsPage = lazy(() => import('../pages/enrollments/EnrollmentsPage.js'));
const FeedsPage = lazy(() => import('../pages/feeds/FeedsPage.js'));
const IntegrationsPage = lazy(() => import('../pages/integrations/IntegrationsPage.js'));
const UserFeedbacksPage = lazy(() => import('../pages/reviews/UserFeedbacksPage.js'));
const LanguagePage = lazy(() => import('../pages/language/LanguagePage.js'));

// Phase 6: Additional pages
const RolesPermissionsPage = lazy(() => import('../pages/roles/RolesPermissionsPage.js'));
const ManagePermissionsPage = lazy(() => import('../pages/roles/ManagePermissionsPage.js'));
const StudentPaymentsPage = lazy(() => import('../pages/student_payments/StudentPaymentsPage.js'));
const EnquiriesPage = lazy(() => import('../pages/enquiries/EnquiriesPage.js'));
const BooksLibraryPage = lazy(() => import('../pages/books/BooksLibraryPage.js'));
const ReferralsPage = lazy(() => import('../pages/referrals/ReferralsPage.js'));
const ShortContentPage = lazy(() => import('../pages/short_content/ShortContentPage.js'));
const TestimonialsPage = lazy(() => import('../pages/testimonials/TestimonialsPage.js'));
const PackagesPage = lazy(() => import('../pages/packages/PackagesPage.js'));

export const ADMIN_ROUTES: AdminRouteConfig[] = [
  // Dashboard
  { path: '/admin/dashboard/index', aliases: ['/admin', '/admin/', '/admin/dashboard'], pageComponent: DashboardPage, title: 'Dashboard' },

  // Learner Management
  { path: '/admin/applications/index', aliases: ['/admin/applications'], pageComponent: ApplicationsPage, title: 'Applications' },
  { path: '/admin/applications/add', pageComponent: AddApplicationPage, title: 'Add Application' },
  // Naji 2026-05-08: edit route reuses AddApplicationPage in edit mode
  // (component detects /edit/:id from window.location and pre-fills).
  { path: '/admin/applications/edit/:id', pageComponent: AddApplicationPage, title: 'Edit Application' },
  { path: '/admin/leads/add', pageComponent: AddLeadPage, title: 'Add Lead' },
  // Naji 2026-05-08: minimal edit reuses AddLeadPage in edit mode.
  { path: '/admin/leads/edit/:id', pageComponent: AddLeadPage, title: 'Edit Lead' },
  { path: '/admin/applications/view/:id', pageComponent: ViewApplicationPage, title: 'View Application' },
  { path: '/admin/students/index', aliases: ['/admin/students'], pageComponent: StudentsPage, title: 'Students' },
  { path: '/admin/students/view/:id', pageComponent: ViewStudentPage, title: 'View Student' },
  { path: '/admin/students/edit/:id', pageComponent: EditStudentPage, title: 'Edit Student' },
  { path: '/admin/assignment/index', aliases: ['/admin/assignment'], pageComponent: AssignmentsPage, title: 'Assignment Summary' },
  { path: '/admin/assignment/evaluation', pageComponent: AssignmentEvaluationPage, title: 'Assignment Evaluation' },
  { path: '/admin/assignment/submissions/:id', pageComponent: ViewSubmissionsPage, title: 'Assignment Submissions' },
  { path: '/admin/batch/index', aliases: ['/admin/batch'], pageComponent: IntakePage, title: 'Intake' },
  { path: '/admin/payments/index', aliases: ['/admin/payments'], pageComponent: PaymentsPage, title: 'Payments' },

  // Centres
  { path: '/admin/centres/index', aliases: ['/admin/centres'], pageComponent: CentreDirectoryPage, title: 'Centre Directory' },
  { path: '/admin/centres/add', pageComponent: AddCentrePage, title: 'Add Centre' },
  { path: '/admin/centres/edit/:id', pageComponent: AddCentrePage, title: 'Edit Centre' },
  { path: '/admin/centres/view/:id', pageComponent: ViewCentrePage, title: 'View Centre' },
  { path: '/admin/centres/cohorts', pageComponent: CentreCohortsPage, title: 'Centre Cohorts' },
  { path: '/admin/centres/centre_payments', pageComponent: CentrePaymentsPage, title: 'Centre Payments' },
  { path: '/admin/wallet/index', aliases: ['/admin/wallet'], pageComponent: WalletStatusPage, title: 'Wallet Status' },
  { path: '/admin/chat_support', pageComponent: ChatSupportPage, title: 'Chat Support' },
  { path: '/admin/resources/index', aliases: ['/admin/resources'], pageComponent: ResourcesPage, title: 'Resources' },
  { path: '/admin/training_videos', pageComponent: TrainingVideosPage, title: 'Training Videos' },

  // Programs
  { path: '/admin/programs/index', aliases: ['/admin/programs'], pageComponent: ProgramDirectoryPage, title: 'Programs' },
  { path: '/admin/programs/view/:id', pageComponent: ViewProgramPage, title: 'View Program' },
  { path: '/admin/programs/courses/:id', pageComponent: ProgramCoursesPage, title: 'Program Courses' },

  // Content Library
  { path: '/admin/content-library/index', aliases: ['/admin/content-library'], pageComponent: ContentLibraryPage, title: 'Content Library' },

  // Completion & Certificates
  { path: '/admin/completion-policies/index', aliases: ['/admin/completion-policies'], pageComponent: CompletionPoliciesPage, title: 'Completion Policies' },
  { path: '/admin/certificates/index', aliases: ['/admin/certificates'], pageComponent: CertificatesPage, title: 'Certificates' },
  { path: '/admin/certification-partners/index', aliases: ['/admin/certification-partners'], pageComponent: CertificationPartnersPage, title: 'Certification Partners' },
  { path: '/admin/certificate-combinations/index', aliases: ['/admin/certificate-combinations'], pageComponent: CertificateCombinationsPage, title: 'Certificate Combinations' },
  // Naji UAT 2026-05-22 — Partner View detail page (header + Courses / Students / Liability tabs).
  { path: '/admin/partners/view/:id', pageComponent: ViewPartnerPage, title: 'Partner Details' },

  // Course Offerings
  { path: '/admin/offerings/index', aliases: ['/admin/offerings'], pageComponent: OfferingsPage, title: 'Course Offerings' },
  { path: '/admin/offerings/add', pageComponent: AddOfferingPage, title: 'New Offering' },
  { path: '/admin/offerings/edit/:id', pageComponent: AddOfferingPage, title: 'Edit Offering' },

  // Courses
  { path: '/admin/course/index', aliases: ['/admin/course'], pageComponent: CourseDirectoryPage, title: 'Course Directory' },
  { path: '/admin/course/add', pageComponent: AddCoursePage, title: 'Add Course' },
  { path: '/admin/course/edit/:id', pageComponent: AddCoursePage, title: 'Edit Course' },
  { path: '/admin/course/view/:id', pageComponent: ViewCoursePage, title: 'View Course' },
  { path: '/admin/course/subjects/:id', pageComponent: CourseSubjectsPage, title: 'Course Subjects' },
  { path: '/admin/subjects/index', aliases: ['/admin/subjects'], pageComponent: SubjectsPage, title: 'Subjects' },
  { path: '/admin/subjects/view/:id', pageComponent: SubjectDetailPage, title: 'Subject Content' },
  // Lessons section (Naji 2026-04-30): the index lands on a flat
  // table view of every lesson; the wizard-style builder is reachable
  // from the Open Builder action and the "+ Add Lesson" button.
  { path: '/admin/course_new/index', aliases: ['/admin/course_new'], pageComponent: LessonsListPage, title: 'Lessons' },
  { path: '/admin/course_new/builder', pageComponent: AddLessonPage, title: 'Lesson Builder' },

  // Cohorts Management
  { path: '/admin/cohorts/index', aliases: ['/admin/cohorts'], pageComponent: CohortsPage, title: 'Cohorts' },
  { path: '/admin/announcements/index', aliases: ['/admin/announcements'], pageComponent: AnnouncementsPage, title: 'Announcements' },
  { path: '/admin/fee_management/course_fee_structure', aliases: ['/admin/fee_management/structure'], pageComponent: CourseFeeStructurePage, title: 'Course Fee Structure' },
  { path: '/admin/fee_management/fee_summary', aliases: ['/admin/fee_management/summary'], pageComponent: FeeSummaryPage, title: 'Fee Summary' },
  { path: '/admin/cohorts/add', pageComponent: AddCohortPage, title: 'Add Cohorts' },
  // Risha UAT 2026-05-27 — Edit reuses the Add page in URL-detected edit mode.
  { path: '/admin/cohorts/edit/:id', pageComponent: AddCohortPage, title: 'Edit Cohort' },
  { path: '/admin/cohorts/view/:id', pageComponent: ViewCohortPage, title: 'View Cohort' },
  { path: '/admin/live_class/index', aliases: ['/admin/live_class'], pageComponent: LiveClassPage, title: 'Live Sessions' },
  { path: '/admin/cohorts/attendance', pageComponent: AttendancePage, title: 'Attendance Management' },
  { path: '/admin/cohorts/sessions', pageComponent: SessionFeedbacksPage, title: 'Sessions Feedbacks' },

  // Fee Information
  { path: '/admin/course_fee/index', aliases: ['/admin/course_fee'], pageComponent: CourseFeePage, title: 'Course Fee Status' },
  { path: '/admin/fee_management/installments', pageComponent: FeeInstallmentsPage, title: 'Fee Installments' },
  { path: '/admin/fee_management/payment_status', pageComponent: PaymentStatusPage, title: 'Payment Status' },
  { path: '/admin/fee_management/payment_approvals', pageComponent: PaymentApprovalPage, title: 'Payment Approval' },
  { path: '/admin/scholarships/index', pageComponent: ScholarshipsPage, title: 'Scholarships' },

  // Instructors
  { path: '/admin/instructor/index', aliases: ['/admin/instructor'], pageComponent: InstructorsPage, title: 'Instructors Directory' },

  // Users (Admin)
  // Both legacy paths now serve the unified Admin Users page (Naji
  // 2026-04-30 — merged Super Admin + Admin into one list with a Role
  // column). Keeping /admin/admin/index for back-compat with bookmarks.
  { path: '/admin/admin/index', pageComponent: AdminUsersPage, title: 'Admin Users' },
  { path: '/admin/sub_admin/index', pageComponent: AdminUsersPage, title: 'Admin Users' },

  // Counsellors
  { path: '/admin/counsellor/index', pageComponent: CounsellorsPage, title: 'Counsellors Directory' },
  { path: '/admin/counsellor_target/index', pageComponent: CounsellorTargetPage, title: 'Counsellor Target' },

  // Associates
  { path: '/admin/associates/index', pageComponent: AssociatesPage, title: 'Associates Directory' },
  { path: '/admin/associates_target/index', pageComponent: AssociateTargetPage, title: 'Associate Target' },

  // Exam
  { path: '/admin/exam/index', aliases: ['/admin/exam'], pageComponent: ExamsPage, title: 'Exams' },
  { path: '/admin/exam/add', pageComponent: AddExamPage, title: 'Add Exam' },
  { path: '/admin/exam/edit/:id', pageComponent: AddExamPage, title: 'Edit Exam' },
  { path: '/admin/Re_exam/index', pageComponent: ReExamPage, title: 'Re-Examination' },
  { path: '/admin/Exam_evaluation/index', pageComponent: ExamEvaluationPage, title: 'Evaluation' },
  // Naji 2026-05-09 — Student Eligibility scaffolded; spec pending.
  { path: '/admin/exam/eligibility/index', aliases: ['/admin/exam/eligibility'], pageComponent: StudentEligibilityPage, title: 'Student Eligibility' },
  { path: '/admin/Exam_result/index', pageComponent: ExamResultPage, title: 'Exam Result' },
  { path: '/admin/question_bank/index', pageComponent: QuestionBankPage, title: 'Question Bank' },
  { path: '/admin/question_bank/view/:id', pageComponent: ViewSubjectQuestionsPage, title: 'Question Bank' },

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
  { path: '/admin/settings/document_types', pageComponent: DocumentTypesPage, title: 'Document Types' },

  // Phase 6: Additional pages
  { path: '/admin/roles/index', aliases: ['/admin/roles'], pageComponent: RolesPermissionsPage, title: 'Roles & Permissions' },
  { path: '/admin/roles/manage/:id', pageComponent: ManagePermissionsPage, title: 'Manage Permissions' },
  { path: '/admin/student_payments/index', aliases: ['/admin/student_payments'], pageComponent: StudentPaymentsPage, title: 'Student Payments' },
  { path: '/admin/enquiries/index', aliases: ['/admin/enquiries'], pageComponent: EnquiriesPage, title: 'Enquiries' },
  { path: '/admin/books/index', aliases: ['/admin/books'], pageComponent: BooksLibraryPage, title: 'Books Library' },
  { path: '/admin/referrals/index', aliases: ['/admin/referrals'], pageComponent: ReferralsPage, title: 'Student Referrals' },
  { path: '/admin/short_content/index', aliases: ['/admin/short_content'], pageComponent: ShortContentPage, title: 'Short Content' },
  { path: '/admin/testimonials/index', aliases: ['/admin/testimonials'], pageComponent: TestimonialsPage, title: 'Testimonials' },
  { path: '/admin/packages/index', aliases: ['/admin/packages'], pageComponent: PackagesPage, title: 'Packages' },
  { path: '/admin/integrations/teams_meeting_hosts', aliases: ['/admin/integrations/teams'], pageComponent: TeamsMeetingHostsPage, title: 'Teams Meeting Hosts' },
];

export function resolveAdminRoute(pathname: string): AdminRouteConfig | null {
  const normalized = pathname.replace(/\/$/, '') || '/admin';

  const direct = ADMIN_ROUTES.find((r) => r.path === normalized);
  if (direct) return direct;

  const aliased = ADMIN_ROUTES.find((r) => r.aliases?.includes(normalized));
  if (aliased) return aliased;

  // Dynamic route matching (e.g. /admin/applications/view/:id)
  for (const route of ADMIN_ROUTES) {
    if (!route.path.includes(':')) continue;
    const routeParts = route.path.split('/');
    const pathParts = normalized.split('/');
    if (routeParts.length !== pathParts.length) continue;
    const matches = routeParts.every((part, i) => part.startsWith(':') || part === pathParts[i]);
    if (matches) return route;
  }

  return null;
}
