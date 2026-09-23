import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, queryPersister, PERSIST_MAX_AGE, CACHE_BUSTER } from "@/lib/queryConfig";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { AdminRoute, TeacherRoute, StudentRoute } from "@/components/auth/RoleRoutes";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

// Public pages
import Index from "./pages/Index";
import Stages from "./pages/Stages";
import StageDetail from "./pages/StageDetail";
import SubjectDetail from "./pages/SubjectDetail";
import Subjects from "./pages/Subjects";
import LessonPage from "./pages/LessonPage";
import Plans from "./pages/Plans";
import Account from "./pages/Account";
import LandingPreview from "./pages/LandingPreview";
import LandingIndex from "./pages/landing/LandingIndex";
import LandingV1 from "./pages/landing/LandingV1";
import LandingV2 from "./pages/landing/LandingV2";
import LandingV3 from "./pages/landing/LandingV3";
import LandingV4 from "./pages/landing/LandingV4";
import LandingV5 from "./pages/landing/LandingV5";
import LandingV6 from "./pages/landing/LandingV6";
import LandingV7 from "./pages/landing/LandingV7";
import LandingV8 from "./pages/landing/LandingV8";
import LandingV9 from "./pages/landing/LandingV9";
import LandingV10 from "./pages/landing/LandingV10";
import NotFound from "./pages/NotFound";
import PublicMarketplace from "./pages/PublicMarketplace";
import PublicCoursePreview from "./pages/PublicCoursePreview";
import TeacherApplication from "./pages/TeacherApplication";
import VerifyCertificate from "./pages/VerifyCertificate";
import Instructors from "./pages/Instructors";

// Legal pages
import TermsPage from "./pages/legal/TermsPage";
import PrivacyPage from "./pages/legal/PrivacyPage";
import RefundPolicyPage from "./pages/legal/RefundPolicyPage";
import CertificatePolicyPage from "./pages/legal/CertificatePolicyPage";

// Auth pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ResetPassword from "./pages/auth/ResetPassword";
import AcceptInvite from "./pages/auth/AcceptInvite";
import AccessDenied from "./pages/AccessDenied";
import TeacherProfilePublic from "./pages/TeacherProfilePublic";

// Student pages
import StudentLayout from "./components/student/StudentLayout";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentOnboarding from "./pages/student/StudentOnboarding";
import StudentStages from "./pages/student/StudentStages";
import StudentSubjects from "./pages/student/StudentSubjects";
import StudentLessons from "./pages/student/StudentLessons";
import MySubjects from "./pages/student/MySubjects";
import StudentTeachers from "./pages/student/StudentTeachers";
import TeacherCourses from "./pages/student/TeacherCourses";
import StudentProfile from "./pages/student/StudentProfile";
import Messages from "./pages/student/Messages";
import LessonPlayer from "./pages/student/LessonPlayer";
import QuizPlayer from "./pages/student/QuizPlayer";
import MyCertificates from "./pages/student/MyCertificates";
import StudentMarketplace from "./pages/student/StudentMarketplace";
import StudentCheckout from "./pages/student/StudentCheckout";
import CoursePreview from "./pages/student/CoursePreview";

import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import TeachersManagement from "./pages/admin/TeachersManagement";
import StagesManagement from "./pages/admin/TaxonomyManagement"; // Reusing as StagesManagement
import SubjectsManagement from "./pages/admin/SubjectsManagement";
import LessonsManagement from "./pages/admin/LessonsManagement";
import HomepageManagement from "./pages/admin/HomepageManagement";
import TemplatesManagement from "./pages/admin/TemplatesManagement";
import AdminSettings from "./pages/admin/AdminSettings";
import PlansManagement from "./pages/admin/PlansManagement";
import SubscriptionsManagement from "./pages/admin/SubscriptionsManagement";
import InvitesManagement from "./pages/admin/InvitesManagement";
import OrganizationsManagement from "./pages/admin/OrganizationsManagement";
import CouponsManagement from "./pages/admin/CouponsManagement";
import OrdersManagement from "./pages/admin/OrdersManagement";
import TeacherApplications from "./pages/admin/TeacherApplications";

import TeacherLayout from "./components/teacher/TeacherLayout";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherSubjects from "./pages/teacher/TeacherSubjects";
import TeacherLessons from "./pages/teacher/TeacherLessons";
import TeacherQuizzes from "./pages/teacher/TeacherQuizzes";
import LessonEditor from "./components/admin/lessons/LessonEditor";
import TeacherProfile from "./pages/teacher/TeacherProfile";
import TeacherAnnouncements from "./pages/teacher/TeacherAnnouncements";
import TeacherCertificates from "./pages/teacher/TeacherCertificates";
import TeacherReviews from "./pages/teacher/TeacherReviews";
import TeacherOrders from "./pages/teacher/TeacherOrders";

