import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/lesson_block_renderer.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';
import 'package:ayman_academy_app/features/student/lessons/providers/lesson_provider.dart';

class LessonPlayerScreen extends ConsumerStatefulWidget {
  final String lessonId;

  const LessonPlayerScreen({super.key, required this.lessonId});

  @override
  ConsumerState<LessonPlayerScreen> createState() => _LessonPlayerScreenState();
}

class _LessonPlayerScreenState extends ConsumerState<LessonPlayerScreen> {
  final ScrollController _scrollController = ScrollController();
  double _scrollProgress = 0.0;
  Timer? _progressTimer;
  bool _completed = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _progressTimer = Timer.periodic(const Duration(seconds: 30), (_) => _saveProgress());
  }

  @override
  void dispose() {
    _saveProgress(); // Save on exit
    _progressTimer?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    final maxScroll = _scrollController.position.maxScrollExtent;
    final current = _scrollController.position.pixels;
    if (maxScroll > 0) {
      setState(() => _scrollProgress = (current / maxScroll * 100).clamp(0, 100));
    }
  }

  Future<void> _saveProgress() async {
    final percent = _scrollProgress.round();
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
                    return Center(
                      child: Text(
                        t('لا يوجد محتوى بعد', 'No content yet'),
                        style: const TextStyle(color: AppColors.inkMuted),
                      ),
                    );
                  }
                  return ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 80),
                    itemCount: blocks.length,
                    itemBuilder: (context, index) {
                      return LessonBlockRenderer(block: blocks[index]);
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
