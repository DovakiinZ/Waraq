import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/xp_progress_bar.dart';
import 'package:ayman_academy_app/features/student/profile/providers/profile_provider.dart';

final _xpHistoryProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return [];
  try {
    final data = await supabase
        .from('student_xp')
        .select('*')
        .eq('student_id', userId)
        .order('created_at', ascending: false)
        .limit(50);
    return List<Map<String, dynamic>>.from(data);
  } catch (_) {
    return [];
  }
});

final _completionStatsProvider = FutureProvider<Map<String, int>>((ref) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return {};
  try {
    final lessons = await supabase
        .from('lesson_progress')
        .select('id')
        .eq('user_id', userId)
        .not('completed_at', 'is', null);
    final quizzes = await supabase
        .from('quiz_attempts')
        .select('id')
        .eq('student_id', userId)
        .eq('passed', true);
    final certs = await supabase
        .from('certificates')
        .select('id')
        .eq('student_id', userId)
        .eq('status', 'issued');
    return {
      'lessons': (lessons as List).length,
      'quizzes': (quizzes as List).length,
      'certificates': (certs as List).length,
    };
  } catch (_) {
    return {};
  }
});

class AchievementsScreen extends ConsumerWidget {
  const AchievementsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final levelAsync = ref.watch(studentLevelProvider);
    final statsAsync = ref.watch(_completionStatsProvider);
    final xpAsync = ref.watch(_xpHistoryProvider);

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(title: Text(t('إنجازاتي', 'My Achievements'))),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // XP Bar
              const XPProgressBar(),
              const SizedBox(height: 24),

              // Stats grid
              statsAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (_, __) => const SizedBox.shrink(),
                data: (stats) => Row(
                  children: [
                    Expanded(child: _StatBadge(
                      icon: Icons.menu_book,
                      value: '${stats['lessons'] ?? 0}',
                      label: t('دروس مكتملة', 'Lessons Done'),
                      color: AppColors.primary,
                    )),
                    const SizedBox(width: 8),
                    Expanded(child: _StatBadge(
                      icon: Icons.quiz,
                      value: '${stats['quizzes'] ?? 0}',
                      label: t('اختبارات ناجحة', 'Quizzes Passed'),
                      color: AppColors.success,
                    )),
                    const SizedBox(width: 8),
                    Expanded(child: _StatBadge(
                      icon: Icons.workspace_premium,
                      value: '${stats['certificates'] ?? 0}',
                      label: t('شهادات', 'Certificates'),
                      color: AppColors.gold,
                    )),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Badges
              Text(t('الشارات', 'Badges'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              levelAsync.when(
                loading: () => const SizedBox.shrink(),
                error: (_, __) => const SizedBox.shrink(),
                data: (level) {
                  if (level == null) return const SizedBox.shrink();
                  final badges = [
                    {'emoji': '🌱', 'name': t('مبتدئ', 'Beginner'), 'xp': 0, 'unlocked': level.totalXp >= 0},
                    {'emoji': '📚', 'name': t('متعلم', 'Learner'), 'xp': 500, 'unlocked': level.totalXp >= 500},
                    {'emoji': '🎓', 'name': t('دارس', 'Scholar'), 'xp': 2000, 'unlocked': level.totalXp >= 2000},
                    {'emoji': '🏆', 'name': t('خبير', 'Expert'), 'xp': 5000, 'unlocked': level.totalXp >= 5000},
                    {'emoji': '🔥', 'name': t('مثابر', 'Dedicated'), 'xp': 0, 'unlocked': level.streakDays >= 7},
                    {'emoji': '⭐', 'name': t('نجم', 'Star'), 'xp': 0, 'unlocked': level.streakDays >= 30},
                  ];
                  return Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: badges.map((b) {
                      final unlocked = b['unlocked'] as bool;
                      return Container(
                        width: (MediaQuery.of(context).size.width - 56) / 3,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: unlocked ? AppColors.gold.withValues(alpha: 0.08) : AppColors.border.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.zero,
                          border: Border.all(color: unlocked ? AppColors.gold.withValues(alpha: 0.3) : AppColors.border),
                        ),
                        child: Column(
                          children: [
                            Text(b['emoji'] as String, style: TextStyle(fontSize: 28, color: unlocked ? null : Colors.grey)),
                            const SizedBox(height: 4),
                            Text(
                              b['name'] as String,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: unlocked ? context.arc.ink : AppColors.inkMuted,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  );
                },
              ),
              const SizedBox(height: 24),

              // XP History
              Text(t('سجل النقاط', 'XP History'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              xpAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (_, __) => Text(t('لا يمكن تحميل السجل', 'Cannot load history')),
                data: (events) {
                  if (events.isEmpty) {
                    return Center(child: Text(t('لا توجد نقاط بعد', 'No XP yet'), style: const TextStyle(color: AppColors.inkMuted)));
                  }
                  return Column(
                    children: events.take(20).map((e) {
                      final eventType = e['event_type'] as String? ?? '';
                      final points = e['points'] as int? ?? 0;
                      return ListTile(
                        dense: true,
                        leading: CircleAvatar(
                          radius: 16,
                          backgroundColor: AppColors.gold.withValues(alpha: 0.1),
                          child: Text('+$points', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.gold)),
                        ),
                        title: Text(_eventLabel(eventType, t), style: const TextStyle(fontSize: 13)),
                        contentPadding: EdgeInsets.zero,
                      );
                    }).toList(),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _eventLabel(String type, String Function(String, String) t) {
    switch (type) {
      case 'lesson_complete': return t('إكمال درس', 'Lesson Complete');
      case 'quiz_pass': return t('نجاح في اختبار', 'Quiz Passed');
      case 'streak_bonus': return t('مكافأة المثابرة', 'Streak Bonus');
      default: return type;
    }
  }
}

class _StatBadge extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color color;

  const _StatBadge({required this.icon, required this.value, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.zero,
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 6),
          Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 10, color: AppColors.inkMuted), textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
