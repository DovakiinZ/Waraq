abstract class Routes {
  static const splash = '/splash';
  static const login = '/auth/login';
  static const register = '/auth/register';
  static const resetPassword = '/auth/reset-password';
  static const onboarding = '/onboarding';
  static const adminWebOnly = '/admin-web-only';

  // Student
  static const studentHome = '/student';
  static const mySubjects = '/student/subjects';
  static const certificates = '/student/certificates';
  static const studentMessages = '/student/messages';
  static const studentProfile = '/student/profile';
  static const marketplace = '/student/marketplace';

  // Teacher
  static const teacherHome = '/teacher';
  static const teacherSubjects = '/teacher/subjects';
  static const teacherAnnouncements = '/teacher/announcements';
  static const teacherMessages = '/teacher/messages';
  static const teacherProfile = '/teacher/profile';
  static const teacherCertificates = '/teacher/certificates';
  static const teacherOrders = '/teacher/orders';
}
