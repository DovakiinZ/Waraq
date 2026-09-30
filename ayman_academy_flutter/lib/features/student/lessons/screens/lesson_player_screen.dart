import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/lesson_block_renderer.dart';
import 'package:ayman_academy_app/shared/models/lesson_block.dart';
import 'package:ayman_academy_app/shared/services/progress_model.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';
import 'package:ayman_academy_app/features/student/lessons/providers/lesson_provider.dart';
import 'package:ayman_academy_app/features/student/lessons/widgets/lesson_summary_card.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';

class LessonPlayerScreen extends ConsumerStatefulWidget {
  final String lessonId;

  const LessonPlayerScreen({super.key, required this.lessonId});

  @override
  ConsumerState<LessonPlayerScreen> createState() => _LessonPlayerScreenState();
}

class _LessonPlayerScreenState extends ConsumerState<LessonPlayerScreen> {
  final ScrollController _scrollController = ScrollController();

  /// Highest percentage reached. Monotonic ON PURPOSE: the old model recomputed
  /// from scroll position, so scrolling back up to re-read something LOWERED
  /// the student's recorded progress and `_saveProgress` wrote the lower value.
  double _scrollProgress = 0.0;

  /// Blocks the viewport has actually dwelled on. Replaces scroll pixels, which
  /// measured how far the finger moved rather than how much was read.
  final Set<String> _seenBlockIds = {};

  /// Blocks currently laid out, so progress can be weighted by content.
  List<LessonBlock> _blocksForProgress = const [];

  /// When the lesson opened. The model caps the percentage by this, so
  /// flinging to the bottom no longer completes a lesson.
  DateTime _openedAt = DateTime.now();

  Timer? _progressTimer;
  bool _completed = false;

