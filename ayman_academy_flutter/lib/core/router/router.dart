import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/core/router/routes.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/features/auth/screens/login_screen.dart';
import 'package:ayman_academy_app/features/auth/screens/register_screen.dart';
import 'package:ayman_academy_app/features/auth/screens/reset_password_screen.dart';
import 'package:ayman_academy_app/features/admin/screens/admin_panel_screen.dart';
import 'package:ayman_academy_app/features/auth/screens/admin_web_only_screen.dart';
import 'package:ayman_academy_app/features/onboarding/screens/student_onboarding_screen.dart';
import 'package:ayman_academy_app/features/student/dashboard/screens/student_dashboard_screen.dart';
import 'package:ayman_academy_app/features/student/subjects/screens/my_subjects_screen.dart';
import 'package:ayman_academy_app/features/student/subjects/screens/subject_detail_screen.dart';
import 'package:ayman_academy_app/features/student/subjects/screens/discover_screen.dart';
import 'package:ayman_academy_app/features/student/lessons/screens/lesson_player_screen.dart';
import 'package:ayman_academy_app/features/student/quiz/screens/quiz_screen.dart';
import 'package:ayman_academy_app/features/student/certificates/screens/my_certificates_screen.dart';
import 'package:ayman_academy_app/features/student/certificates/screens/certificate_detail_screen.dart';
import 'package:ayman_academy_app/features/student/messages/screens/messages_contacts_screen.dart';
import 'package:ayman_academy_app/features/student/messages/screens/chat_screen.dart';
import 'package:ayman_academy_app/features/student/profile/screens/student_profile_screen.dart';
import 'package:ayman_academy_app/features/student/marketplace/screens/marketplace_screen.dart';
import 'package:ayman_academy_app/features/student/marketplace/screens/checkout_screen.dart';
import 'package:ayman_academy_app/features/teacher/dashboard/screens/teacher_dashboard_screen.dart';
import 'package:ayman_academy_app/features/teacher/subjects/screens/teacher_subjects_screen.dart';
import 'package:ayman_academy_app/features/teacher/announcements/screens/teacher_announcements_screen.dart';
import 'package:ayman_academy_app/features/teacher/messages/screens/teacher_messages_screen.dart';
import 'package:ayman_academy_app/features/teacher/profile/screens/teacher_profile_screen.dart';
import 'package:ayman_academy_app/features/teacher/orders/screens/teacher_orders_screen.dart';
import 'package:ayman_academy_app/features/teacher/subjects/screens/course_editor_screen.dart';
import 'package:ayman_academy_app/features/teacher/subjects/screens/teacher_reviews_screen.dart';
import 'package:ayman_academy_app/features/teacher/certificates/screens/teacher_certificates_screen.dart';
import 'package:ayman_academy_app/features/student/dashboard/screens/achievements_screen.dart';
import 'package:ayman_academy_app/features/student/subjects/screens/student_teachers_screen.dart';
import 'package:ayman_academy_app/shared/widgets/shells/student_shell.dart';
import 'package:ayman_academy_app/shared/widgets/shells/teacher_shell.dart';

/// Bridges Riverpod auth state to GoRouter's [Listenable] refresh hook.
class _AuthRefreshNotifier extends ChangeNotifier {
  _AuthRefreshNotifier(Ref ref) {
    ref.listen<AuthState>(authProvider, (_, _) => notifyListeners());
  }
}

