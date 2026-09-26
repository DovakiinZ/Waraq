import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/models/student_level.dart';
import 'package:ayman_academy_app/shared/models/subject.dart';
import 'package:ayman_academy_app/shared/widgets/avatar_widget.dart';
import 'package:ayman_academy_app/shared/widgets/bestseller_badge.dart';
import 'package:ayman_academy_app/shared/widgets/empty_state.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';
import 'package:ayman_academy_app/shared/widgets/star_rating.dart';
import 'package:ayman_academy_app/shared/widgets/subject_card.dart';

import '../support/harness.dart';

Subject makeSubject({
  String titleAr = 'الرياضيات',
  String titleEn = 'Mathematics',
  String? teacher = 'أ. محمد',
  bool isPaid = true,
  double? price = 15000,
  double? rating,
  int? ratingCount,
  int? progress,
}) {
  return Subject(
    id: 's1',
    titleAr: titleAr,
    titleEn: titleEn,
    teacherName: teacher,
    isPaid: isPaid,
    priceAmount: price,
    priceCurrency: 'SYP',
    averageRating: rating,
    ratingCount: ratingCount,
    progressPercent: progress,
  );
}

void main() {
  setUpAll(initTestHive);
  setUp(resetSettings);

  group('SubjectCard', () {
    testWidgets('shows the title, the teacher and the price', (tester) async {
      await pumpScreen(
        tester,
        Scaffold(body: SizedBox(width: 200, child: SubjectCard(subject: makeSubject(), lang: 'ar'))),
        overrides: onlineOverrides,
      );
      await tester.pumpAndSettle();

      expect(find.text('الرياضيات'), findsOneWidget);
      expect(find.text('أ. محمد'), findsOneWidget);
      expect(find.textContaining('15000'), findsOneWidget);
    });

    testWidgets('uses the English title in English', (tester) async {
      await pumpScreen(
        tester,
        Scaffold(body: SizedBox(width: 200, child: SubjectCard(subject: makeSubject(), lang: 'en'))),
        overrides: onlineOverrides,
      );
      await tester.pumpAndSettle();

      expect(find.text('Mathematics'), findsOneWidget);
      expect(find.text('الرياضيات'), findsNothing);
    });

    testWidgets('a free course gets the one accent fill on the card',
        (tester) async {
      await pumpScreen(
        tester,
        Scaffold(
          body: SizedBox(
            width: 200,
            child: SubjectCard(subject: makeSubject(isPaid: false), lang: 'ar'),
          ),
        ),
        overrides: onlineOverrides,
      );
      await tester.pumpAndSettle();

      expect(find.text('مجاني'), findsOneWidget);
      // The card carries two chips here — the "NEW" marker and the price — so
      // select the price one by its label rather than by position.
      final chip = tester.widget<ArcadeChip>(
        find.ancestor(of: find.text('مجاني'), matching: find.byType(ArcadeChip)),
      );
      expect(chip.filled, isTrue);
    });

    testWidgets('a course with fewer than three ratings reads NEW, not a '
        'made-up 4.5', (tester) async {
      // The old card defaulted to `?? 4.5`, inventing a rating for courses
      // nobody had reviewed. One bad early review can also sink a new course,
      // so the threshold protects both directions.
      await pumpScreen(
        tester,
        Scaffold(
          body: SizedBox(
            width: 200,
            child: SubjectCard(subject: makeSubject(rating: 5, ratingCount: 2), lang: 'ar'),
          ),
        ),
        overrides: onlineOverrides,
      );
      await tester.pumpAndSettle();

      expect(find.byType(StarRating), findsNothing);
      expect(find.text('جديد'), findsOneWidget);
    });

    testWidgets('three or more ratings show the real average', (tester) async {
      await pumpScreen(
        tester,
        Scaffold(
          body: SizedBox(
            width: 200,
            child: SubjectCard(subject: makeSubject(rating: 4.2, ratingCount: 12), lang: 'ar'),
          ),
        ),
        overrides: onlineOverrides,
      );
      await tester.pumpAndSettle();

      expect(find.byType(StarRating), findsOneWidget);
      expect(find.text('4.2'), findsOneWidget);
    });

    testWidgets('more than ten ratings earn the bestseller badge', (tester) async {
      await pumpScreen(
        tester,
        Scaffold(
          body: SizedBox(
            width: 200,
            child: SubjectCard(subject: makeSubject(rating: 4.8, ratingCount: 40), lang: 'ar'),
          ),
        ),
        overrides: onlineOverrides,
      );
      await tester.pumpAndSettle();

      expect(find.byType(BestsellerBadge), findsOneWidget);
    });

    testWidgets('progress renders only when asked for, and reads "completed" '
        'at 100', (tester) async {
      await pumpScreen(
        tester,
        Scaffold(
          body: SizedBox(
            width: 200,
            child: SubjectCard(
              subject: makeSubject(progress: 100),
              lang: 'ar',
              showProgress: true,
            ),
          ),
        ),
        overrides: onlineOverrides,
      );
      await tester.pumpAndSettle();

      expect(find.text('اكتمل'), findsOneWidget);
    });

    testWidgets('partial progress shows the percentage', (tester) async {
      await pumpScreen(
        tester,
        Scaffold(
          body: SizedBox(
            width: 200,
            child: SubjectCard(
              subject: makeSubject(progress: 40),
              lang: 'ar',
              showProgress: true,
            ),
          ),
        ),
        overrides: onlineOverrides,
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('40%'), findsOneWidget);
    });

    testWidgets('the whole card is the tap target', (tester) async {
      var taps = 0;
      await pumpScreen(
        tester,
        Scaffold(
          body: SizedBox(
            width: 200,
            child: SubjectCard(subject: makeSubject(), lang: 'ar', onTap: () => taps++),
          ),
        ),
        overrides: onlineOverrides,
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byType(SubjectCard));
      await tester.pump();
      expect(taps, 1);
    });

    testWidgets('a missing cover falls back to the brand mark, not a broken '
        'image', (tester) async {
      await pumpScreen(
        tester,
        Scaffold(body: SizedBox(width: 200, child: SubjectCard(subject: makeSubject(), lang: 'ar'))),
        overrides: onlineOverrides,
      );
      await tester.pumpAndSettle();

      expect(find.byType(LogoMark), findsOneWidget);
    });

    testWidgets('renders in dark mode', (tester) async {
      await pumpScreen(
        tester,
        Scaffold(body: SizedBox(width: 200, child: SubjectCard(subject: makeSubject(), lang: 'ar'))),
        dark: true,
        overrides: onlineOverrides,
      );
      await tester.pumpAndSettle();

      final arc = tester.element(find.byType(SubjectCard)).arc;
      expect(tester.widget<Text>(find.text('الرياضيات')).style!.color, arc.ink);
      expect(arc.ink, Arc.dark.ink);
    });
  });

  group('StarRating', () {
    testWidgets('renders five stars and the numeric average', (tester) async {
      await pumpScreen(
        tester,
        const Scaffold(body: StarRating(rating: 3.5, reviewCount: 8)),
        overrides: onlineOverrides,
      );
      await tester.pumpAndSettle();

      expect(find.text('3.5'), findsOneWidget);
      expect(find.text('(8)'), findsOneWidget);

      final stars = tester.widgetList<Icon>(find.byType(Icon)).length;
      expect(stars, 5);
    });

    testWidgets('empty stars use inkSoft, not a washed-out gold', (tester) async {
      await pumpScreen(
        tester,
        const Scaffold(body: StarRating(rating: 2, showCount: false)),
        overrides: onlineOverrides,
      );
      await tester.pumpAndSettle();

      final arc = tester.element(find.byType(StarRating)).arc;
      final icons = tester.widgetList<Icon>(find.byType(Icon)).toList();
      expect(icons.where((i) => i.color == AppColors.gold).length, 2);
      expect(icons.where((i) => i.color == arc.inkSoft).length, 3);
    });

    testWidgets('abbreviates large review counts', (tester) async {
      await pumpScreen(
        tester,
        const Scaffold(body: StarRating(rating: 4.7, reviewCount: 2400)),
        overrides: onlineOverrides,
      );
      await tester.pumpAndSettle();
      expect(find.text('(2.4k)'), findsOneWidget);
    });
  });

  group('AvatarWidget', () {
    testWidgets('falls back to the initial when there is no image',
        (tester) async {
      await pumpScreen(
        tester,
        const Scaffold(body: AvatarWidget(name: 'سارة')),
        overrides: onlineOverrides,
      );
      await tester.pumpAndSettle();
      expect(find.text('س'), findsOneWidget);
    });

    testWidgets('handles an empty name without crashing', (tester) async {
      await pumpScreen(
        tester,
        const Scaffold(body: AvatarWidget(name: '   ')),
        overrides: onlineOverrides,
      );
      await tester.pumpAndSettle();
      expect(find.text('?'), findsOneWidget);
    });

    testWidgets('is a square plate, not a circle — radius 0 includes avatars',
        (tester) async {
      await pumpScreen(
        tester,
        const Scaffold(body: AvatarWidget(name: 'سارة', radius: 24)),
        overrides: onlineOverrides,
      );
      await tester.pumpAndSettle();

      expect(find.byType(CircleAvatar), findsNothing);
      final box = tester.widgetList<Container>(find.byType(Container))
          .firstWhere((c) => c.decoration is BoxDecoration);
      final d = box.decoration! as BoxDecoration;
      expect(d.shape, BoxShape.rectangle);
      expect(d.borderRadius, isNull);
      expect((d.border as Border).top.width, Arc.borderWidth);
    });

    testWidgets('announces the person it represents', (tester) async {
      await pumpScreen(
        tester,
        const Scaffold(body: AvatarWidget(name: 'سارة أحمد')),
        overrides: onlineOverrides,
      );
      await tester.pumpAndSettle();
      expect(tester.getSemantics(find.byType(AvatarWidget)).label, contains('سارة'));
    });
  });

  group('EmptyState', () {
    testWidgets('routes through the arcade empty state and keeps its action',
        (tester) async {
      var taps = 0;
      await pumpScreen(
        tester,
        Scaffold(
          body: EmptyState(
            icon: Icons.inbox_rounded,
            title: 'لا شيء هنا بعد',
            subtitle: 'ابدأ من المتجر',
            action: ArcadeButton(onPressed: () => taps++, label: 'المتجر'),
          ),
        ),
        overrides: onlineOverrides,
      );
      await tester.pumpAndSettle();

      expect(find.byType(ArcadeEmpty), findsOneWidget);
      expect(find.text('لا شيء هنا بعد'), findsOneWidget);
      expect(find.text('ابدأ من المتجر'), findsOneWidget);

      await tester.tap(find.text('المتجر'));
      await tester.pump();
      expect(taps, 1);
    });
  });

  group('LoadingShimmer', () {
    testWidgets('renders one skeleton per placeholder row', (tester) async {
      await pumpScreen(
        tester,
        const Scaffold(body: LoadingShimmer(itemCount: 3)),
        overrides: onlineOverrides,
      );
      await tester.pump();

      expect(find.byType(ArcadeSkeleton), findsNWidgets(3));
      await tester.pumpWidget(const SizedBox.shrink());
    });

    testWidgets('ShimmerBox still compiles with the legacy radius argument',
        (tester) async {
      // The parameter is accepted and ignored so the ~10 existing call sites
      // keep working; radius is 0 everywhere now.
      await pumpScreen(
        tester,
        const Scaffold(body: ShimmerBox(width: 80, height: 12, borderRadius: 8)),
        overrides: onlineOverrides,
      );
      await tester.pump();

      expect(find.byType(ArcadeSkeleton), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
    });
  });

  group('StudentLevel', () {
    test('is bilingual — the XP bar used to show Arabic names in English', () {
      const level = StudentLevel(studentId: 'u', currentLevel: 'scholar', totalXp: 2100);
      expect(level.name('ar'), 'دارس');
      expect(level.name('en'), 'Scholar');
    });

    test('numbers the levels from one for the LEVEL chip', () {
      expect(const StudentLevel(studentId: 'u').levelNumber, 1);
      expect(const StudentLevel(studentId: 'u', currentLevel: 'learner').levelNumber, 2);
      expect(const StudentLevel(studentId: 'u', currentLevel: 'scholar').levelNumber, 3);
      expect(const StudentLevel(studentId: 'u', currentLevel: 'expert').levelNumber, 4);
      expect(StudentLevel.levelCount, 4);
    });

    test('an unknown level falls back rather than throwing', () {
      const odd = StudentLevel(studentId: 'u', currentLevel: 'wizard');
      expect(odd.levelNumber, 1);
      expect(odd.name('en'), 'Beginner');
      expect(odd.icon, '🌱');
    });

    test('the top level reports no XP left to earn', () {
      const top = StudentLevel(studentId: 'u', currentLevel: 'expert', totalXp: 9000);
      expect(top.xpToNextLevel, 0);
      expect(top.progressToNext, 1.0);
    });

    test('progress to the next level stays within 0..1', () {
      for (final xp in [0, 250, 499, 500, 1999, 2000, 4999, 5000, 50000]) {
        for (final lvl in ['beginner', 'learner', 'scholar', 'expert']) {
          final p = StudentLevel(studentId: 'u', currentLevel: lvl, totalXp: xp).progressToNext;
          expect(p, inInclusiveRange(0.0, 1.0), reason: '$lvl @ $xp');
        }
      }
    });
  });
}
