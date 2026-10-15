import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/router/routes.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/arcade_auth_scaffold.dart';

/// "Who are you?" — the fork between the student and teacher sign-ups.
///
/// Before this, Android sign-up was student-shaped with a small "are you a
/// teacher?" link at the bottom of the form, which a teacher only found after
/// reading a form written for someone else. The question now comes first,
/// because it decides which questions follow.
///
/// The slides before this are the blackboard; from here on the UI is the
/// ordinary quiet arcade chrome. That is deliberate — a teacher reaching this
/// screen should not feel they are signing up to a children's app.
class RoleChoiceScreen extends ConsumerWidget {
  /// Overrides for tests: `context.go` asserts with no GoRouter in scope.
  final VoidCallback? onStudent;
  final VoidCallback? onTeacher;

  const RoleChoiceScreen({super.key, this.onStudent, this.onTeacher});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lang = ref.watch(languageProvider);
    final t = ref.read(languageProvider.notifier).t;

    void goStudent() {
      if (onStudent != null) return onStudent!();
      context.push(Routes.register);
    }

    void goTeacher() {
      if (onTeacher != null) return onTeacher!();
      context.push(Routes.teacherApply);
    }

    return Directionality(
      textDirection: lang.languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        body: SafeArea(
          top: false,
          child: SingleChildScrollView(
            child: Column(
              children: [
                ArcadeAuthHeader(
                  title: t('من أنت؟', 'Who are you?'),
                  subtitle: t(
                    'يحدّد هذا ما سنسألك عنه بعد قليل',
                    'This decides what we ask you next',
                  ),
                  languageLabel: lang.languageCode == 'ar' ? 'EN' : 'عربي',
                  onToggleLanguage: () => ref.read(languageProvider.notifier).toggle(),
                  // Navigator, not go_router's canPop(): that extension asserts
                  // when no GoRouter is in scope.
                  onBack: Navigator.of(context).canPop()
                      ? () => Navigator.of(context).pop()
                      : null,
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 28, 20, 28),
                  child: Column(
                    children: [
                      _RoleCard(
                        key: const Key('role_student'),
                        icon: Icons.school_rounded,
                        title: t('طالب', 'Student'),
                        body: t(
                          'أدرس وأحتاج شرحاً إضافياً لموادّ مدرستي.',
                          "I'm studying and want extra help with my school subjects.",
                        ),
                        onTap: goStudent,
                      ),
                      const SizedBox(height: 14),
                      _RoleCard(
                        key: const Key('role_teacher'),
                        icon: Icons.cast_for_education_rounded,
                        title: t('معلّم', 'Teacher'),
                        body: t(
                          'أريد نشر موادّي وتدريس الطلاب على المنصّة.',
                          'I want to publish my courses and teach on the platform.',
                        ),
                        onTap: goTeacher,
                      ),
                      const SizedBox(height: 22),
                      // Wrap, not Row: the English copy is long enough to
                      // overflow a narrow phone, which a Row reports as a
                      // striped overflow box rather than reflowing.
                      Wrap(
                        alignment: WrapAlignment.center,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text(
                            t('لديك حساب؟', 'Already have an account?'),
                            style: TextStyle(
                              color: context.arc.inkSoft,
                              fontSize: 14,
                            ),
                          ),
                          TextButton(
                            key: const Key('role_go_login'),
                            onPressed: () => Navigator.of(context).canPop()
                                ? Navigator.of(context).pop()
                                : context.go(Routes.login),
                            style: TextButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 6),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: Text(t('سجّل الدخول', 'Sign in')),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// One of the two choices. A whole card is the tap target, not a button inside
/// it — on a phone the card is what the thumb aims at.
class _RoleCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String body;
  final VoidCallback onTap;

  const _RoleCard({
    super.key,
    required this.icon,
    required this.title,
    required this.body,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    return Semantics(
      button: true,
      label: title,
      child: InkWell(
        onTap: onTap,
        child: ArcadeCard(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: arc.accent,
                  border: Border.all(color: arc.line, width: Arc.borderWidth),
                ),
                // On the electric-green fill the glyph takes onAccent, never
                // white — the green is a light colour.
                child: Icon(icon, size: 26, color: arc.onAccent),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: arc.ink,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      body,
                      style: TextStyle(
                        fontSize: 13.5,
                        height: 1.5,
                        color: arc.inkSoft,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
