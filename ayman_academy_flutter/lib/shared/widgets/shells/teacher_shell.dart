import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/core/router/routes.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/shells/arcade_drawer.dart';

class TeacherShell extends ConsumerWidget {
  final StatefulNavigationShell navigationShell;

  const TeacherShell({super.key, required this.navigationShell});

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
          name: profile?.fullName ?? t('معلم', 'Teacher'),
          email: profile?.email,
          avatarUrl: profile?.avatarUrl,
          roleLabel: t('حساب معلم', 'Teacher account'),
          items: [
            ArcadeDrawerItem(icon: Icons.home_rounded, label: t('الرئيسية', 'Dashboard'), onTap: () => go(0)),
            ArcadeDrawerItem(icon: Icons.book_rounded, label: t('موادي', 'My Courses'), onTap: () => go(1)),
            ArcadeDrawerItem(icon: Icons.receipt_long_rounded, label: t('الطلبات', 'Orders'), onTap: () => push(Routes.teacherOrders)),
            ArcadeDrawerItem(icon: Icons.star_rounded, label: t('التقييمات', 'Reviews'), onTap: () => push('/teacher/reviews')),
            ArcadeDrawerItem(
              icon: Icons.campaign_rounded,
              label: t('الإعلانات', 'Announcements'),
              onTap: () => go(2),
              startsGroup: true,
            ),
            ArcadeDrawerItem(
              icon: Icons.workspace_premium_rounded,
              label: t('الشهادات', 'Certificates'),
              onTap: () => push(Routes.teacherCertificates),
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
              icon: const Icon(Icons.home_outlined),
              selectedIcon: const Icon(Icons.home_rounded),
              label: t('الرئيسية', 'Home'),
            ),
            NavigationDestination(
              icon: const Icon(Icons.book_outlined),
              selectedIcon: const Icon(Icons.book_rounded),
              label: t('موادي', 'Courses'),
            ),
            NavigationDestination(
              icon: const Icon(Icons.campaign_outlined),
              selectedIcon: const Icon(Icons.campaign_rounded),
              label: t('إعلانات', 'Announce'),
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
