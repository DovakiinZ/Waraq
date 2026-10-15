abstract class Routes {
  static const splash = '/splash';

  /// First-run intro slides. Deliberately NOT under '/auth', since the
  /// redirect treats every '/auth' path as a signed-out destination.
  static const intro = '/intro';
  static const login = '/auth/login';
  static const register = '/auth/register';

  /// Student-or-teacher fork, shown before either sign-up form.
  static const chooseRole = '/auth/choose-role';
  static const teacherApply = '/auth/apply-teacher';
  static const resetPassword = '/auth/reset-password';
  static const onboarding = '/onboarding';
  static const adminWebOnly = '/admin-web-only';
  static const adminPanel = '/admin';

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

  /// Shared by both roles — the screen picks its tab from the signed-in role.
  static const guide = '/guide';
}
