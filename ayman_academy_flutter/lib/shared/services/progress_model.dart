import 'package:ayman_academy_app/shared/models/lesson_block.dart';

/// How much of a lesson a student has actually got through.
///
/// The Dart counterpart of `src/lib/progressModel.ts`. Keep the two in step:
/// a student who studies the same lesson on the web and in the app must not
/// see two different percentages.
///
/// The app's previous model was raw scroll position —
/// `pixels / maxScrollExtent * 100` — which is wrong in four ways a student
/// notices:
///
///   1. Dragging the scrollbar to the bottom read 100% and, at >= 90%,
///      marked the lesson COMPLETE. Nothing was read.
///   2. It was NOT monotonic: scrolling back up to re-read something lowered
///      the recorded progress, and `_saveProgress` then wrote the lower
///      number to the database.
///   3. A short lesson that fits on one screen has `maxScrollExtent == 0`, so
///      progress was stuck at 0% and the lesson could never complete.
///   4. Pixels are not content. A lesson padded with images scrolled a long
///      way for very little reading.
///
/// This model weights each block by how much there is to read and caps the
/// result by how long the student has actually been on the page.
class LessonProgressModel {
  /// Brisk reading speed. Over-estimating is the safe direction: it makes the
  /// time gate lenient, so it only ever catches obvious skipping.
  static const int wordsPerMinute = 300;

  /// Nobody takes in a block faster than this, however short it is.
  static const int minSecondsPerBlock = 3;

  /// A media block is worth this much dwell. Playback cannot be measured from
  /// the block itself.
  static const int mediaEquivalentWords = 40;

  static const Set<String> _mediaTypes = {'image', 'video', 'file', 'link'};

  /// Clamp both ends: a one-liner still counts, and one wall of text must not
  /// swamp the lesson so that reading it alone shows 95%.
  static const int _minWeight = 10;
  static const int _maxWeight = 400;

  static int _words(String? text) {
    if (text == null) return 0;
    final trimmed = text.trim();
    if (trimmed.isEmpty) return 0;
    return trimmed.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length;
  }

  /// What one block contributes, in "words of effort".
  static int blockWeight(LessonBlock block) {
    if (_mediaTypes.contains(block.type)) return mediaEquivalentWords;

    // Whichever language carries more text — a lesson may be authored in either.
    final body = [_words(block.contentAr), _words(block.contentEn)].reduce((a, b) => a > b ? a : b);
    final heading = [_words(block.titleAr), _words(block.titleEn)].reduce((a, b) => a > b ? a : b);
    final total = body + heading;

    if (total < _minWeight) return _minWeight;
    if (total > _maxWeight) return _maxWeight;
    return total;
  }

  /// Seconds this lesson is reckoned to need.
  ///
  /// Prefers the teacher's own `durationMinutes` — they know the lesson better
  /// than a word count does. Only 60% is required, so a fast reader is not
  /// punished; the gate exists to catch "scrolled to the bottom instantly".
  static int expectedSeconds({
    required List<LessonBlock> blocks,
    int? durationMinutes,
  }) {
    if (durationMinutes != null && durationMinutes > 0) {
      return (durationMinutes * 60 * 0.6).round();
    }
    final totalWords = blocks.fold<int>(0, (sum, b) => sum + blockWeight(b));
    final readingSeconds = (totalWords / wordsPerMinute) * 60;
    final floor = blocks.length * minSecondsPerBlock;
    final needed = readingSeconds * 0.6;
    return (needed > floor ? needed : floor.toDouble()).round();
  }

  /// Weighted, time-gated progress, 0-100.
  ///
  /// [seenIds] are the blocks the viewport has dwelled on. The caller keeps
  /// the maximum across calls so the number never falls.
  static int compute({
    required List<LessonBlock> blocks,
    required Set<String> seenIds,
    required int elapsedSeconds,
    int? durationMinutes,
  }) {
    if (blocks.isEmpty) return 0;

    var total = 0;
    var seen = 0;
    for (final b in blocks) {
      final w = blockWeight(b);
      total += w;
      if (seenIds.contains(b.id)) seen += w;
    }

    final contentPercent = total > 0 ? ((seen / total) * 100).round() : 0;

    final needed = expectedSeconds(blocks: blocks, durationMinutes: durationMinutes);
    // Before any time passes the cap is 0, so a lesson cannot render complete.
    final timeCap = needed <= 0 ? 100 : ((elapsedSeconds / needed) * 100).round().clamp(0, 100);

    return contentPercent < timeCap ? contentPercent : timeCap;
  }
}
