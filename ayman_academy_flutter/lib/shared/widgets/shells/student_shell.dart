import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/core/router/routes.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/shells/arcade_drawer.dart';

class StudentShell extends ConsumerWidget {
  final StatefulNavigationShell navigationShell;

  const StudentShell({super.key, required this.navigationShell});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lang = ref.watch(languageProvider);
    final t = ref.read(languageProvider.notifier).t;
    final profile = ref.watch(authProvider).profile;

    void go(int branch) {
      Navigator.pop(context);
      navigationShell.goBranch(branch);
    }

    void push(String route) {
      Navigator.pop(context);
      context.push(route);
    }

    return Directionality(
      textDirection: lang.languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        drawer: ArcadeDrawer(
          name: profile?.fullName ?? t('طالب', 'Student'),
          email: profile?.email,
          avatarUrl: profile?.avatarUrl,
          roleLabel: t('حساب طالب', 'Student account'),
          items: [
            ArcadeDrawerItem(icon: Icons.home_rounded, label: t('الرئيسية', 'Home'), onTap: () => go(0)),
            ArcadeDrawerItem(icon: Icons.store_rounded, label: t('المتجر', 'Marketplace'), onTap: () => push(Routes.marketplace)),
            ArcadeDrawerItem(icon: Icons.book_rounded, label: t('موادي', 'My Subjects'), onTap: () => go(1)),
            ArcadeDrawerItem(icon: Icons.explore_rounded, label: t('استكشف', 'Discover'), onTap: () => push('/student/discover')),
            ArcadeDrawerItem(icon: Icons.people_rounded, label: t('المعلمون', 'Teachers'), onTap: () => push('/student/teachers')),
            ArcadeDrawerItem(
              icon: Icons.emoji_events_rounded,
              label: t('إنجازاتي', 'Achievements'),
              onTap: () => push('/student/achievements'),
              startsGroup: true,
            ),
            ArcadeDrawerItem(
              icon: Icons.workspace_premium_rounded,
              label: t('شهاداتي', 'Certificates'),
              onTap: () => go(2),
            ),
            ArcadeDrawerItem(
              icon: Icons.logout_rounded,
              label: t('تسجيل الخروج', 'Sign Out'),
              onTap: () => ref.read(authProvider.notifier).signOut(),
              danger: true,
              startsGroup: true,
            ),
          ],
        ),
        body: navigationShell,
        bottomNavigationBar: ArcadeNavBar(
          selectedIndex: navigationShell.currentIndex,
          onDestinationSelected: (index) => navigationShell.goBranch(
            index,
            initialLocation: index == navigationShell.currentIndex,
          ),
          destinations: [
            NavigationDestination(
              icon: const Icon(Icons.star_outline_rounded),
              selectedIcon: const Icon(Icons.star_rounded),
              label: t('المميز', 'Featured'),
            ),
            NavigationDestination(
              icon: const Icon(Icons.play_circle_outline_rounded),
              selectedIcon: const Icon(Icons.play_circle_rounded),
              label: t('تعلّمي', 'My learning'),
            ),
            NavigationDestination(
              icon: const Icon(Icons.workspace_premium_outlined),
              selectedIcon: const Icon(Icons.workspace_premium),
              label: t('شهادات', 'Certs'),
            ),
            NavigationDestination(
              icon: const Icon(Icons.chat_bubble_outline_rounded),
              selectedIcon: const Icon(Icons.chat_bubble_rounded),
              label: t('الرسائل', 'Messages'),
            ),
            NavigationDestination(
              icon: const Icon(Icons.person_outline_rounded),
              selectedIcon: const Icon(Icons.person_rounded),
              label: t('حسابي', 'Account'),
            ),
          ],
        ),
      ),
    );
  }
}
