import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/router/routes.dart';
import 'package:ayman_academy_app/features/setup/providers/setup_providers.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/services/setup_progress.dart';

enum SetupRole { teacher, student }

/// The route bar: one segment per step. Done = full accent, current = partial,
/// todo = empty. Fills from the reading start, so it mirrors under RTL.
class SetupRouteBar extends StatelessWidget {
  final SetupProgress progress;

  /// Sitting on the deep-green band, where [Arc.line] would vanish.
  final bool onDark;

  const SetupRouteBar({super.key, required this.progress, this.onDark = false});

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    final border = onDark ? arc.onInkMuted : arc.line;
    final current = progress.nextStep;

    return ExcludeSemantics(
      child: Row(
        children: [
          for (var i = 0; i < progress.steps.length; i++) ...[
            if (i > 0) const SizedBox(width: 6),
            Expanded(
              child: Container(
                height: 10,
                decoration: BoxDecoration(
                  border: Border.all(color: border, width: Arc.borderWidth),
                ),
                child: progress.steps[i].isDone
                    ? Container(color: arc.accent)
                    : identical(progress.steps[i], current)
                        ? FractionallySizedBox(
                            alignment: AlignmentDirectional.centerStart,
                            widthFactor: 0.4,
                            child: Container(color: arc.accent),
                          )
                        : null,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Compact card at the top of a dashboard: «الإعداد: X من M», the next step's
/// title, the segments and one button to the guide.
///
/// Hidden while loading, when complete, and when its query fails — a failed
/// lookup must never show a wrong "not done".
class SetupDashboardCard extends ConsumerWidget {
  final SetupRole role;
  const SetupDashboardCard({super.key, required this.role});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(languageProvider);
    final t = ref.read(languageProvider.notifier).t;
    final arc = context.arc;

    final snapshot = role == SetupRole.teacher
        ? ref.watch(teacherSetupProvider).whenData((d) => d.progress)
        : ref.watch(studentSetupProvider).whenData((d) => d.progress);
    final progress = snapshot.valueOrNull;
    if (snapshot.hasError || progress == null || progress.allComplete) {
      return const SizedBox.shrink();
    }
    final next = progress.nextStep!;
    final copy = setupCopy[next.key]!;

    Future<void> open() async {
      void refresh() {
        if (role == SetupRole.teacher) {
          ref.invalidate(teacherSetupProvider);
        } else {
          ref.invalidate(studentSetupProvider);
        }
      }

      refresh();
      await context.push(role == SetupRole.teacher ? Routes.teacherStart : Routes.studentStart);
      if (context.mounted) refresh();
    }

    return ArcadeCard(
      key: const Key('setup_dashboard_card'),
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            t('الإعداد: ${progress.completedCount} من ${progress.total}',
                'Setup: ${progress.completedCount} of ${progress.total}'),
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: arc.mid),
          ),
          const SizedBox(height: 4),
          Text(
            t(copy.title.$1, copy.title.$2),
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: arc.ink, height: 1.4),
          ),
          const SizedBox(height: 10),
          SetupRouteBar(progress: progress),
          const SizedBox(height: 12),
          ArcadeButton.nav(
            key: const Key('setup_dashboard_continue'),
            onPressed: open,
            variant: ArcadeVariant.solid,
            expand: true,
            label: t('تابع الإعداد', 'Continue setup'),
          ),
        ],
      ),
    );
  }
}
