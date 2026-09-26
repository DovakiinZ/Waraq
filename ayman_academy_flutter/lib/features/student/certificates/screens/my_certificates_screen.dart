import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';
import 'package:ayman_academy_app/features/student/certificates/providers/certificates_provider.dart';

class MyCertificatesScreen extends ConsumerWidget {
  const MyCertificatesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider);
    final certsAsync = ref.watch(myCertificatesProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Directionality(
      textDirection: lang.languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
        appBar: AppBar(
          backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: Icon(
              Icons.arrow_back_ios_new_rounded,
              size: 20,
              color: isDark ? AppColors.inkDark : AppColors.ink,
            ),
            onPressed: () => Navigator.maybePop(context),
          ),
          title: Text(
            t('شهاداتي', 'My Certificates'),
            style: TextStyle(
              fontFamily: 'IBMPlexSansArabic',
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: isDark ? AppColors.inkDark : AppColors.ink,
            ),
          ),
          centerTitle: true,
        ),
        body: certsAsync.when(
          loading: () => const LoadingShimmer(),
          error: (e, _) => Center(child: Text('$e')),
          data: (certs) {
            if (certs.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.workspace_premium_outlined,
                        size: 72,
                        color: (isDark ? AppColors.inkMuted : AppColors.inkMuted).withValues(alpha: 0.3),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        t('لا توجد شهادات بعد', 'No certificates yet'),
                        style: TextStyle(
                          fontFamily: 'IBMPlexSansArabic',
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                          color: isDark ? AppColors.inkMuted : AppColors.inkMuted,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        t('أكمل المواد للحصول على شهادات', 'Complete subjects to earn certificates'),
                        style: TextStyle(
                          fontFamily: 'IBMPlexSansArabic',
                          fontSize: 14,
                          color: isDark ? AppColors.inkMuted : AppColors.inkMuted,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              );
            }
            return RefreshIndicator(
              color: AppColors.accent,
              onRefresh: () async => ref.invalidate(myCertificatesProvider),
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                itemCount: certs.length,
                separatorBuilder: (_, __) => Divider(
                  height: 0.5,
                  thickness: 0.5,
                  color: isDark ? AppColors.borderDark : AppColors.border,
                  indent: 76,
                ),
                itemBuilder: (context, index) {
                  final c = certs[index];
                  final isIssued = c.status == 'issued';
                  final statusColor = isIssued ? AppColors.accent : AppColors.warning;

                  return InkWell(
                    onTap: () => context.push('/student/certificates/${c.id}'),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      child: Row(
                        children: [
                          // Status icon circle
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: context.arc.wash,
                              border: Border.all(color: statusColor, width: Arc.borderWidth),
                            ),
                            child: Icon(
                              isIssued ? Icons.verified_rounded : Icons.schedule_rounded,
                              color: statusColor,
                              size: 22,
                            ),
                          ),
                          const SizedBox(width: 12),
                          // Content
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  c.courseName,
                                  style: TextStyle(
                                    fontFamily: 'IBMPlexSansArabic',
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? AppColors.inkDark : AppColors.ink,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    // Status badge pill
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: statusColor.withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.zero,
                                      ),
                                      child: Text(
                                        isIssued ? t('صادرة', 'Issued') : t('قيد المراجعة', 'Pending'),
                                        style: TextStyle(
                                          fontFamily: 'IBMPlexSansArabic',
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                          color: statusColor,
                                        ),
                                      ),
                                    ),
                                    if (c.score != null) ...[
                                      const SizedBox(width: 8),
                                      Text(
                                        '${t("الدرجة", "Score")}: ${c.score!.toInt()}%',
                                        style: TextStyle(
                                          fontFamily: 'IBMPlexSansArabic',
                                          fontSize: 12,
                                          color: isDark ? AppColors.inkMuted : AppColors.inkMuted,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ],
                            ),
                          ),
                          Icon(
                            Icons.chevron_right_rounded,
                            size: 20,
                            color: isDark ? AppColors.inkMuted : AppColors.inkMuted,
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