import { TemplateProvider } from "./contexts/TemplateContext";

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister: queryPersister,
      maxAge: PERSIST_MAX_AGE,
      buster: CACHE_BUSTER,
    }}
  >
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <LanguageProvider>
            <TemplateProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<LandingPreview />} />
                  {/* Landing design variants for preview/selection */}
                  <Route path="/landing" element={<LandingIndex />} />
                  <Route path="/landing/1" element={<LandingV1 />} />
                  <Route path="/landing/2" element={<LandingV2 />} />
                  <Route path="/landing/3" element={<LandingV3 />} />
                  <Route path="/landing/4" element={<LandingV4 />} />
                  <Route path="/landing/5" element={<LandingV5 />} />
                  <Route path="/landing/6" element={<LandingV6 />} />
                  <Route path="/landing/7" element={<LandingV7 />} />
                  <Route path="/landing/8" element={<LandingV8 />} />
                  <Route path="/landing/9" element={<LandingV9 />} />
                  <Route path="/landing/10" element={<LandingV10 />} />
                  <Route path="/old" element={<Index />} />
                  <Route path="/stages" element={<Stages />} />
                  <Route path="/stages/:stageId" element={<StageDetail />} />
                  <Route path="/stages/:stageId/:subjectId" element={<SubjectDetail />} />
                  <Route path="/subjects" element={<Subjects />} />
                  <Route path="/lesson/:lessonId" element={<LessonPage />} />
                  <Route path="/plans" element={<Plans />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/t/:id" element={<TeacherProfilePublic />} />
                  <Route path="/teachers" element={<Instructors />} />
                  <Route path="/verify/:code" element={<VerifyCertificate />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/refund-policy" element={<RefundPolicyPage />} />
                  <Route path="/certificate-policy" element={<CertificatePolicyPage />} />
                  <Route path="/apply/teacher" element={<TeacherApplication />} />
                  <Route path="/marketplace" element={<PublicMarketplace />} />
                  <Route path="/course/:subjectId" element={<PublicCoursePreview />} />

                  {/* Auth routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/invite/:token" element={<AcceptInvite />} />
                  <Route path="/access-denied" element={<AccessDenied />} />

                  {/* Student Onboarding (outside protected layout so it can redirect) */}
                  <Route path="/student/onboarding" element={
                    <StudentRoute allowOnboarding>
                      <StudentOnboarding />
                    </StudentRoute>
                  } />

                  {/* Admin routes (Super Admin only) */}
                  <Route path="/admin" element={
                    <AdminRoute>
                      <AdminLayout />
                    </AdminRoute>
                  }>
                    <Route index element={<AdminDashboard />} />
                    <Route path="teachers" element={<TeachersManagement />} />
                    <Route path="stages" element={<StagesManagement />} />
                    <Route path="stages/:stageId/subjects" element={<SubjectsManagement />} />
                    <Route path="subjects" element={<SubjectsManagement />} />
                    <Route path="subjects/:subjectId/lessons" element={<LessonsManagement />} />
                    <Route path="lessons" element={<LessonsManagement />} />
                    <Route path="lessons/:id" element={<ErrorBoundary><LessonEditor /></ErrorBoundary>} />
                    <Route path="homepage" element={<HomepageManagement />} />
                    <Route path="templates" element={<TemplatesManagement />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="plans" element={<PlansManagement />} />
                    <Route path="subscriptions" element={<SubscriptionsManagement />} />
                    <Route path="invites" element={<InvitesManagement />} />
                    <Route path="organizations" element={<OrganizationsManagement />} />
                    <Route path="coupons" element={<CouponsManagement />} />
                    <Route path="applications" element={<TeacherApplications />} />
                    <Route path="orders" element={<OrdersManagement />} />
                  </Route>

                  {/* Teacher routes (accessible by teacher and super_admin) */}
                  <Route path="/teacher" element={
                    <TeacherRoute>
                      <TeacherLayout />
                    </TeacherRoute>
                  }>
                    <Route index element={<TeacherDashboard />} />
                    <Route path="orders" element={<TeacherOrders />} />
                    <Route path="subjects" element={<TeacherSubjects />} />
                    <Route path="lessons" element={<TeacherLessons />} />
                    <Route path="lessons/:id" element={<ErrorBoundary><LessonEditor /></ErrorBoundary>} />
                    <Route path="quizzes" element={<TeacherQuizzes />} />
                    <Route path="messages" element={<Messages />} />
                    <Route path="announcements" element={<TeacherAnnouncements />} />
                    <Route path="reviews" element={<TeacherReviews />} />
                    <Route path="certificates" element={<TeacherCertificates />} />
                    <Route path="profile" element={<TeacherProfile />} />
                  </Route>

                  {/* Student Routes */}
                  <Route path="/student" element={
                    <StudentRoute>
                      <StudentLayout />
                    </StudentRoute>
                  }>
                    <Route index element={<StudentDashboard />} />
                    <Route path="marketplace" element={<StudentMarketplace />} />
                    <Route path="course/:subjectId" element={<CoursePreview />} />
                    <Route path="checkout" element={<StudentCheckout />} />
                    <Route path="stages" element={<StudentStages />} />
                    <Route path="stages/:stageId" element={<StudentSubjects />} />
                    <Route path="subjects" element={<MySubjects />} />
                    <Route path="subjects/:subjectId" element={<StudentLessons />} />
                    <Route path="teachers" element={<StudentTeachers />} />
                    <Route path="teachers/:teacherId/courses" element={<TeacherCourses />} />
                    <Route path="certificates" element={<MyCertificates />} />
                    <Route path="messages" element={<Messages />} />
                    <Route path="profile" element={<StudentProfile />} />
                    <Route path="lesson/:id" element={<LessonPlayer />} />
                    <Route path="quiz/:quizId" element={<QuizPlayer />} />
                  </Route>

                  {/* Catch-all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </TooltipProvider>
            </TemplateProvider>
          </LanguageProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  </PersistQueryClientProvider>
);

export default App;
