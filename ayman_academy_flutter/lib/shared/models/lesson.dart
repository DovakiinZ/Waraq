import 'lesson_section.dart';
import 'lesson_block.dart';
import 'lesson_progress.dart';

class Lesson {
  final String id;
  final String subjectId;
  final String titleAr;
  final String? titleEn;
  final String? summaryAr;
  final int sortOrder;
  final bool isPaid;
  final bool isPublished;
  /// A lesson the teacher opened as a free sample. Post-migration-109 this is
  /// the difference between "locked, buy the course" and "the teacher has not
  /// written this yet" when no blocks come back.
  final bool isFreePreview;
  final String? videoUrl;
  final int? durationMinutes;
  final String? createdBy;
  final List<LessonSection>? sections;
  final List<LessonBlock>? blocks;
  final LessonProgress? progress;

  const Lesson({
    required this.id,
    required this.subjectId,
    required this.titleAr,
    this.isFreePreview = false,
    this.titleEn,
    this.summaryAr,
    this.sortOrder = 0,
    this.isPaid = false,
    this.isPublished = false,
    this.videoUrl,
    this.durationMinutes,
    this.createdBy,
    this.sections,
    this.blocks,
    this.progress,
  });

  factory Lesson.fromJson(Map<String, dynamic> json) => Lesson(
    id: json['id'] as String? ?? '',
    subjectId: json['subject_id'] as String? ?? '',
    titleAr: json['title_ar'] as String? ?? '',
    titleEn: json['title_en'] as String?,
    summaryAr: json['summary_ar'] as String?,
    sortOrder: json['sort_order'] as int? ?? 0,
    isPaid: json['is_paid'] as bool? ?? false,
    isPublished: json['is_published'] as bool? ?? false,
    isFreePreview: json['is_free_preview'] as bool? ?? false,
    videoUrl: json['video_url'] as String?,
    durationMinutes: json['duration_minutes'] as int?,
    createdBy: json['created_by'] as String?,
    sections: (json['lesson_sections'] as List<dynamic>?)
        ?.map((e) => LessonSection.fromJson(e as Map<String, dynamic>))
        .toList(),
    blocks: (json['lesson_blocks'] as List<dynamic>?)
        ?.map((e) => LessonBlock.fromJson(e as Map<String, dynamic>))
        .toList(),
  );

  String title(String lang) => lang == 'ar' ? titleAr : (titleEn ?? titleAr);

  /// Every `lessons` column this model actually parses — use this instead of
  /// `select('*')`.
  ///
  /// The web is moving to revoking column privileges on the video URLs so a
  /// non-purchaser cannot read them (see "Deferred: lesson video column
  /// lockdown" in the root CLAUDE.md). Once that lands, `select('*')` on
  /// `lessons` fails OUTRIGHT for every user, and published APKs are never
  /// removed — so an old build stuck on `select('*')` would break permanently.
  /// Shipping explicit lists first is what makes that revoke safe.
  static const String columns =
      'id, subject_id, title_ar, title_en, summary_ar, sort_order, '
      'is_paid, is_published, is_free_preview, video_url, duration_minutes, created_by';

  /// The same list plus the embedded content tables, for the lesson detail
  /// screen. Note the content tables are themselves gated by RLS now
  /// (migration 109): a student with no entitlement gets empty lists here,
  /// not an error.
  static const String columnsWithContent =
      '$columns, lesson_sections(*), lesson_blocks(*)';
}
