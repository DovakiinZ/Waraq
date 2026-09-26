import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';

final _teacherRatingsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return [];

  // Get all subjects by this teacher
  final subjects = await supabase.from('subjects').select('id, title_ar').eq('teacher_id', userId);
  final subjectIds = (subjects as List).map((s) => s['id'] as String).toList();
  if (subjectIds.isEmpty) return [];

  // Get all ratings for those subjects and their lessons
  final data = await supabase
      .from('ratings')
      .select('*, user:profiles!user_id(full_name, avatar_url)')
      .inFilter('entity_id', subjectIds)
      .order('created_at', ascending: false);

  // Also get lesson ratings
  final lessons = await supabase.from('lessons').select('id').inFilter('subject_id', subjectIds);
  final lessonIds = (lessons as List).map((l) => l['id'] as String).toList();

  List<Map<String, dynamic>> allRatings = List<Map<String, dynamic>>.from(data);

  if (lessonIds.isNotEmpty) {
    final lessonRatings = await supabase
        .from('ratings')
        .select('*, user:profiles!user_id(full_name, avatar_url)')
        .inFilter('entity_id', lessonIds)
        .order('created_at', ascending: false);
    allRatings.addAll(List<Map<String, dynamic>>.from(lessonRatings));
  }

  allRatings.sort((a, b) => (b['created_at'] as String).compareTo(a['created_at'] as String));
  return allRatings;
});

class TeacherReviewsScreen extends ConsumerWidget {
  const TeacherReviewsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final ratingsAsync = ref.watch(_teacherRatingsProvider);

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(title: Text(t('التقييمات والآراء', 'Ratings & Reviews'))),
        body: ratingsAsync.when(
          loading: () => const LoadingShimmer(),
          error: (e, _) => Center(child: Text('$e')),
          data: (ratings) {
            if (ratings.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.star_border, size: 64, color: AppColors.inkMuted),
                    const SizedBox(height: 16),
                    Text(t('لا توجد تقييمات بعد', 'No ratings yet'), style: const TextStyle(color: AppColors.inkMuted)),
                  ],
                ),
              );
            }

            // Average
            final totalStars = ratings.fold<int>(0, (sum, r) => sum + (r['stars'] as int? ?? 0));
            final avgRating = ratings.isNotEmpty ? totalStars / ratings.length : 0.0;

            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(_teacherRatingsProvider),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Average rating card
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(colors: [AppColors.gold.withValues(alpha: 0.1), AppColors.gold.withValues(alpha: 0.04)]),
                      borderRadius: BorderRadius.zero,
                      border: Border.all(color: AppColors.gold.withValues(alpha: 0.2)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(avgRating.toStringAsFixed(1), style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: AppColors.gold)),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: List.generate(5, (i) => Icon(
                                i < avgRating.round() ? Icons.star : Icons.star_border,
                                color: AppColors.gold,
                                size: 20,
                              )),
                            ),
                            const SizedBox(height: 4),
                            Text('${ratings.length} ${t("تقييم", "ratings")}', style: const TextStyle(color: AppColors.inkMuted, fontSize: 12)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Individual reviews
                  ...ratings.map((r) {
                    final user = r['user'] as Map<String, dynamic>?;
                    final stars = r['stars'] as int? ?? 0;
                    final comment = r['comment'] as String?;
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(user?['full_name'] as String? ?? '?', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                const Spacer(),
                                ...List.generate(5, (i) => Icon(
                                  i < stars ? Icons.star : Icons.star_border,
                                  size: 14,
                                  color: AppColors.gold,
                                )),
                              ],
                            ),
                            if (comment != null && comment.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(comment, style: const TextStyle(fontSize: 13, color: AppColors.inkMuted)),
                            ],
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
