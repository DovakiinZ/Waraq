import 'package:flutter_test/flutter_test.dart';

import 'package:ayman_academy_app/shared/models/lesson_summary.dart';

/// The AI summary model carries the one piece of real logic in the feature:
/// which language a student actually gets. English is OPTIONAL when a teacher
/// approves, so an English UI must fall back to Arabic — including the text
/// DIRECTION, which is the part that is easy to get wrong.
Map<String, dynamic> row({
  String status = 'approved',
  String? summaryAr = 'فقرة أولى.\n\nفقرة ثانية.',
  String? summaryEn,
  List<dynamic> keyAr = const ['نقطة'],
  List<dynamic> keyEn = const [],
  List<dynamic> slidesAr = const [
    {'title': 'عنوان', 'bullets': ['أ', 'ب']}
  ],
  List<dynamic> slidesEn = const [],
}) =>
    {
      'id': 'sum-1',
      'lesson_id': 'lesson-1',
      'status': status,
      'summary_ar': summaryAr,
      'summary_en': summaryEn,
      'key_points_ar': keyAr,
      'key_points_en': keyEn,
      'slides_ar': slidesAr,
      'slides_en': slidesEn,
      'model': 'gemini-3.5-flash-lite',
    };

void main() {
  group('LessonSummary language selection', () {
    test('Arabic UI gets the Arabic payload', () {
      final s = LessonSummary.fromJson(row());
      expect(s.summary('ar'), contains('فقرة أولى'));
      expect(s.keyPoints('ar'), ['نقطة']);
      expect(s.slides('ar').single.title, 'عنوان');
      expect(s.isRtlFor('ar'), isTrue);
    });

    test('English UI falls back to Arabic when no English was approved', () {
      final s = LessonSummary.fromJson(row());
      expect(s.summary('en'), contains('فقرة أولى'));
      expect(s.keyPoints('en'), ['نقطة']);
      // The direction must follow the CONTENT, not the UI language, or an
      // English UI renders Arabic left-to-right.
      expect(s.isRtlFor('en'), isTrue);
    });

    test('English UI gets English when it exists, and goes LTR', () {
      final s = LessonSummary.fromJson(row(
        summaryEn: 'First para.\n\nSecond para.',
        keyEn: const ['A point'],
        slidesEn: const [
          {'title': 'Title', 'bullets': ['a']}
        ],
      ));
      expect(s.summary('en'), startsWith('First para'));
      expect(s.keyPoints('en'), ['A point']);
      expect(s.isRtlFor('en'), isFalse);
      // Arabic is untouched by the presence of English.
      expect(s.summary('ar'), contains('فقرة أولى'));
      expect(s.isRtlFor('ar'), isTrue);
    });
  });

  group('LessonSummary rendering helpers', () {
    test('splits the summary on blank lines, as the generator emits it', () {
      final s = LessonSummary.fromJson(row());
      expect(s.paragraphs('ar'), ['فقرة أولى.', 'فقرة ثانية.']);
    });

    test('drops empty strings from key points and bullets', () {
      final s = LessonSummary.fromJson(row(
        keyAr: const ['نقطة', '', '   '],
        slidesAr: const [
          {'title': 'عنوان', 'bullets': ['أ', '', '  ']}
        ],
      ));
      expect(s.keyPoints('ar'), ['نقطة']);
      expect(s.slides('ar').single.bullets, ['أ']);
    });

    test('survives a row with null jsonb columns', () {
      final s = LessonSummary.fromJson({
        'id': 'x',
        'lesson_id': 'y',
        'status': 'approved',
        'summary_ar': null,
        'key_points_ar': null,
        'slides_ar': null,
      });
      expect(s.keyPoints('ar'), isEmpty);
      expect(s.slides('ar'), isEmpty);
      expect(s.summary('ar'), '');
      expect(s.hasContent('ar'), isFalse);
    });
  });

  group('LessonSummary approval', () {
    test('only an approved row counts as approved', () {
      for (final status in ['draft', 'pending_review', 'rejected']) {
        expect(LessonSummary.fromJson(row(status: status)).isApproved, isFalse,
            reason: '$status must not be treated as approved');
      }
      expect(LessonSummary.fromJson(row()).isApproved, isTrue);
    });

    test('an unknown status is not approved', () {
      expect(LessonSummary.fromJson(row(status: 'whatever')).isApproved, isFalse);
    });
  });
}