  @override
  void initState() {
    super.initState();
    _openedAt = DateTime.now();
    // Every 10s rather than 30s: the time gate releases gradually, so the bar
    // needs to move while the student is reading, not in 30-second jumps.
    _progressTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      _recompute();
      _saveProgress();
    });
  }

  @override
  void dispose() {
    _saveProgress(); // Save on exit
    _progressTimer?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  /// A block scrolled into view. Called by the renderer's visibility hook.
  void _markSeen(String blockId) {
    if (_seenBlockIds.contains(blockId)) return;
    _seenBlockIds.add(blockId);
    _recompute();
  }

  void _recompute() {
    if (_blocksForProgress.isEmpty) return;
    final percent = LessonProgressModel.compute(
      blocks: _blocksForProgress,
      seenIds: _seenBlockIds,
      elapsedSeconds: DateTime.now().difference(_openedAt).inSeconds,
      durationMinutes: ref.read(lessonDetailProvider(widget.lessonId)).valueOrNull?.durationMinutes,
    ).toDouble();
    if (percent > _scrollProgress && mounted) {
      setState(() => _scrollProgress = percent);
    }
  }

  Future<void> _saveProgress() async {
    final percent = _scrollProgress.round();
    if (percent <= 0) return;
    await LessonProgressService.saveProgress(
      lessonId: widget.lessonId,
      progressPercent: percent,
    );

    if (percent >= 90 && !_completed) {
      final justCompleted = await LessonProgressService.markComplete(widget.lessonId);
      if (justCompleted && mounted) {
        setState(() => _completed = true);
        _showCompletionToast();
      }
    }
  }

  void _showCompletionToast() {
    final t = ref.read(languageProvider.notifier).t;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.celebration, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(child: Text(t('أحسنت! أكملت الدرس +50 XP', 'Well done! Lesson complete +50 XP'))),
          ],
        ),
        backgroundColor: AppColors.success,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _showNotesSheet() {
    final t = ref.read(languageProvider.notifier).t;
    final noteController = TextEditingController();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Container(
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : Colors.white,
            borderRadius: BorderRadius.zero,
          ),
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Drag handle
              Center(
                child: Container(
                  margin: const EdgeInsets.symmetric(vertical: 12),
                  width: 36,
                  height: 5,
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.borderDark : AppColors.border,
                    borderRadius: BorderRadius.zero,
                  ),
                ),
              ),
              Text(
                t('ملاحظاتي', 'My Notes'),
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: isDark ? AppColors.inkDark : AppColors.ink,
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: noteController,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: t('اكتب ملاحظة...', 'Write a note...'),
                  hintStyle: const TextStyle(color: AppColors.inkMuted),
                  filled: true,
                  fillColor: isDark ? AppColors.secondaryDark : AppColors.secondary,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.zero,
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.zero,
                    borderSide: const BorderSide(color: AppColors.accent, width: 1.5),
                  ),
                  contentPadding: const EdgeInsets.all(14),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 50,
                child: ElevatedButton(
                  onPressed: () async {
                    if (noteController.text.trim().isEmpty) return;
                    await LessonProgressService.addNote(
                      lessonId: widget.lessonId,
                      content: noteController.text.trim(),
                    );
                    ref.invalidate(lessonNotesProvider(widget.lessonId));
                    if (ctx.mounted) Navigator.pop(ctx);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.accent,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.zero,
                    ),
                  ),
                  child: Text(
                    t('حفظ', 'Save'),
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              // Existing notes
              Consumer(
                builder: (_, ref, _) {
                  final notesAsync = ref.watch(lessonNotesProvider(widget.lessonId));
                  return notesAsync.when(
                    loading: () => const SizedBox.shrink(),
                    error: (_, _) => const SizedBox.shrink(),
                    data: (notes) {
                      if (notes.isEmpty) return const SizedBox.shrink();
                      return Column(
                        children: [
                          Divider(
                            height: 24,
                            thickness: 0.5,
                            color: isDark ? AppColors.borderDark : AppColors.border,
                          ),
                          ...notes.take(5).map((n) => Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Text(
                                    n['content'] as String? ?? '',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: isDark ? AppColors.inkSecondaryDark : AppColors.inkSecondary,
                                    ),
                                  ),
                                ),
                                GestureDetector(
                                  onTap: () async {
                                    await LessonProgressService.deleteNote(n['id'] as String);
                                    ref.invalidate(lessonNotesProvider(widget.lessonId));
                                  },
                                  child: Padding(
                                    padding: const EdgeInsets.all(4),
                                    child: Icon(
                                      Icons.delete_outline,
                                      size: 18,
                                      color: AppColors.inkMuted,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          )),
                        ],
                      );
                    },
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showCommentsSheet() {
    final t = ref.read(languageProvider.notifier).t;
    final commentController = TextEditingController();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Container(
          constraints: BoxConstraints(maxHeight: MediaQuery.of(ctx).size.height * 0.6),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : Colors.white,
            borderRadius: BorderRadius.zero,
          ),
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Drag handle
              Center(
                child: Container(
                  margin: const EdgeInsets.symmetric(vertical: 12),
                  width: 36,
                  height: 5,
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.borderDark : AppColors.border,
                    borderRadius: BorderRadius.zero,
                  ),
                ),
              ),
              Text(
                t('التعليقات', 'Comments'),
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: isDark ? AppColors.inkDark : AppColors.ink,
                ),
              ),
              const SizedBox(height: 16),
              // Comment input row
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: commentController,
                      decoration: InputDecoration(
                        hintText: t('أضف تعليق...', 'Add comment...'),
                        hintStyle: const TextStyle(color: AppColors.inkMuted),
                        filled: true,
                        fillColor: isDark ? AppColors.secondaryDark : AppColors.secondary,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.zero,
                          borderSide: BorderSide.none,
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.zero,
                          borderSide: const BorderSide(color: AppColors.accent, width: 1.5),
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  GestureDetector(
                    onTap: () async {
                      if (commentController.text.trim().isEmpty) return;
                      await LessonProgressService.addComment(
                        lessonId: widget.lessonId,
                        content: commentController.text.trim(),
                      );
                      commentController.clear();
                      ref.invalidate(lessonCommentsProvider(widget.lessonId));
                    },
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.accent,
                        borderRadius: BorderRadius.zero,
                      ),
                      child: const Icon(Icons.send, color: Colors.white, size: 20),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Flexible(
                child: Consumer(
                  builder: (_, ref, _) {
                    final commentsAsync = ref.watch(lessonCommentsProvider(widget.lessonId));
                    return commentsAsync.when(
                      loading: () => const Center(
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accent),
                      ),
                      error: (e, _) => Text('$e'),
                      data: (comments) {
                        if (comments.isEmpty) {
                          return Center(
                            child: Text(
                              t('لا توجد تعليقات', 'No comments yet'),
                              style: const TextStyle(color: AppColors.inkMuted),
                            ),
                          );
                        }
                        return ListView.separated(
                          shrinkWrap: true,
                          itemCount: comments.length,
                          separatorBuilder: (_, __) => Divider(
                            height: 1,
                            thickness: 0.5,
                            color: isDark ? AppColors.borderDark : AppColors.border,
                          ),
                          itemBuilder: (_, i) {
                            final c = comments[i];
                            final user = c['user'] as Map<String, dynamic>?;
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  CircleAvatar(
                                    radius: 16,
                                    backgroundColor: AppColors.accent.withValues(alpha: 0.1),
                                    child: Text(
                                      (user?['full_name'] as String? ?? '?')[0],
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.accent,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          user?['full_name'] as String? ?? '',
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w700,
                                            color: isDark ? AppColors.inkDark : AppColors.ink,
                                          ),
                                        ),
                                        const SizedBox(height: 3),
                                        Text(
                                          c['content'] as String? ?? '',
                                          style: TextStyle(
                                            fontSize: 14,
                                            color: isDark ? AppColors.inkSecondaryDark : AppColors.inkSecondary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showRatingDialog() {
    final t = ref.read(languageProvider.notifier).t;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    int selectedStars = 5;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => Container(
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : Colors.white,
            borderRadius: BorderRadius.zero,
          ),
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Drag handle
              Center(
                child: Container(
                  margin: const EdgeInsets.symmetric(vertical: 12),
                  width: 36,
                  height: 5,
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.borderDark : AppColors.border,
                    borderRadius: BorderRadius.zero,
                  ),
                ),
              ),
              Text(
                t('تقييم الدرس', 'Rate Lesson'),
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: isDark ? AppColors.inkDark : AppColors.ink,
                ),
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (i) => GestureDetector(
                  onTap: () => setDialogState(() => selectedStars = i + 1),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 6),
                    child: Icon(
                      i < selectedStars ? Icons.star_rounded : Icons.star_outline_rounded,
                      color: AppColors.starFilled,
                      size: 40,
                    ),
                  ),
                )),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 50,
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(ctx),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: isDark ? AppColors.inkDark : AppColors.ink,
                          side: BorderSide(
                            color: isDark ? AppColors.borderDark : AppColors.border,
                            width: 0.5,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.zero,
                          ),
                        ),
                        child: Text(
                          t('إلغاء', 'Cancel'),
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: SizedBox(
                      height: 50,
                      child: ElevatedButton(
                        onPressed: () async {
                          await LessonProgressService.rateLesson(
                            lessonId: widget.lessonId,
                            stars: selectedStars,
                          );
                          if (ctx.mounted) Navigator.pop(ctx);
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(t('شكراً لتقييمك!', 'Thanks for rating!')),
                                backgroundColor: AppColors.success,
                              ),
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.accent,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.zero,
                          ),
                        ),
                        child: Text(
                          t('تقييم', 'Rate'),
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final lessonAsync = ref.watch(lessonDetailProvider(widget.lessonId));
    final blocksAsync = ref.watch(lessonBlocksProvider(widget.lessonId));
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        backgroundColor: isDark ? AppColors.backgroundDark : Colors.white,
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
            onPressed: () => Navigator.of(context).pop(),
          ),
          title: lessonAsync.when(
            data: (l) => Text(
              l?.title(lang) ?? '',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: isDark ? AppColors.inkDark : AppColors.ink,
              ),
            ),
            loading: () => const Text('...'),
            error: (_, _) => const Text(''),
          ),
          backgroundColor: isDark ? AppColors.backgroundDark : Colors.white,
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          foregroundColor: isDark ? AppColors.inkDark : AppColors.ink,
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(2),
            child: LinearProgressIndicator(
              value: _scrollProgress / 100,
              backgroundColor: isDark ? AppColors.borderDark : AppColors.border,
              valueColor: AlwaysStoppedAnimation(
                _scrollProgress >= 90 ? AppColors.success : AppColors.accent,
              ),
              minHeight: 2,
            ),
          ),
        ),
        body: Column(
          children: [
            // Content
            Expanded(
              child: blocksAsync.when(
                loading: () => const LoadingShimmer(),
                error: (e, _) => Center(child: Text('$e')),
                data: (blocks) {
                  if (blocks.isEmpty) {
                    // After migration 109 an unentitled student receives the
                    // lesson row with ZERO blocks rather than an error, so an
                    // empty list means "locked" far more often than it means
                    // "the teacher wrote nothing". A free-preview lesson is the
                    // exception: empty there really is an authoring gap, and
                    // showing a purchase CTA for it would be wrong.
                    final lesson = lessonAsync.valueOrNull;
                    final locked = lesson != null && !(lesson.isFreePreview);
                    if (locked) {
                      return _LessonLocked(subjectId: lesson.subjectId, t: t);
                    }
                    return Center(
                      child: Text(
                        t('لا يوجد محتوى بعد', 'No content yet'),
                        style: const TextStyle(color: AppColors.inkMuted),
                      ),
                    );
                  }
                  // The AI summary sits above the lesson body, as on the web.
                  // It renders nothing unless an APPROVED summary came back,
                  // so index 0 is simply empty for most lessons.
                  // Hand the block list to the progress model once per build
                  // rather than storing it in the provider — it is view state.
                  _blocksForProgress = blocks;

                  return ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 80),
                    itemCount: blocks.length + 1,
                    itemBuilder: (context, index) {
                      if (index == 0) {
                        return LessonSummaryCard(lessonId: widget.lessonId);
                      }
                      final block = blocks[index - 1];
                      // ListView.builder only builds what is near the viewport,
                      // so "was built" is a good proxy for "was scrolled to" —
                      // and unlike scroll pixels it is tied to actual content.
                      // Deferred so it never calls setState mid-build.
                      WidgetsBinding.instance.addPostFrameCallback(
                        (_) => _markSeen(block.id),
                      );
                      return LessonBlockRenderer(block: block);
                    },
                  );
                },
              ),
            ),
          ],
        ),

        // Bottom action bar — iOS-style
        bottomNavigationBar: Container(
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : Colors.white,
            border: Border(
              top: BorderSide(
                color: isDark ? AppColors.borderDark : AppColors.border,
                width: 0.5,
              ),
            ),
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _BottomAction(
                    icon: Icons.note_add_outlined,
                    label: t('ملاحظات', 'Notes'),
                    onTap: _showNotesSheet,
                    isDark: isDark,
                  ),
                  _BottomAction(
                    icon: Icons.comment_outlined,
                    label: t('تعليقات', 'Comments'),
                    onTap: _showCommentsSheet,
                    isDark: isDark,
                  ),
                  _BottomAction(
                    icon: Icons.star_outline_rounded,
                    label: t('تقييم', 'Rate'),
                    onTap: _showRatingDialog,
                    isDark: isDark,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BottomAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool isDark;

  const _BottomAction({
    required this.icon,
    required this.label,
    required this.onTap,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 22,
              color: isDark ? AppColors.inkSecondaryDark : AppColors.inkSecondary,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: isDark ? AppColors.inkSecondaryDark : AppColors.inkSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}


/// Shown when RLS withheld a lesson's content — i.e. the student has not
/// bought the course. The web counterpart is
/// `src/components/shared/LessonLocked.tsx`; keep the copy in step.
///
/// Deliberately does not try to explain WHY beyond "not enrolled": the
/// difference between unpublished, unpurchased and inactive is not the
/// student's problem, and guessing wrong is worse than a clear next step.
class _LessonLocked extends StatelessWidget {
  final String subjectId;
  final String Function(String, String) t;

  const _LessonLocked({required this.subjectId, required this.t});

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.lock_outline, size: 48, color: arc.mid),
            const SizedBox(height: 16),
            Text(
              t('هذا الدرس مقفل', 'This lesson is locked'),
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: arc.ink,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              t(
                'اشترك في هذه المادة لفتح محتوى الدرس كاملاً.',
                'Enrol in this course to unlock the full lesson content.',
              ),
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: arc.inkSoft),
            ),
            const SizedBox(height: 24),
            ArcadeButton(
              label: t('عرض المادة والاشتراك', 'View course & enrol'),
              onPressed: () => context.push('/student/subjects/subject/$subjectId'),
            ),
          ],
        ),
      ),
    );
  }
}
