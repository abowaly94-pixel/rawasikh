import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import ScrollToTop from "@/components/ScrollToTop";
import SmoothScroll from "@/components/site/SmoothScroll";
import ScrollProgress from "@/components/site/ScrollProgress";
import { CartProvider } from "@/contexts/CartContext";
import WhatsAppFloatingButton from "./components/WhatsAppFloatingButton";
import BackFloatingButton from "./components/BackFloatingButton";
import I18nAutoTranslator from "./components/I18nAutoTranslator";
import SiteVisitTracker from "./components/SiteVisitTracker";
import PwaInstallPrompt from "./components/PwaInstallPrompt";

// Homepage is kept eager so the very first paint doesn't wait on a lazy chunk.
import Index from "./pages/Index";

// Everything else is code-split: each page becomes its own chunk that is only
// downloaded when the user actually navigates there, instead of shipping in
// the homepage's initial bundle.
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ServicesPage = lazy(() => import("./pages/ServicesPage"));
const AcademicServicesPage = lazy(() => import("./pages/AcademicServicesPage"));
const DigitalSolutionsPage = lazy(() => import("./pages/DigitalSolutionsPage"));
const PortfolioPage = lazy(() => import("./pages/PortfolioPage"));
const ManagePortfolioPage = lazy(() => import("./pages/dashboard/ManagePortfolioPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const PoliciesPage = lazy(() => import("./pages/PoliciesPage"));
const Auth = lazy(() => import("./pages/Auth"));
const BackupPage = lazy(() => import("./pages/BackupPage"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const UsersPage = lazy(() => import("./pages/dashboard/UsersPage"));
const ManageStaffPage = lazy(() => import("./pages/dashboard/ManageStaffPage"));
const IndependentGroupsPage = lazy(() => import("./pages/dashboard/IndependentGroupsPage"));
const StudentsPage = lazy(() => import("./pages/dashboard/StudentsPage"));
const ProfilePage = lazy(() => import("./pages/dashboard/ProfilePage"));
const AttendancePage = lazy(() => import("./pages/dashboard/AttendancePage"));
const GradesPage = lazy(() => import("./pages/dashboard/GradesPage"));
const CoursesPage = lazy(() => import("./pages/CoursesPage"));
const CourseDetailsPage = lazy(() => import("./pages/CourseDetailsPage"));
const LessonPage = lazy(() => import("./pages/LessonPage"));
const MyCoursesPage = lazy(() => import("./pages/dashboard/MyCoursesPage"));
const MyCertificatesPage = lazy(() => import("./pages/dashboard/MyCertificatesPage"));
const ManagePoliciesPage = lazy(() => import("./pages/dashboard/ManagePoliciesPage"));
const StudentTasksPage = lazy(() => import("./pages/dashboard/StudentTasksPage"));
const TasksManagementPage = lazy(() => import("./pages/dashboard/TasksManagementPage"));
const FinancialsPage = lazy(() => import("./pages/dashboard/FinancialsPage"));
const CertificatePrintPage = lazy(() => import("./pages/CertificatePrintPage"));
const ManageCoursesPage = lazy(() => import("./pages/dashboard/ManageCoursesPage"));
const ManageCategoriesPage = lazy(() => import("./pages/dashboard/ManageCategoriesPage"));
const CourseContentPage = lazy(() => import("./pages/dashboard/CourseContentPage"));
const ManageCourseLevelsPage = lazy(() => import("./pages/dashboard/ManageCourseLevelsPage"));
const OnlineSessionsPage = lazy(() => import("./pages/dashboard/OnlineSessionsPage"));
const MySessionsPage = lazy(() => import("./pages/dashboard/MySessionsPage"));
const SessionDetailsPage = lazy(() => import("./pages/dashboard/SessionDetailsPage"));
const StudentClassesPage = lazy(() => import("./pages/dashboard/StudentClassesPage"));
const StudentTeachersPage = lazy(() => import("./pages/dashboard/StudentTeachersPage"));
const StudentAttendancePage = lazy(() => import("./pages/dashboard/StudentAttendancePage"));
const TeacherAttendancePage = lazy(() => import("./pages/dashboard/TeacherAttendancePage"));
const ManageQuizzesPage = lazy(() => import("./pages/dashboard/ManageQuizzesPage"));
const QuizQuestionsPage = lazy(() => import("./pages/dashboard/QuizQuestionsPage"));
const QuizResultsPage = lazy(() => import("./pages/dashboard/QuizResultsPage"));
const QuizPage = lazy(() => import("./pages/QuizPage"));
const ManageFormsPage = lazy(() => import("./pages/dashboard/ManageFormsPage"));
const ManageReviewsPage = lazy(() => import("./pages/dashboard/ManageReviewsPage"));
const FormFieldsPage = lazy(() => import("./pages/dashboard/FormFieldsPage"));
const FormResponsesPage = lazy(() => import("./pages/dashboard/FormResponsesPage"));
const AvailableFormsPage = lazy(() => import("./pages/dashboard/AvailableFormsPage"));
const FormFillPage = lazy(() => import("./pages/dashboard/FormFillPage"));
const LectureAttendancePage = lazy(() => import("./pages/dashboard/LectureAttendancePage"));
const PerformanceEvaluationPage = lazy(() => import("./pages/dashboard/PerformanceEvaluationPage"));
const ChildrenPerformancePage = lazy(() => import("./pages/dashboard/ChildrenPerformancePage"));
const EvaluationTestsPage = lazy(() => import("./pages/EvaluationTestsPage"));
const EvaluationCategoryPage = lazy(() => import("./pages/EvaluationCategoryPage"));
const EvaluationExamPage = lazy(() => import("./pages/EvaluationExamPage"));
const ManageExamCategoriesPage = lazy(() => import("./pages/dashboard/ManageExamCategoriesPage"));
const ManageEvaluationExamsPage = lazy(() => import("./pages/dashboard/ManageEvaluationExamsPage"));
const ExamQuestionsPage = lazy(() => import("./pages/dashboard/ExamQuestionsPage"));
const ManageSchoolsPage = lazy(() => import("./pages/dashboard/ManageSchoolsPage"));
const SchoolDetailsPage = lazy(() => import("./pages/dashboard/SchoolDetailsPage"));
const SubjectContentManagePage = lazy(() => import("./pages/dashboard/SubjectContentManagePage"));
const TeacherSchoolsPage = lazy(() => import("./pages/dashboard/TeacherSchoolsPage"));
const TeacherSchoolDetailsPage = lazy(() => import("./pages/dashboard/TeacherSchoolDetailsPage"));
const StudentSchoolPage = lazy(() => import("./pages/dashboard/StudentSchoolPage"));
const StudentSubjectsPage = lazy(() => import("./pages/dashboard/StudentSubjectsPage"));
const StudentLearnContentPage = lazy(() => import("./pages/dashboard/StudentLearnContentPage"));
const LessonDetailsPage = lazy(() => import("./pages/dashboard/LessonDetailsPage"));
const LessonExamPage = lazy(() => import("./pages/dashboard/LessonExamPage"));
const SchoolDashboard = lazy(() => import("./pages/school/SchoolDashboard"));
const SchoolOverviewPage = lazy(() => import("./pages/school/SchoolOverviewPage"));
const SchoolStagesPage = lazy(() => import("./pages/school/SchoolStagesPage"));
const SchoolSubjectsPage = lazy(() => import("./pages/school/SchoolSubjectsPage"));
const SubjectContentPage = lazy(() => import("./pages/school/SubjectContentPage"));
const SchoolStudentSubjectContentPage = lazy(() => import("./pages/school/StudentSubjectContentPage"));
const SchoolStudentsPage = lazy(() => import("./pages/school/SchoolStudentsPage"));
const SchoolTeachersPage = lazy(() => import("./pages/school/SchoolTeachersPage"));
const SchoolClassesPage = lazy(() => import("./pages/school/SchoolClassesPage"));
const SchoolSettingsPage = lazy(() => import("./pages/school/SchoolSettingsPage"));
const SchoolAssessmentsPage = lazy(() => import("./pages/school/SchoolAssessmentsPage"));
const SchoolAssessmentQuestionsPage = lazy(() => import("./pages/school/SchoolAssessmentQuestionsPage"));
const SchoolAssessmentResultsPage = lazy(() => import("./pages/school/SchoolAssessmentResultsPage"));
const SchoolActivityPage = lazy(() => import("./pages/school/SchoolActivityPage"));
const SchoolStudentResultsPage = lazy(() => import("./pages/school/SchoolStudentResultsPage"));
const LevelAssessmentPage = lazy(() => import("./pages/LevelAssessmentPage"));
const LevelAssessmentExamPage = lazy(() => import("./pages/LevelAssessmentExamPage"));
const ManageLevelAssessmentsPage = lazy(() => import("./pages/dashboard/ManageLevelAssessmentsPage"));
const AssessmentResultsPage = lazy(() => import("./pages/dashboard/AssessmentResultsPage"));
const AssessmentInvitePage = lazy(() => import("./pages/AssessmentInvitePage"));
const AdminAssessmentQuestionsPage = lazy(() => import("./pages/dashboard/AdminAssessmentQuestionsPage"));
const ManagePackagesPage = lazy(() => import("./pages/dashboard/ManagePackagesPage"));
const ManageProductsPage = lazy(() => import("./pages/dashboard/ManageProductsPage"));

const StorePage = lazy(() => import("./pages/StorePage"));
const ProductDetailsPage = lazy(() => import("./pages/ProductDetailsPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const PaymentSubmissionsPage = lazy(() => import("./pages/dashboard/PaymentSubmissionsPage"));
const AccountingPage = lazy(() => import("./pages/dashboard/AccountingPage"));
const CourseRequestsPage = lazy(() => import("./pages/dashboard/CourseRequestsPage"));
const GrantCoursesPage = lazy(() => import("./pages/dashboard/GrantCoursesPage"));
const AdminActivityLogsPage = lazy(() => import("./pages/dashboard/AdminActivityLogsPage"));
const ManageBlogPostsPage = lazy(() => import("./pages/dashboard/ManageBlogPostsPage"));
const ManageCertificatesPage = lazy(() => import("./pages/dashboard/ManageCertificatesPage"));
const ManageZoomLinksPage = lazy(() => import("./pages/dashboard/ManageZoomLinksPage"));
const ManageTeachersPage = lazy(() => import("./pages/dashboard/ManageTeachersPage"));
const SiteSettingsPage = lazy(() => import("./pages/dashboard/SiteSettingsPage"));
const ManageNewsTickerPage = lazy(() => import("./pages/dashboard/ManageNewsTickerPage"));
const ManageNewsUpdatesPage = lazy(() => import("./pages/dashboard/ManageNewsUpdatesPage"));
const ManageDiscountCodesPage = lazy(() => import("./pages/dashboard/ManageDiscountCodesPage"));
const PlatformStatsPage = lazy(() => import("./pages/dashboard/PlatformStatsPage"));

const PackageSelectionPage = lazy(() => import("./pages/PackageSelectionPage"));
const PaymentCallbackPage = lazy(() => import("./pages/PaymentCallbackPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
    <span className="relative flex h-12 w-12 items-center justify-center" aria-hidden>
      <span className="absolute inset-0 rounded-full border-2 border-primary/15" />
      <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary" />
      <span className="h-2 w-2 rotate-45 bg-gold" />
    </span>
    <p className="text-[12.5px] font-medium text-muted-foreground">جارٍ التحميل…</p>
  </div>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
          <CartProvider>
          <I18nAutoTranslator />
          <SiteVisitTracker />
          <ScrollToTop />
          <SmoothScroll />
          <ScrollProgress />
          <WhatsAppFloatingButton />
          <BackFloatingButton />
          <PwaInstallPrompt />

          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/academic-services" element={<AcademicServicesPage />} />
            <Route path="/digital-solutions" element={<DigitalSolutionsPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/policies" element={<PoliciesPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/backup" element={<BackupPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:id" element={<BlogPostPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/users" element={<UsersPage />} />
            <Route path="/dashboard/manage-staff" element={<ManageStaffPage />} />
            <Route path="/dashboard/independent-groups" element={<IndependentGroupsPage />} />
            <Route path="/dashboard/students" element={<StudentsPage />} />
            <Route path="/dashboard/profile" element={<ProfilePage />} />
            <Route path="/dashboard/attendance" element={<AttendancePage />} />
            <Route path="/dashboard/lecture-attendance" element={<LectureAttendancePage />} />
            <Route path="/dashboard/grades" element={<GradesPage />} />
            <Route path="/dashboard/my-courses" element={<MyCoursesPage />} />
            <Route path="/dashboard/my-certificates" element={<MyCertificatesPage />} />
            <Route path="/dashboard/policies" element={<ManagePoliciesPage />} />
            <Route path="/dashboard/my-tasks" element={<StudentTasksPage />} />
            <Route path="/dashboard/tasks" element={<TasksManagementPage />} />
            <Route path="/dashboard/financials" element={<FinancialsPage />} />
            <Route path="/certificate/:id" element={<CertificatePrintPage />} />
            <Route path="/dashboard/courses" element={<ManageCoursesPage />} />
            <Route path="/dashboard/categories" element={<ManageCategoriesPage />} />
            <Route path="/dashboard/courses/:id/content" element={<CourseContentPage />} />
            <Route path="/dashboard/courses/:id/levels" element={<ManageCourseLevelsPage />} />
            <Route path="/dashboard/sessions" element={<OnlineSessionsPage />} />
            <Route path="/dashboard/sessions/:id" element={<SessionDetailsPage />} />
            <Route path="/dashboard/my-sessions" element={<MySessionsPage />} />
            <Route path="/dashboard/my-school" element={<StudentSchoolPage />} />
            <Route path="/dashboard/subjects" element={<StudentSubjectsPage />} />
            <Route path="/dashboard/subjects/:subjectId/content" element={<StudentLearnContentPage />} />
            <Route path="/dashboard/my-classes" element={<StudentClassesPage />} />
            <Route path="/dashboard/my-teachers" element={<StudentTeachersPage />} />
            <Route path="/dashboard/my-attendance" element={<StudentAttendancePage />} />
            <Route path="/dashboard/teacher-attendance" element={<TeacherAttendancePage />} />
            <Route path="/dashboard/quizzes" element={<ManageQuizzesPage />} />
            <Route path="/dashboard/quizzes/:id/questions" element={<QuizQuestionsPage />} />
            <Route path="/dashboard/quiz-results" element={<QuizResultsPage />} />
            <Route path="/dashboard/forms" element={<ManageFormsPage />} />
            <Route path="/dashboard/reviews" element={<ManageReviewsPage />} />
            <Route path="/dashboard/forms/:id/fields" element={<FormFieldsPage />} />
            <Route path="/dashboard/forms/:id/responses" element={<FormResponsesPage />} />
            <Route path="/dashboard/my-forms" element={<AvailableFormsPage />} />
            <Route path="/dashboard/forms/:id/fill" element={<FormFillPage />} />
            <Route path="/dashboard/performance" element={<PerformanceEvaluationPage />} />
            <Route path="/dashboard/children-performance" element={<ChildrenPerformancePage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/courses/:id" element={<CourseDetailsPage />} />
            <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonPage />} />
            <Route path="/courses/:courseId/quiz/:quizId" element={<QuizPage />} />
            <Route path="/quiz/:quizId" element={<QuizPage />} />
            {/* The public teachers directory was removed; keep old links working. */}
            <Route path="/teachers" element={<Navigate to="/" replace />} />
            <Route path="/teachers/:id" element={<Navigate to="/" replace />} />
            <Route path="/evaluation-tests" element={<EvaluationTestsPage />} />
            <Route path="/evaluation-tests/:categoryId" element={<EvaluationCategoryPage />} />
            <Route path="/evaluation-tests/:categoryId/exam/:examId" element={<EvaluationExamPage />} />
            <Route path="/dashboard/exam-categories" element={<ManageExamCategoriesPage />} />
            <Route path="/dashboard/evaluation-exams" element={<ManageEvaluationExamsPage />} />
            <Route path="/dashboard/evaluation-exams/:examId/questions" element={<ExamQuestionsPage />} />
            <Route path="/dashboard/schools" element={<ManageSchoolsPage />} />
            <Route path="/dashboard/schools/:id" element={<SchoolDetailsPage />} />
            <Route path="/dashboard/schools/:schoolId/subjects/:subjectId/content" element={<SubjectContentManagePage />} />
            <Route path="/dashboard/my-schools" element={<TeacherSchoolsPage />} />
            <Route path="/dashboard/my-schools/:id" element={<TeacherSchoolDetailsPage />} />
            <Route path="/dashboard/level-assessments" element={<ManageLevelAssessmentsPage />} />
            <Route path="/dashboard/level-assessments/:assessmentId/questions" element={<AdminAssessmentQuestionsPage />} />
            <Route path="/dashboard/level-assessments/:assessmentId/results" element={<AssessmentResultsPage />} />
            <Route path="/dashboard/lessons/:lessonId" element={<LessonDetailsPage />} />
            <Route path="/dashboard/lessons/:lessonId/exam/:examId" element={<LessonExamPage />} />
            <Route path="/dashboard/packages" element={<ManagePackagesPage />} />
            <Route path="/dashboard/payment-submissions" element={<PaymentSubmissionsPage />} />
            <Route path="/dashboard/accounting" element={<AccountingPage />} />
            <Route path="/dashboard/course-requests" element={<CourseRequestsPage />} />
            <Route path="/dashboard/grant-courses" element={<GrantCoursesPage />} />
            <Route path="/dashboard/activity-logs" element={<AdminActivityLogsPage />} />
            <Route path="/dashboard/blog-posts" element={<ManageBlogPostsPage />} />
            <Route path="/dashboard/certificates" element={<ManageCertificatesPage />} />
            <Route path="/dashboard/zoom-links" element={<ManageZoomLinksPage />} />
            <Route path="/dashboard/teachers" element={<ManageTeachersPage />} />
            <Route path="/dashboard/products" element={<ManageProductsPage />} />
            <Route path="/dashboard/site-settings" element={<SiteSettingsPage />} />
            <Route path="/dashboard/news-ticker" element={<ManageNewsTickerPage />} />
            <Route path="/dashboard/portfolio" element={<ManagePortfolioPage />} />
            <Route path="/dashboard/news-updates" element={<ManageNewsUpdatesPage />} />
            <Route path="/dashboard/discount-codes" element={<ManageDiscountCodesPage />} />
            <Route path="/dashboard/platform-stats" element={<PlatformStatsPage />} />



            <Route path="/store" element={<StorePage />} />
            <Route path="/store/:id" element={<ProductDetailsPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/payment/callback" element={<PaymentCallbackPage />} />
            <Route path="/select-package" element={<PackageSelectionPage />} />
            {/* School Dashboard Routes */}
            <Route path="/school" element={<SchoolDashboard />} />
            <Route path="/school/overview" element={<SchoolOverviewPage />} />
            <Route path="/school/stages" element={<SchoolStagesPage />} />
            <Route path="/school/subjects" element={<SchoolSubjectsPage />} />
            <Route path="/school/subjects/:subjectId/content" element={<SubjectContentPage />} />
            <Route path="/school/subjects/:subjectId/learn" element={<SchoolStudentSubjectContentPage />} />
            <Route path="/school/students" element={<SchoolStudentsPage />} />
            <Route path="/school/teachers" element={<SchoolTeachersPage />} />
            <Route path="/school/classes" element={<SchoolClassesPage />} />
            <Route path="/school/settings" element={<SchoolSettingsPage />} />
            <Route path="/school/assessments" element={<SchoolAssessmentsPage />} />
            <Route path="/school/assessments/:assessmentId/questions" element={<SchoolAssessmentQuestionsPage />} />
            <Route path="/school/assessment-results" element={<SchoolAssessmentResultsPage />} />
            <Route path="/school/activity" element={<SchoolActivityPage />} />
            <Route path="/school/student-results" element={<SchoolStudentResultsPage />} />
            <Route path="/level-assessment" element={<LevelAssessmentPage />} />
            <Route path="/level-assessment/:assessmentId" element={<LevelAssessmentExamPage />} />
            <Route path="/assessment-invite/:assessmentId" element={<AssessmentInvitePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
