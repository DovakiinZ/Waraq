import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/core/router/routes.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/models/subject.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/avatar_widget.dart';
import 'package:ayman_academy_app/shared/widgets/subject_card.dart';
import 'package:ayman_academy_app/features/student/subjects/providers/subjects_provider.dart';
import 'package:cached_network_image/cached_network_image.dart';

class StudentDashboardScreen extends ConsumerWidget {
  const StudentDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final mySubjects = ref.watch(mySubjectsProvider);
    final discoverSubjects = ref.watch(discoverSubjectsProvider);
    final profile = auth.profile;

    return Directionality(
      textDirection: lang.languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        body: CustomScrollView(
          slivers: [
            // ── App Bar — Clean, iOS-style ──
            SliverAppBar(
              floating: true,
              pinned: false,
              leading: IconButton(
                icon: const Icon(Icons.menu_rounded),
                onPressed: () => Scaffold.of(context).openDrawer(),
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.search_rounded, size: 24),
                  onPressed: () => context.push('/student/discover'),
                ),
                Padding(
                  padding: const EdgeInsets.only(right: 12, left: 12),
                  child: GestureDetector(
                    onTap: () => Scaffold.of(context).openDrawer(),
                    child: AvatarWidget(
                      name: profile?.fullName ?? '?',
                      imageUrl: profile?.avatarUrl,
                      radius: 16,
                    ),
                  ),
                ),
              ],
            ),

            SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Welcome Section ──
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${t("مرحباً", "Welcome")}, ${profile?.fullName?.split(" ").first ?? ""}',
                          style: const TextStyle(
                            fontSize: 15,
                            color: AppColors.inkMuted,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          t('ماذا تريد أن تتعلم اليوم؟', 'What do you want to learn today?'),
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.3,
                            height: 1.3,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // ── Continue Learning ──
                  mySubjects.when(
                    loading: () => const Padding(
                      padding: EdgeInsets.all(40),
                      child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                    ),
                    error: (_, __) => const SizedBox.shrink(),
                    data: (subjects) {
                      final inProgress = subjects
                          .where((s) => s.progressPercent != null && s.progressPercent! > 0 && s.progressPercent! < 100)
                          .toList();
                      if (inProgress.isEmpty) return const SizedBox.shrink();
                      return _SectionWidget(
                        title: t('متابعة التعلم', 'Continue Learning'),
                        child: SizedBox(
                          height: 120,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            itemCount: inProgress.length,
                            separatorBuilder: (_, __) => const SizedBox(width: 12),
                            itemBuilder: (context, i) => _ContinueLearningCard(
                              subject: inProgress[i],
                              lang: lang.languageCode,
                              isDark: isDark,
                              onTap: () => context.push('/student/subjects/subject/${inProgress[i].id}'),
                            ),
                          ),
                        ),
                      );
                    },
                  ),

                  // ── Quick Actions ──
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _QuickActionChip(
                            label: t('المتجر', 'Marketplace'),
                            icon: Icons.store_rounded,
                            onTap: () => context.push(Routes.marketplace),
                          ),
                          _QuickActionChip(
                            label: t('استكشف', 'Discover'),
                            icon: Icons.explore_rounded,
                            onTap: () => context.push('/student/discover'),
                          ),
                          _QuickActionChip(
                            label: t('المعلمون', 'Teachers'),
                            icon: Icons.people_rounded,
                            onTap: () => context.push('/student/teachers'),
                          ),
                          _QuickActionChip(
                            label: t('إنجازاتي', 'Achievements'),
                            icon: Icons.emoji_events_rounded,
                            onTap: () => context.push('/student/achievements'),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // ── Recommended Courses ──
                  discoverSubjects.when(
                    loading: () => const SizedBox.shrink(),
                    error: (_, __) => const SizedBox.shrink(),
                    data: (subjects) {
                      if (subjects.isEmpty) return const SizedBox.shrink();
                      return _SectionWidget(
                        title: t('مواد مقترحة لك', 'Recommended for you'),
                        trailing: TextButton(
                          onPressed: () => context.push('/student/discover'),
                          child: Text(t('عرض الكل', 'See all')),
                        ),
                        child: SizedBox(
                          height: 260,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            itemCount: subjects.take(6).length,
                            separatorBuilder: (_, __) => const SizedBox(width: 12),
                            itemBuilder: (context, i) => SizedBox(
                              width: 180,
                              child: SubjectCard(
                                subject: subjects[i],
                                lang: lang.languageCode,
                                onTap: () => context.push('/student/subjects/subject/${subjects[i].id}'),
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),

                  const SizedBox(height: 32),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Section Header ──
class _SectionWidget extends StatelessWidget {
  final String title;
  final Widget? trailing;
  final Widget child;

  const _SectionWidget({required this.title, this.trailing, required this.child});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 28, 20, 14),
          child: Row(
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.2,
                ),
              ),
              const Spacer(),
              ?trailing,
            ],
          ),
        ),
        child,
      ],
    );
  }
}

// ── Continue Learning Card ──
class _ContinueLearningCard extends StatelessWidget {
  final Subject subject;
  final String lang;
  final bool isDark;
  final VoidCallback onTap;

  const _ContinueLearningCard({
    required this.subject,
    required this.lang,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final progress = subject.progressPercent ?? 0;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 300,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surface,
          borderRadius: BorderRadius.zero,
          border: Border.all(
            color: isDark ? AppColors.borderDark : AppColors.border,
            width: 0.5,
          ),
        ),
        child: Row(
          children: [
            // Thumbnail
            ClipRRect(
              borderRadius: BorderRadius.zero,
              child: Container(
                width: 72,
                height: 72,
                color: AppColors.secondary,
                child: subject.coverImageUrl != null && subject.coverImageUrl!.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: subject.coverImageUrl!,
                        fit: BoxFit.cover,
                        errorWidget: (_, _, _) => const Icon(Icons.play_circle_outline, color: AppColors.inkMuted),
                      )
                    : const Icon(Icons.play_circle_outline, color: AppColors.inkMuted, size: 28),
              ),
            ),
            const SizedBox(width: 14),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    subject.title(lang),
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  if (subject.teacherName != null)
                    Text(
                      subject.teacherName!,
                      style: const TextStyle(fontSize: 12, color: AppColors.inkMuted),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  const SizedBox(height: 10),
                  // Progress bar
                  ClipRRect(
                    borderRadius: BorderRadius.zero,
                    child: LinearProgressIndicator(
                      value: progress / 100,
                      backgroundColor: isDark ? AppColors.borderDark : AppColors.border,
                      valueColor: AlwaysStoppedAnimation(
                        progress >= 80 ? AppColors.success : AppColors.accent,
                      ),
                      minHeight: 4,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$progress% ${lang == "ar" ? "مكتمل" : "complete"}',
                    style: const TextStyle(fontSize: 11, color: AppColors.inkMuted, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Quick Action Chip ──
class _QuickActionChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  const _QuickActionChip({required this.label, required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(right: 8, left: 0),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: isDark ? AppColors.secondaryDark : AppColors.secondary,
            borderRadius: BorderRadius.zero,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 18, color: isDark ? AppColors.inkDark : AppColors.ink),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.inkDark : AppColors.ink,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
