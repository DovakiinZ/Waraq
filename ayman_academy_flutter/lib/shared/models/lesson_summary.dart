/// The AI summary ("الملخص الذكي") for one lesson.
///
/// Mirrors `lesson_summaries` (migration 108) and the web's
/// `src/lib/lessonSummary.ts`. Students only ever receive rows with
/// `status == 'approved'` — RLS decides that, not this model — but the status
/// is carried anyway so the app can refuse to render a draft that a teacher
/// account legitimately received.
///
/// NOT `lessons.summary_ar`, which is a separate short teacher-written blurb
/// shown on course listings.
class LessonSummarySlide {
  final String title;
  final List<String> bullets;

  const LessonSummarySlide({required this.title, required this.bullets});

  factory LessonSummarySlide.fromJson(Map<String, dynamic> json) => LessonSummarySlide(
        title: json['title'] as String? ?? '',
        bullets: (json['bullets'] as List<dynamic>? ?? const [])
            .map((e) => e.toString())
            .where((e) => e.trim().isNotEmpty)
            .toList(),
      );
}

class LessonSummary {
  final String id;
  final String lessonId;
  final String status;
  final String? summaryAr;
  final String? summaryEn;
  final List<String> keyPointsAr;
  final List<String> keyPointsEn;
  final List<LessonSummarySlide> slidesAr;
  final List<LessonSummarySlide> slidesEn;
  final String? model;

  const LessonSummary({
    required this.id,
    required this.lessonId,
    required this.status,
    this.summaryAr,
    this.summaryEn,
    this.keyPointsAr = const [],
    this.keyPointsEn = const [],
    this.slidesAr = const [],
    this.slidesEn = const [],
    this.model,
  });

  static List<String> _strings(dynamic v) => (v as List<dynamic>? ?? const [])
      .map((e) => e.toString())
      .where((e) => e.trim().isNotEmpty)
      .toList();

  static List<LessonSummarySlide> _slides(dynamic v) => (v as List<dynamic>? ?? const [])
      .whereType<Map<String, dynamic>>()
      .map(LessonSummarySlide.fromJson)
      .where((s) => s.title.trim().isNotEmpty || s.bullets.isNotEmpty)
      .toList();

  factory LessonSummary.fromJson(Map<String, dynamic> json) => LessonSummary(
        id: json['id'] as String? ?? '',
        lessonId: json['lesson_id'] as String? ?? '',
        status: json['status'] as String? ?? 'draft',
        summaryAr: json['summary_ar'] as String?,
        summaryEn: json['summary_en'] as String?,
        keyPointsAr: _strings(json['key_points_ar']),
        keyPointsEn: _strings(json['key_points_en']),
        slidesAr: _slides(json['slides_ar']),
        slidesEn: _slides(json['slides_en']),
        model: json['model'] as String?,
      );

  bool get isApproved => status == 'approved';

  bool _hasEnglish() =>
      (summaryEn?.trim().isNotEmpty ?? false) || keyPointsEn.isNotEmpty || slidesEn.isNotEmpty;

  /// English falls back to Arabic, matching the platform-wide
  /// `t(ar, en || ar)` rule — English is optional when a teacher approves.
  bool _useArabic(String lang) => lang != 'en' || !_hasEnglish();

  String summary(String lang) =>
      (_useArabic(lang) ? summaryAr : summaryEn)?.trim() ?? '';

  List<String> keyPoints(String lang) => _useArabic(lang) ? keyPointsAr : keyPointsEn;

  List<LessonSummarySlide> slides(String lang) => _useArabic(lang) ? slidesAr : slidesEn;

  /// The direction the summary must be laid out in, which is NOT necessarily
  /// the app's current language: an English UI showing an Arabic-only summary
  /// still needs RTL.
  bool isRtlFor(String lang) => _useArabic(lang);

  /// Blank-line separated paragraphs, as the generator emits them.
  List<String> paragraphs(String lang) => summary(lang)
      .split(RegExp(r'\n\s*\n'))
      .map((p) => p.trim())
      .where((p) => p.isNotEmpty)
      .toList();

  bool hasContent(String lang) =>
      summary(lang).isNotEmpty || keyPoints(lang).isNotEmpty || slides(lang).isNotEmpty;
}
