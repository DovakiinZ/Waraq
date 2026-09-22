import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/subject_card.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';
import 'package:ayman_academy_app/features/student/subjects/providers/subjects_provider.dart';

class DiscoverScreen extends ConsumerWidget {
  const DiscoverScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final subjectsAsync = ref.watch(discoverSubjectsProvider);

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
            onPressed: () => context.pop(),
          ),
          title: Text(t('اكتشف', 'Discover')),
        ),
        body: subjectsAsync.when(
          loading: () => const LoadingShimmer(),
          error: (e, _) => Center(child: Text('$e')),
          data: (subjects) {
            if (subjects.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.explore_outlined, size: 56, color: AppColors.inkMuted.withValues(alpha: 0.4)),
                    const SizedBox(height: 16),
                    Text(
                      t('لا توجد مواد متاحة', 'No subjects available'),
                      style: const TextStyle(color: AppColors.inkMuted, fontSize: 16),
                    ),
                  ],
                ),
              );
            }
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(discoverSubjectsProvider),
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                itemCount: subjects.length,
                separatorBuilder: (_, __) => const SizedBox(height: 16),
                itemBuilder: (context, index) {
                  final s = subjects[index];
                  return SubjectCard(
                    subject: s,
                    lang: lang,
                    onTap: () => context.push('/student/subjects/subject/${s.id}'),
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