// NOTE: this Provider deliberately does NOT watch authProvider. Watching it
// rebuilt the entire GoRouter on every auth change, which threw away the
// navigation stack and leaked a stream subscription each time. The router is
// built once; redirects re-run via refreshListenable and read state on demand.
final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _AuthRefreshNotifier(ref);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: Routes.splash,
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final path = state.uri.path;
      final isAuthRoute = path.startsWith('/auth');
      final isSplash = path == Routes.splash;

      // Still restoring the session: hold on the splash instead of flashing
      // the login screen on every cold start.
      if (auth.status == AuthStatus.loading) {
        return isSplash ? null : Routes.splash;
      }

      if (!auth.isAuthenticated) {
        return isAuthRoute ? null : Routes.login;
      }

      // Admins get the web CMS embedded in the app (see AdminPanelScreen).
      // adminWebOnly is kept as a fallback for builds without a web app URL.
      if (auth.isAdmin) {
        const adminPaths = {Routes.adminPanel, Routes.adminWebOnly};
        return adminPaths.contains(path) ? null : Routes.adminPanel;
      }

      if (auth.needsOnboarding) {
        return path == Routes.onboarding ? null : Routes.onboarding;
      }

      // Signed in and settled: get off the splash/auth screens.
      if (isSplash || isAuthRoute || path == Routes.onboarding) {
        return auth.isTeacher ? Routes.teacherHome : Routes.studentHome;
      }

      if (auth.isTeacher && path.startsWith('/student')) return Routes.teacherHome;
      if (auth.isStudent && path.startsWith('/teacher')) return Routes.studentHome;

      return null;
    },
    routes: [
      GoRoute(path: Routes.splash, builder: (_, _) => const _SplashScreen()),

      // Auth routes
      GoRoute(path: Routes.login, builder: (_, _) => const LoginScreen()),
      GoRoute(path: Routes.register, builder: (_, _) => const RegisterScreen()),
      GoRoute(path: Routes.resetPassword, builder: (_, _) => const ResetPasswordScreen()),
      GoRoute(path: Routes.onboarding, builder: (_, _) => const StudentOnboardingScreen()),
      GoRoute(path: Routes.adminPanel, builder: (_, _) => const AdminPanelScreen()),
      GoRoute(path: Routes.adminWebOnly, builder: (_, _) => const AdminWebOnlyScreen()),

      // Student shell
      StatefulShellRoute.indexedStack(
        builder: (_, _2, shell) => StudentShell(navigationShell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: Routes.studentHome, builder: (_, _) => const StudentDashboardScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: Routes.mySubjects,
              builder: (_, _) => const MySubjectsScreen(),
              routes: [
                GoRoute(
                  path: 'subject/:subjectId',
                  builder: (_, state) => SubjectDetailScreen(
                    subjectId: state.pathParameters['subjectId']!,
                  ),
                  routes: [
                    GoRoute(
                      path: 'lesson/:lessonId',
                      builder: (_, state) => LessonPlayerScreen(
                        lessonId: state.pathParameters['lessonId']!,
                      ),
                    ),
                    GoRoute(
                      path: 'quiz/:quizId',
                      builder: (_, state) => QuizScreen(
                        quizId: state.pathParameters['quizId']!,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: Routes.certificates,
              builder: (_, _) => const MyCertificatesScreen(),
              routes: [
                GoRoute(
                  path: ':certId',
                  builder: (_, state) => CertificateDetailScreen(
                    certId: state.pathParameters['certId']!,
                  ),
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: Routes.studentMessages,
              builder: (_, _) => const MessagesContactsScreen(),
              routes: [
                GoRoute(
                  path: ':contactId',
                  builder: (_, state) => ChatScreen(
                    contactId: state.pathParameters['contactId']!,
                    contactName: state.extra as String?,
                  ),
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: Routes.studentProfile, builder: (_, _) => const StudentProfileScreen()),
          ]),
        ],
      ),

      // Standalone student routes (outside shell)
      GoRoute(path: Routes.marketplace, builder: (_, _) => const MarketplaceScreen()),
      GoRoute(
        path: '/student/marketplace/checkout/:subjectId',
        builder: (_, state) => CheckoutScreen(
          subjectId: state.pathParameters['subjectId']!,
        ),
      ),
      GoRoute(path: '/student/discover', builder: (_, _) => const DiscoverScreen()),
      GoRoute(path: '/student/achievements', builder: (_, _) => const AchievementsScreen()),
      GoRoute(path: '/student/teachers', builder: (_, _) => const StudentTeachersScreen()),

      // Teacher shell
      StatefulShellRoute.indexedStack(
        builder: (_, _2, shell) => TeacherShell(navigationShell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: Routes.teacherHome, builder: (_, _) => const TeacherDashboardScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: Routes.teacherSubjects, builder: (_, _) => const TeacherSubjectsScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: Routes.teacherAnnouncements, builder: (_, _) => const TeacherAnnouncementsScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: Routes.teacherMessages,
              builder: (_, _) => const TeacherMessagesScreen(),
              routes: [
                GoRoute(
                  path: ':contactId',
                  builder: (_, state) => ChatScreen(
                    contactId: state.pathParameters['contactId']!,
                    contactName: state.extra as String?,
                  ),
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: Routes.teacherProfile, builder: (_, _) => const TeacherProfileScreen()),
          ]),
        ],
      ),

      // Standalone teacher routes
      GoRoute(path: Routes.teacherOrders, builder: (_, _) => const TeacherOrdersScreen()),
      GoRoute(path: Routes.teacherCertificates, builder: (_, _) => const TeacherCertificatesScreen()),
      GoRoute(path: '/teacher/reviews', builder: (_, _) => const TeacherReviewsScreen()),
      GoRoute(
        path: '/teacher/course/new',
        builder: (_, _) => const CourseEditorScreen(),
      ),
      GoRoute(
        path: '/teacher/course/:subjectId/edit',
        builder: (_, state) => CourseEditorScreen(subjectId: state.pathParameters['subjectId']!),
      ),
    ],
  );
});

/// Shown while the stored session is being restored and the profile fetched.
class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}
