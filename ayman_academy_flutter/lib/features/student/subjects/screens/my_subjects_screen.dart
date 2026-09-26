import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';
import 'package:ayman_academy_app/shared/widgets/empty_state.dart';
import 'package:ayman_academy_app/features/student/subjects/providers/subjects_provider.dart';

class MySubjectsScreen extends ConsumerWidget {
  const MySubjectsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider);
    final subjectsAsync = ref.watch(mySubjectsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Directionality(
      textDirection: lang.languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        backgroundColor: isDark ? AppColors.backgroundDark : Colors.white,
        appBar: AppBar(
          title: Text(
            t('موادي', 'My Learning'),
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: isDark ? AppColors.inkDark : AppColors.ink,
            ),
          ),
          backgroundColor: isDark ? AppColors.backgroundDark : Colors.white,
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          actions: [
            IconButton(
              icon: Icon(
                Icons.explore_outlined,
                color: isDark ? AppColors.inkDark : AppColors.ink,
              ),
              tooltip: t('اكتشف', 'Discover'),
              onPressed: () => context.push('/student/discover'),
            ),
          ],
        ),
        body: subjectsAsync.when(
          loading: () => const LoadingShimmer(),
          error: (e, _) => Center(child: Text('$e')),
          data: (subjects) {
            if (subjects.isEmpty) {
              return EmptyState(
                icon: Icons.menu_book,
                title: t('لا توجد مواد مسجلة', 'No enrolled subjects'),
                subtitle: t('اكتشف المواد المتاحة وابدأ رحلة التعلم', 'Discover available subjects and start learning'),
                action: SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton.icon(
                    onPressed: () => context.push('/student/discover'),
                    icon: const Icon(Icons.explore_outlined),
                    label: Text(
                      t('اكتشف المواد', 'Discover Subjects'),
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accent,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.zero,
                      ),
                    ),
                  ),
                ),
              );
            }
            return RefreshIndicator(
              color: AppColors.accent,
              onRefresh: () async => ref.invalidate(mySubjectsProvider),
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: subjects.length,
                separatorBuilder: (_, __) => Divider(
                  height: 1,
                  thickness: 0.5,
                  indent: 90,
                  color: isDark ? AppColors.borderDark : AppColors.border,
                ),
                itemBuilder: (context, index) {
                  final s = subjects[index];
                  return InkWell(
                    onTap: () => context.push('/student/subjects/subject/${s.id}'),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                      child: Row(
                        children: [
                          // Thumbnail
                          Container(
                            width: 60,
                            height: 60,
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.secondaryDark : AppColors.secondary,
                              borderRadius: BorderRadius.zero,
                            ),
                            child: Center(
                              child: Icon(
                                Icons.menu_book,
                                color: isDark ? AppColors.borderDark : AppColors.inkMuted,
                                size: 24,
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),

                          // Info
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  s.title(lang.languageCode),
                                  style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 15,
                                    color: isDark ? AppColors.inkDark : AppColors.ink,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                if (s.teacherName != null) ...[
                                  const SizedBox(height: 3),
                                  Text(
                                    s.teacherName!,
                                    style: const TextStyle(
                                      color: AppColors.inkMuted,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                                if (s.progressPercent != null) ...[
                                  const SizedBox(height: 8),
                                  // Thin progress bar
                                  ClipRRect(
                                    borderRadius: BorderRadius.zero,
                                    child: LinearProgressIndicator(
                                      value: s.progressPercent! / 100,
                                      backgroundColor: isDark ? AppColors.borderDark : AppColors.border,
                                      valueColor: AlwaysStoppedAnimation(
                                        s.progressPercent! >= 100 ? AppColors.success : AppColors.accent,
                                      ),
                                      minHeight: 3,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    s.progressPercent! >= 100
                                        ? t('مكتمل', 'Complete')
                                        : '${s.progressPercent}% ${t("مكتمل", "complete")}',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: s.progressPercent! >= 100 ? AppColors.success : AppColors.inkMuted,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            );
          },
        ),
      ),
    );
  }
}
