import 'package:flutter_test/flutter_test.dart';

import 'package:ayman_academy_app/shared/models/lesson_block.dart';
import 'package:ayman_academy_app/shared/services/progress_model.dart';

/// These tests pin the four defects the old scroll-position model had. Each
/// one was a real, student-visible bug:
///   1. flinging to the bottom read 100% and marked the lesson complete
///   2. a one-screen lesson could never progress past 0%
///   3. a one-line tip counted as much as six paragraphs
///   4. progress fell when the student scrolled back up
LessonBlock block(String id, {String type = 'rich_text', String? ar, String? title}) => LessonBlock(
      id: id,
      lessonId: 'lesson-1',
      type: type,
      titleAr: title,
      contentAr: ar,
      sortOrder: 0,
      isPublished: true,
    );

String wordsOf(int n) => List.filled(n, 'كلمة').join(' ');

void main() {
  group('blockWeight', () {
    test('weighs a long block above a short one', () {
      final short = LessonProgressModel.blockWeight(block('a', ar: 'سطر واحد'));
      final long = LessonProgressModel.blockWeight(block('b', ar: wordsOf(150)));
      expect(long, greaterThan(short));
    });

    test('clamps so one wall of text cannot swamp the lesson', () {
      expect(LessonProgressModel.blockWeight(block('a', ar: wordsOf(5000))), 400);
    });

    test('clamps so a near-empty block still counts', () {
      expect(LessonProgressModel.blockWeight(block('a', ar: '')), 10);
    });

    test('media counts as a fixed amount of dwell', () {
      expect(LessonProgressModel.blockWeight(block('a', type: 'image')),
          LessonProgressModel.mediaEquivalentWords);
      expect(LessonProgressModel.blockWeight(block('b', type: 'video')),
          LessonProgressModel.mediaEquivalentWords);
    });
  });

  group('the time gate', () {
    final blocks = [block('a', ar: wordsOf(300)), block('b', ar: wordsOf(300))];

    test('seeing everything instantly does NOT report 100%', () {
      final p = LessonProgressModel.compute(
        blocks: blocks, seenIds: {'a', 'b'}, elapsedSeconds: 0);
      expect(p, 0, reason: 'flinging to the bottom must not complete a lesson');
    });

    test('the same lesson reports 100% once the time has been spent', () {
      final needed = LessonProgressModel.expectedSeconds(blocks: blocks);
      final p = LessonProgressModel.compute(
        blocks: blocks, seenIds: {'a', 'b'}, elapsedSeconds: needed);
      expect(p, 100);
    });

    test('a teacher-set duration overrides the word-count estimate', () {
      final withDuration =
          LessonProgressModel.expectedSeconds(blocks: blocks, durationMinutes: 20);
      final estimated = LessonProgressModel.expectedSeconds(blocks: blocks);
      expect(withDuration, greaterThan(estimated));
      expect(withDuration, (20 * 60 * 0.6).round());
    });

    test('a one-block lesson cannot complete on render', () {
      final one = [block('a', ar: wordsOf(200))];
      expect(LessonProgressModel.compute(blocks: one, seenIds: {'a'}, elapsedSeconds: 0), 0);
    });

    test('a very short lesson still becomes completable — it is not stuck at 0', () {
      final tiny = [block('a', ar: 'قصير')];
      final needed = LessonProgressModel.expectedSeconds(blocks: tiny);
      expect(needed, greaterThan(0), reason: 'a one-screen lesson must be finishable');
      expect(LessonProgressModel.compute(blocks: tiny, seenIds: {'a'}, elapsedSeconds: needed), 100);
    });
  });

  group('content weighting', () {
    test('reading only the short block of an uneven lesson stays low', () {
      final blocks = [block('long', ar: wordsOf(400)), block('tip', ar: 'انتبه')];
      // Plenty of time, so only the content half is binding.
      final p = LessonProgressModel.compute(
        blocks: blocks, seenIds: {'tip'}, elapsedSeconds: 100000);
      expect(p, lessThan(20),
          reason: 'the old count-based model would have said 50% here');
    });

    test('reading the long block of the same lesson is most of the way', () {
      final blocks = [block('long', ar: wordsOf(400)), block('tip', ar: 'انتبه')];
      final p = LessonProgressModel.compute(
        blocks: blocks, seenIds: {'long'}, elapsedSeconds: 100000);
      expect(p, greaterThan(80));
    });

    test('an empty lesson is 0, not a divide-by-zero', () {
      expect(LessonProgressModel.compute(blocks: [], seenIds: {}, elapsedSeconds: 60), 0);
    });
  });
}
