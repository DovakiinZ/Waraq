import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/models/profile.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/avatar_widget.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';

final _teachersProvider = FutureProvider<List<Profile>>((ref) async {
  final data = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'teacher')
      .eq('is_active', true)
      .order('full_name');
  return (data as List).map((e) => Profile.fromJson(e as Map<String, dynamic>)).toList();
});

class StudentTeachersScreen extends ConsumerWidget {
  const StudentTeachersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final teachersAsync = ref.watch(_teachersProvider);

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(title: Text(t('المعلمون', 'Teachers'))),
        body: teachersAsync.when(
          loading: () => const LoadingShimmer(),
          error: (e, _) => Center(child: Text('$e')),
          data: (teachers) {
            if (teachers.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.people, size: 64, color: AppColors.inkMuted),
                    const SizedBox(height: 16),
                    Text(t('لا يوجد معلمون', 'No teachers'), style: const TextStyle(color: AppColors.inkMuted)),
                  ],
                ),
              );
            }
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(_teachersProvider),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: teachers.length,
                itemBuilder: (context, index) {
                  final teacher = teachers[index];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: Theme.of(context).cardColor,
                      borderRadius: BorderRadius.zero,
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 3))],
                    ),
                    child: InkWell(
                      borderRadius: BorderRadius.zero,
                      onTap: () => _showTeacherProfile(context, teacher, t, lang),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            AvatarWidget(name: teacher.fullName ?? '?', imageUrl: teacher.avatarUrl, radius: 28),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(teacher.fullName ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                                  if (teacher.bio(lang).isNotEmpty) ...[
                                    const SizedBox(height: 4),
                                    Text(teacher.bio(lang), maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, color: AppColors.inkMuted)),
                                  ],
                                  if (teacher.expertiseTagsAr != null && teacher.expertiseTagsAr!.isNotEmpty) ...[
                                    const SizedBox(height: 6),
                                    Wrap(
                                      spacing: 6,
                                      children: teacher.expertiseTagsAr!.take(3).map((tag) => Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: AppColors.primary.withValues(alpha: 0.08),
                                          borderRadius: BorderRadius.zero,
                                        ),
                                        child: Text(tag, style: const TextStyle(fontSize: 10, color: AppColors.primary)),
                                      )).toList(),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            const Icon(Icons.chevron_right, color: AppColors.inkMuted),
                          ],
                        ),
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

  void _showTeacherProfile(BuildContext context, Profile teacher, String Function(String, String) t, String lang) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        minChildSize: 0.4,
        builder: (_, scrollController) => Container(
          padding: const EdgeInsets.all(24),
          child: ListView(
            controller: scrollController,
            children: [
              Center(child: AvatarWidget(name: teacher.fullName ?? '?', imageUrl: teacher.avatarUrl, radius: 48)),
              const SizedBox(height: 16),
              Center(child: Text(teacher.fullName ?? '', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold))),
              const SizedBox(height: 8),
              if (teacher.bio(lang).isNotEmpty)
                Text(teacher.bio(lang), textAlign: TextAlign.center, style: const TextStyle(color: AppColors.inkMuted, height: 1.6)),
              const SizedBox(height: 16),
              if (teacher.expertiseTagsAr != null && teacher.expertiseTagsAr!.isNotEmpty) ...[
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 8,
                  runSpacing: 8,
                  children: teacher.expertiseTagsAr!.map((tag) => Chip(
                    label: Text(tag, style: const TextStyle(fontSize: 12)),
                    backgroundColor: AppColors.primary.withValues(alpha: 0.08),
                  )).toList(),
                ),
                const SizedBox(height: 16),
              ],
              // Message button
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(ctx);
                  // Navigate to chat
                },
                icon: const Icon(Icons.chat),
                label: Text(t('إرسال رسالة', 'Send Message')),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
