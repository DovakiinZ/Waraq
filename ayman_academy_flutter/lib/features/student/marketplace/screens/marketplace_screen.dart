import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/brand/arcade.dart';
import 'package:ayman_academy_app/brand/widgets/arcade_surfaces.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/student_stages.dart';
import 'package:ayman_academy_app/shared/widgets/subject_card.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/features/student/marketplace/providers/marketplace_provider.dart';

// `package:collection`'s `firstOrNull` is not a direct dependency of this
// app, so this is a plain null-safe lookup rather than adding one for a
// single call.
StageOption? _stageByKey(String? key) {
  if (key == null) return null;
  for (final s in kStages) {
    if (s.key == key) return s;
  }
  return null;
}

class MarketplaceScreen extends ConsumerStatefulWidget {
  const MarketplaceScreen({super.key});

  @override
  ConsumerState<MarketplaceScreen> createState() => _MarketplaceScreenState();
}

class _MarketplaceScreenState extends ConsumerState<MarketplaceScreen> {
  static const _stripKey = 'waraq-seen-stage-strip';

  // Per-device, same as the web. A box that is somehow not open must not take
  // the screen down with it, so both accesses are guarded.
  bool _showStrip = () {
    try {
      return Hive.box('settings').get(_stripKey) != true;
    } catch (_) {
      return false;
    }
  }();

  void _dismissStrip() {
    setState(() => _showStrip = false);
    try {
      Hive.box('settings').put(_stripKey, true);
    } catch (_) {/* nothing to persist to: just stay hidden for this run */}
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final subjectsAsync = ref.watch(marketplaceSubjectsProvider);
    final arc = context.arc;

    final stageKey = ref.watch(authProvider).profile?.studentStage;
    final stage = _stageByKey(stageKey);

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
            onPressed: () => context.pop(),
          ),
          title: Text(t('المتجر', 'Marketplace')),
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
                    Icon(Icons.store_outlined, size: 56, color: AppColors.inkMuted.withValues(alpha: 0.4)),
                    const SizedBox(height: 16),
                    Text(
                      t('لا توجد مواد مدفوعة حالياً', 'No paid courses available'),
                      style: const TextStyle(color: AppColors.inkMuted, fontSize: 16),
                    ),
                  ],
                ),
              );
            }
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(marketplaceSubjectsProvider),
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                itemCount: subjects.length + (_showStrip && stage != null ? 1 : 0),
                separatorBuilder: (_, __) => const SizedBox(height: 16),
                itemBuilder: (context, index) {
                  if (_showStrip && stage != null) {
                    if (index == 0) {
                      final s = stage;
                      return ArcadeCard(
                        fill: arc.wash,
                        flat: true,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        child: Row(
                          children: [
                            ArcadeChip(label: t('جديد', 'New'), filled: true),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                t('مواد ${s.ar}', '${s.en} subjects'),
                                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: arc.ink),
                              ),
                            ),
                            IconButton(
                              key: const Key('marketplace_dismiss_strip'),
                              icon: Icon(Icons.close_rounded, size: 18, color: arc.inkSoft),
                              tooltip: t('إغلاق', 'Dismiss'),
                              onPressed: _dismissStrip,
                            ),
                          ],
                        ),
                      );
                    }
                    index -= 1;
                  }
                  final s = subjects[index];
                  return SubjectCard(
                    subject: s,
                    lang: lang,
                    onTap: () => context.push('/student/marketplace/checkout/${s.id}'),
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
