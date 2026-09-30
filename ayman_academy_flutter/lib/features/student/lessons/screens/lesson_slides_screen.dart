import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/shared/models/lesson_summary.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';
import 'package:ayman_academy_app/features/student/lessons/providers/lesson_provider.dart';

/// Slide view of an approved AI summary.
///
/// The web counterpart is `src/pages/student/LessonSlides.tsx`. Same rules:
/// approved-only, direction follows the SUMMARY's language (not the UI's),
/// and the swipe direction flips in RTL.
///
/// Deliberately not a print/PDF view. On the web the equivalent route also
/// prints; here the phone's own share sheet is the export path and a PDF
/// exporter needs an Arabic-capable font wired into the `pdf` package first —
/// see the note about `pdf_service.dart` in the Flutter CLAUDE.md.
class LessonSlidesScreen extends ConsumerStatefulWidget {
  final String lessonId;

  const LessonSlidesScreen({super.key, required this.lessonId});

  @override
  ConsumerState<LessonSlidesScreen> createState() => _LessonSlidesScreenState();
}

class _LessonSlidesScreenState extends ConsumerState<LessonSlidesScreen> {
  final _controller = PageController();
  int _index = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _go(int delta, int total) {
    final next = (_index + delta).clamp(0, total - 1);
    if (next == _index) return;
    _controller.animateToPage(next,
        duration: const Duration(milliseconds: 220), curve: Curves.easeOut);
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final arc = context.arc;
    final async = ref.watch(lessonSummaryProvider(widget.lessonId));

    return Scaffold(
      backgroundColor: arc.bg,
      appBar: AppBar(
        backgroundColor: arc.bg,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        foregroundColor: arc.ink,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(t('الملخص الذكي', 'AI summary'),
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: arc.ink)),
      ),
      body: async.when(
        loading: () => const LoadingShimmer(),
        error: (_, __) => _empty(t('تعذّر تحميل الشرائح.', 'Could not load the slides.'), arc),
        data: (summary) {
          final slides = summary?.slides(lang) ?? const <LessonSummarySlide>[];
          if (summary == null || !summary.isApproved || slides.isEmpty) {
            return _empty(
              t('لا توجد شرائح معتمدة لهذا الدرس بعد.',
                  'This lesson does not have approved slides yet.'),
              arc,
            );
          }

          final rtl = summary.isRtlFor(lang);
          // In RTL the visually-forward control is on the LEFT, so the icons
          // swap with the layout rather than with the UI language.
          final prevIcon = rtl ? Icons.chevron_right : Icons.chevron_left;
          final nextIcon = rtl ? Icons.chevron_left : Icons.chevron_right;

          return Directionality(
            textDirection: rtl ? TextDirection.rtl : TextDirection.ltr,
            child: Column(
              children: [
                Expanded(
                  child: PageView.builder(
                    controller: _controller,
                    itemCount: slides.length,
                    onPageChanged: (i) => setState(() => _index = i),
                    itemBuilder: (context, i) {
                      final s = slides[i];
                      return Semantics(
                        label: t(
                          'شريحة ${i + 1} من ${slides.length}: ${s.title}',
                          'Slide ${i + 1} of ${slides.length}: ${s.title}',
                        ),
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const SizedBox(height: 24),
                              Text(
                                s.title,
                                style: TextStyle(
                                    fontSize: 26,
                                    height: 1.3,
                                    fontWeight: FontWeight.w700,
                                    color: arc.ink),
                              ),
                              const SizedBox(height: 24),
                              for (final b in s.bullets)
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 14),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text('• ',
                                          style: TextStyle(
                                              fontSize: 18,
                                              color: arc.mid,
                                              fontWeight: FontWeight.w700)),
                                      Expanded(
                                        child: Text(b,
                                            style: TextStyle(
                                                fontSize: 18, height: 1.6, color: arc.ink)),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                Container(
                  decoration: BoxDecoration(
                    border: Border(top: BorderSide(color: arc.line, width: Arc.borderWidth)),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      IconButton(
                        icon: Icon(prevIcon),
                        color: arc.ink,
                        disabledColor: arc.inkSoft.withValues(alpha: 0.35),
                        tooltip: t('الشريحة السابقة', 'Previous slide'),
                        onPressed: _index == 0 ? null : () => _go(-1, slides.length),
                      ),
                      Semantics(
                        liveRegion: true,
                        child: Text(
                          t('${_index + 1} من ${slides.length}',
                              '${_index + 1} of ${slides.length}'),
                          style: TextStyle(fontSize: 13, color: arc.inkSoft),
                        ),
                      ),
                      IconButton(
                        icon: Icon(nextIcon),
                        color: arc.ink,
                        disabledColor: arc.inkSoft.withValues(alpha: 0.35),
                        tooltip: t('الشريحة التالية', 'Next slide'),
                        onPressed:
                            _index >= slides.length - 1 ? null : () => _go(1, slides.length),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _empty(String message, Arc arc) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.lock_outline, size: 44, color: arc.mid),
              const SizedBox(height: 14),
              Text(message,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, color: arc.inkSoft)),
            ],
          ),
        ),
      );
}
