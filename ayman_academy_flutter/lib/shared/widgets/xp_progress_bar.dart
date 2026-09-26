import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/features/student/profile/providers/profile_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';

/// The student's level and XP, framed the way the arcade frames progress: as a
/// numbered level with a bordered bar, not as a soft amber gradient badge.
///
/// This was the most off-brand widget in the app — four orange gradients and
/// six hard-coded hex values. Everything here now comes from `context.arc`.
class XPProgressBar extends ConsumerWidget {
  final bool compact;
  const XPProgressBar({super.key, this.compact = false});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final levelAsync = ref.watch(studentLevelProvider);
    final lang = ref.watch(languageProvider).languageCode;
    final t = ref.read(languageProvider.notifier).t;
    final arc = context.arc;

    return levelAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
      data: (level) {
        if (level == null) return const SizedBox.shrink();

        final levelLabel = '${t('مستوى', 'LEVEL')} '
            '${level.levelNumber.toString().padLeft(2, '0')}';

        if (compact) {
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: arc.wash,
              border: Border.all(color: arc.line, width: Arc.borderWidth),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(level.icon, style: const TextStyle(fontSize: 15)),
                const SizedBox(width: 6),
                Text(
                  level.name(lang),
                  style: TextStyle(fontWeight: FontWeight.w700, color: arc.ink, fontSize: 12),
                ),
                const SizedBox(width: 6),
                Text(
                  '${level.totalXp} XP',
                  style: TextStyle(color: arc.inkSoft, fontSize: 11, fontWeight: FontWeight.w700),
                ),
              ],
            ),
          );
        }

        return ArcadeCard(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: arc.wash,
                      border: Border.all(color: arc.line, width: Arc.borderWidth),
                    ),
                    child: Text(level.icon, style: const TextStyle(fontSize: 22)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ArcadeChip(label: levelLabel),
                        const SizedBox(height: 5),
                        Text(
                          level.name(lang),
                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: arc.ink),
                        ),
                      ],
                    ),
                  ),
                  if (level.streakDays > 0)
                    ArcadeChip(
                      label: t('${level.streakDays} يوم', '${level.streakDays}d'),
                      icon: Icons.local_fire_department_rounded,
                      filled: true,
                    ),
                ],
              ),
              const SizedBox(height: 14),

              // Bordered track, square fill. Same shape as the course progress
              // bar so "how far along am I" always looks the same.
              Container(
                height: 14,
                decoration: BoxDecoration(
                  color: arc.wash,
                  border: Border.all(color: arc.line, width: Arc.borderWidth),
                ),
                child: FractionallySizedBox(
                  alignment: AlignmentDirectional.centerStart,
                  widthFactor: level.xpToNextLevel > 0 ? level.progressToNext.clamp(0.0, 1.0) : 1.0,
                  child: Container(color: arc.accent),
                ),
              ),
              const SizedBox(height: 8),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${level.totalXp} XP',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: arc.ink),
                  ),
                  Flexible(
                    child: Text(
                      level.xpToNextLevel > 0
                          ? t('باقي ${level.xpToNextLevel} نقطة للمستوى التالي',
                              '${level.xpToNextLevel} XP to next level')
                          : t('وصلت لأعلى مستوى!', 'Max level reached!'),
                      textAlign: TextAlign.end,
                      style: TextStyle(fontSize: 12, color: arc.inkSoft, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
