import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/core/utils/date_formatter.dart';
import 'package:ayman_academy_app/shared/models/announcement.dart';
import 'package:ayman_academy_app/shared/models/subject.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';

final _announcementsProvider = FutureProvider<List<Announcement>>((ref) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return [];
  final data = await supabase
      .from('announcements')
      .select('*')
      .eq('teacher_id', userId)
      .order('created_at', ascending: false);
  return (data as List).map((e) => Announcement.fromJson(e as Map<String, dynamic>)).toList();
});

final _teacherSubjectsForAnnouncementProvider = FutureProvider<List<Subject>>((ref) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return [];
  final data = await supabase
      .from('subjects')
      .select('id, title_ar, title_en')
      .eq('teacher_id', userId)
      .eq('is_active', true)
      .order('sort_order');
  return (data as List).map((e) => Subject.fromJson(e as Map<String, dynamic>)).toList();
});

class TeacherAnnouncementsScreen extends ConsumerWidget {
  const TeacherAnnouncementsScreen({super.key});

  void _showCreateDialog(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.read(languageProvider).languageCode;
    final titleController = TextEditingController();
    final bodyController = TextEditingController();
    final titleEnController = TextEditingController();
    final bodyEnController = TextEditingController();
    String? selectedSubjectId;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: StatefulBuilder(
          builder: (ctx, setSheetState) => Container(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(t('إعلان جديد', 'New Announcement'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),

                // Subject picker
                Consumer(
                  builder: (_, ref, _) {
                    final subjectsAsync = ref.watch(_teacherSubjectsForAnnouncementProvider);
                    return subjectsAsync.when(
                      loading: () => const LinearProgressIndicator(),
                      error: (_, _) => const SizedBox.shrink(),
                      data: (subjects) => DropdownButtonFormField<String>(
                        value: selectedSubjectId,
                        decoration: InputDecoration(labelText: t('المادة (اختياري)', 'Subject (optional)')),
                        items: [
                          DropdownMenuItem(value: null, child: Text(t('عام - لجميع الطلاب', 'General - All students'))),
                          ...subjects.map((s) => DropdownMenuItem(value: s.id, child: Text(s.title(lang)))),
                        ],
                        onChanged: (v) => setSheetState(() => selectedSubjectId = v),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 12),

                TextField(
                  controller: titleController,
                  textDirection: TextDirection.rtl,
                  decoration: InputDecoration(labelText: t('العنوان بالعربية', 'Arabic title')),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: bodyController,
                  maxLines: 3,
                  textDirection: TextDirection.rtl,
                  decoration: InputDecoration(labelText: t('المحتوى بالعربية', 'Arabic content')),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: titleEnController,
                  textDirection: TextDirection.ltr,
                  decoration: InputDecoration(
                    labelText: t('العنوان بالإنجليزية (اختياري)', 'English title (optional)'),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: bodyEnController,
                  maxLines: 3,
                  textDirection: TextDirection.ltr,
                  decoration: InputDecoration(
                    labelText: t('المحتوى بالإنجليزية (اختياري)', 'English content (optional)'),
                  ),
                ),
                const SizedBox(height: 16),

                ElevatedButton(
                  onPressed: () async {
                    if (titleController.text.trim().isEmpty) return;
                    final userId = supabase.auth.currentUser?.id;
                    if (userId == null) {
                      if (ctx.mounted) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          const SnackBar(content: Text('Please log in to continue')),
                        );
                      }
                      return;
                    }
                    try {
                      await supabase.from('announcements').insert({
                        'teacher_id': userId,
                        'subject_id': selectedSubjectId,
                        'title_ar': titleController.text.trim(),
                        'title_en': titleEnController.text.trim().isNotEmpty ? titleEnController.text.trim() : null,
                        'body_ar': bodyController.text.trim().isNotEmpty ? bodyController.text.trim() : null,
                        'body_en': bodyEnController.text.trim().isNotEmpty ? bodyEnController.text.trim() : null,
                        'is_active': true,
                      });
                      ref.invalidate(_announcementsProvider);
                      if (ctx.mounted) Navigator.pop(ctx);
                    } catch (e) {
                      if (ctx.mounted) {
                        ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('$e'), backgroundColor: AppColors.error));
                      }
                    }
                  },
                  child: Text(t('نشر الإعلان', 'Publish')),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final announcementsAsync = ref.watch(_announcementsProvider);

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(title: Text(t('الإعلانات', 'Announcements'))),
        floatingActionButton: FloatingActionButton(
          onPressed: () => _showCreateDialog(context, ref),
          child: const Icon(Icons.add),
        ),
        body: announcementsAsync.when(
          loading: () => const LoadingShimmer(),
          error: (e, _) => Center(child: Text('$e')),
          data: (items) {
            if (items.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.campaign, size: 64, color: AppColors.inkMuted),
                    const SizedBox(height: 16),
                    Text(t('لا توجد إعلانات', 'No announcements'), style: const TextStyle(color: AppColors.inkMuted, fontSize: 16)),
                    const SizedBox(height: 8),
                    Text(t('اضغط + لإنشاء إعلان جديد', 'Tap + to create an announcement'), style: const TextStyle(color: AppColors.inkMuted, fontSize: 13)),
                  ],
                ),
              );
            }
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(_announcementsProvider),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: items.length,
                itemBuilder: (context, index) {
                  final a = items[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.campaign, color: AppColors.primary, size: 20),
                              const SizedBox(width: 8),
                              Expanded(child: Text(a.title(lang), style: const TextStyle(fontWeight: FontWeight.w600))),
                              IconButton(
                                icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.error),
                                onPressed: () async {
                                  await supabase.from('announcements').delete().eq('id', a.id);
                                  ref.invalidate(_announcementsProvider);
                                },
                              ),
                            ],
                          ),
                          if (a.body(lang) != null && a.body(lang)!.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text(a.body(lang)!, style: const TextStyle(fontSize: 14, height: 1.5, color: AppColors.inkMuted)),
                          ],
                          const SizedBox(height: 8),
                          Text(timeAgo(a.createdAt, arabic: lang == 'ar'), style: const TextStyle(fontSize: 11, color: AppColors.inkMuted)),
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
