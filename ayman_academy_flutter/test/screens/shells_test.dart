import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/shared/widgets/shells/arcade_drawer.dart';

import '../support/harness.dart';

/// The shells themselves take a `StatefulNavigationShell`, which only go_router
/// can build, so these exercise [ArcadeDrawer] and [ArcadeNavBar] directly —
/// the two pieces the shells actually contribute, and the two the student and
/// teacher shells now share rather than duplicate.
void main() {
  setUpAll(initTestHive);
  setUp(resetSettings);

  Future<void> pumpDrawer(
    WidgetTester tester,
    List<ArcadeDrawerItem> items, {
    bool dark = false,
  }) async {
    await pumpScreen(
      tester,
      Scaffold(
        drawer: ArcadeDrawer(
          name: 'سارة أحمد',
          email: 'sara@example.com',
          roleLabel: 'حساب طالب',
          items: items,
        ),
        body: Builder(
          builder: (context) => ArcadeButton(
            key: const Key('open_drawer'),
            onPressed: () => Scaffold.of(context).openDrawer(),
            label: 'فتح',
          ),
        ),
      ),
      dark: dark,
      overrides: onlineOverrides,
    );
    await tester.tap(find.byKey(const Key('open_drawer')));
    await tester.pumpAndSettle();
  }

  group('ArcadeDrawer', () {
    testWidgets('shows the brand, the role, the name and the email',
        (tester) async {
      await pumpDrawer(tester, [
        ArcadeDrawerItem(icon: Icons.home_rounded, label: 'الرئيسية', onTap: () {}),
      ]);

      expect(find.byType(LogoMark), findsWidgets);
      expect(find.text('حساب طالب'), findsOneWidget);
      expect(find.text('سارة أحمد'), findsOneWidget);
      expect(find.text('sara@example.com'), findsOneWidget);
    });

    testWidgets('pins the email LTR so an RTL paragraph cannot reorder it',
        (tester) async {
      // In an Arabic UI the paragraph direction is RTL, which would otherwise
      // push the domain to the wrong end of a Latin address.
      await pumpDrawer(tester, [
        ArcadeDrawerItem(icon: Icons.home_rounded, label: 'الرئيسية', onTap: () {}),
      ]);

      final email = tester.widget<Text>(find.text('sara@example.com'));
      expect(email.textDirection, TextDirection.ltr);
    });

    testWidgets('every item fires its own callback', (tester) async {
      final fired = <String>[];
      await pumpDrawer(tester, [
        ArcadeDrawerItem(icon: Icons.home_rounded, label: 'الرئيسية', onTap: () => fired.add('home')),
        ArcadeDrawerItem(icon: Icons.store_rounded, label: 'المتجر', onTap: () => fired.add('market')),
        ArcadeDrawerItem(icon: Icons.book_rounded, label: 'موادي', onTap: () => fired.add('subjects')),
      ]);

      for (final label in ['الرئيسية', 'المتجر', 'موادي']) {
        await tester.tap(find.text(label));
        await tester.pumpAndSettle();
      }

      expect(fired, ['home', 'market', 'subjects']);
    });

    testWidgets('a destructive item is drawn in danger, not in ink',
        (tester) async {
      await pumpDrawer(tester, [
        ArcadeDrawerItem(icon: Icons.home_rounded, label: 'الرئيسية', onTap: () {}),
        ArcadeDrawerItem(
          icon: Icons.logout_rounded,
          label: 'تسجيل الخروج',
          onTap: () {},
          danger: true,
        ),
      ]);

      final arc = tester.element(find.byType(ArcadeDrawer)).arc;
      expect(tester.widget<Text>(find.text('تسجيل الخروج')).style!.color, arc.danger);
      expect(tester.widget<Text>(find.text('الرئيسية')).style!.color, arc.ink);
    });

    testWidgets('startsGroup inserts a pixel divider above the item',
        (tester) async {
      await pumpDrawer(tester, [
        ArcadeDrawerItem(icon: Icons.home_rounded, label: 'الرئيسية', onTap: () {}),
        ArcadeDrawerItem(
          icon: Icons.emoji_events_rounded,
          label: 'إنجازاتي',
          onTap: () {},
          startsGroup: true,
        ),
      ]);

      expect(find.byType(PixelDivider), findsOneWidget);
    });

    testWidgets('renders in dark mode', (tester) async {
      await pumpDrawer(
        tester,
        [ArcadeDrawerItem(icon: Icons.home_rounded, label: 'الرئيسية', onTap: () {})],
        dark: true,
      );

      final arc = tester.element(find.byType(ArcadeDrawer)).arc;
      expect(arc.ink, Arc.dark.ink);
      expect(find.text('سارة أحمد'), findsOneWidget);
    });
  });

  group('ArcadeNavBar', () {
    Future<void> pumpNav(
      WidgetTester tester,
      int selected,
      ValueChanged<int> onSelect, {
      bool dark = false,
    }) async {
      await pumpScreen(
        tester,
        Scaffold(
          body: const SizedBox.shrink(),
          bottomNavigationBar: ArcadeNavBar(
            selectedIndex: selected,
            onDestinationSelected: onSelect,
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.star_outline_rounded),
                selectedIcon: Icon(Icons.star_rounded),
                label: 'المميز',
              ),
              NavigationDestination(
                icon: Icon(Icons.play_circle_outline_rounded),
                selectedIcon: Icon(Icons.play_circle_rounded),
                label: 'تعلّمي',
              ),
              NavigationDestination(
                icon: Icon(Icons.person_outline_rounded),
                selectedIcon: Icon(Icons.person_rounded),
                label: 'حسابي',
              ),
            ],
          ),
        ),
        dark: dark,
        overrides: onlineOverrides,
      );
      await tester.pumpAndSettle();
    }

    testWidgets('renders every destination', (tester) async {
      await pumpNav(tester, 0, (_) {});
      expect(find.text('المميز'), findsOneWidget);
      expect(find.text('تعلّمي'), findsOneWidget);
      expect(find.text('حسابي'), findsOneWidget);
    });

    testWidgets('tapping a destination reports its index', (tester) async {
      final taps = <int>[];
      await pumpNav(tester, 0, taps.add);

      await tester.tap(find.text('تعلّمي'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('حسابي'));
      await tester.pumpAndSettle();

      expect(taps, [1, 2]);
    });

    testWidgets('tapping the current destination still reports — that is how '
        'the shell pops back to a branch root', (tester) async {
      final taps = <int>[];
      await pumpNav(tester, 1, taps.add);

      await tester.tap(find.text('تعلّمي'));
      await tester.pumpAndSettle();

      expect(taps, [1]);
    });

    testWidgets('a 2px rule separates the bar from the content', (tester) async {
      await pumpNav(tester, 0, (_) {});
      final arc = tester.element(find.byType(ArcadeNavBar)).arc;

      final rule = tester.widgetList<Container>(
        find.descendant(of: find.byType(ArcadeNavBar), matching: find.byType(Container)),
      ).firstWhere((c) => c.constraints?.maxHeight == Arc.borderWidth);

      expect(rule.color, arc.line);
    });

    testWidgets('the selected destination sits on the accent chip', (tester) async {
      await pumpNav(tester, 0, (_) {});
      final theme = Theme.of(tester.element(find.byType(ArcadeNavBar)));
      final arc = theme.extension<Arc>()!;

      expect(theme.navigationBarTheme.indicatorColor, arc.accent);
      // Square, not the Material pill.
      final shape = theme.navigationBarTheme.indicatorShape! as RoundedRectangleBorder;
      expect(shape.borderRadius, BorderRadius.zero);
    });

    testWidgets('renders in dark mode', (tester) async {
      await pumpNav(tester, 0, (_) {}, dark: true);
      expect(find.text('المميز'), findsOneWidget);
      final arc = tester.element(find.byType(ArcadeNavBar)).arc;
      expect(arc.line, Arc.dark.line);
    });
  });
}
