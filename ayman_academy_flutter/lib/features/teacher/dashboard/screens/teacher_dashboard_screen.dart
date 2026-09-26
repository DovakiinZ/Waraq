import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/router/routes.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/providers/theme_provider.dart';
import 'package:ayman_academy_app/shared/widgets/avatar_widget.dart';

// ── Data providers ──
final _teacherStatsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return {};

  final subjects = await supabase.from('subjects').select('id').eq('teacher_id', userId);
  final subjectIds = (subjects as List).map((e) => e['id'] as String).toList();

  int lessonCount = 0;
  int studentCount = 0;
  int pendingOrders = 0;
  double totalRevenue = 0;

  if (subjectIds.isNotEmpty) {
    final lessons = await supabase.from('lessons').select('id').inFilter('subject_id', subjectIds);
    lessonCount = (lessons as List).length;

    try {
      final enrollments = await supabase.from('student_subjects').select('id').inFilter('subject_id', subjectIds);
      studentCount = (enrollments as List).length;
    } catch (_) {}

    try {
      final orders = await supabase.from('orders').select('id, status, total_amount').eq('teacher_id', userId);
      for (final o in (orders as List)) {
        if (o['status'] == 'pending_payment') pendingOrders++;
        if (o['status'] == 'paid') totalRevenue += (o['total_amount'] as num?)?.toDouble() ?? 0;
      }
    } catch (_) {}
  }

  return {
    'subjects': subjectIds.length,
    'lessons': lessonCount,
    'students': studentCount,
    'pending_orders': pendingOrders,
    'revenue': totalRevenue,
  };
});

class TeacherDashboardScreen extends ConsumerWidget {
  const TeacherDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider);
    final statsAsync = ref.watch(_teacherStatsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final profile = auth.profile;
    final firstName = profile?.fullName?.split(' ').first ?? '';

    return Directionality(
      textDirection: lang.languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        body: CustomScrollView(
          slivers: [
            // ── App Bar ──
            SliverAppBar(
              floating: true,
              leading: IconButton(
                icon: const Icon(Icons.menu_rounded),
                onPressed: () => Scaffold.of(context).openDrawer(),
              ),
              actions: [
                IconButton(
                  icon: Icon(
                    ref.watch(themeProvider) == ThemeMode.dark
                        ? Icons.light_mode_outlined
                        : Icons.dark_mode_outlined,
                    size: 22,
                  ),
                  onPressed: () => ref.read(themeProvider.notifier).toggle(),
                ),
                IconButton(
                  icon: const Icon(Icons.language_rounded, size: 22),
                  onPressed: () => ref.read(languageProvider.notifier).toggle(),
                ),
              ],
            ),

            SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ═══════════════════════════════════════
                  //  WELCOME HERO CARD
                  // ═══════════════════════════════════════
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        // The arcade band gradient. `isDark` no longer branches
                        // here: `arc.gradient` already carries the dark stops.
                        gradient: context.arc.gradient,
                        border: Border.all(color: context.arc.line, width: Arc.borderWidth),
                        boxShadow: context.arc.hard(Arc.cardRest),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              AvatarWidget(
                                name: profile?.fullName ?? '?',
                                imageUrl: profile?.avatarUrl,
                                radius: 24,
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '${t("مرحباً", "Welcome back")}, $firstName',
                                      style: TextStyle(
                                        fontSize: 14,
                                        color: context.arc.onInkMuted,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      t('لوحة تحكم المعلم', 'Teacher Dashboard'),
                                      style: TextStyle(
                                        fontSize: 22,
                                        // Caps at 700: the bundled family ships no
                                        // heavier face, and w800 was synthesised.
                                        // Arabic never takes letterSpacing.
                                        fontWeight: FontWeight.w700,
                                        color: context.arc.onInk,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),
                          // Mini stats in hero
                          statsAsync.when(
                            loading: () => const SizedBox(
                              height: 30,
                              child: Center(
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white54),
                              ),
                            ),
                            error: (_, __) => const SizedBox.shrink(),
                            data: (stats) => Row(
                              children: [
                                _HeroStat(
                                  value: '${stats['subjects'] ?? 0}',
                                  label: t('مواد', 'Courses'),
                                ),
                                _heroDivider(),
                                _HeroStat(
                                  value: '${stats['lessons'] ?? 0}',
                                  label: t('دروس', 'Lessons'),
                                ),
                                _heroDivider(),
                                _HeroStat(
                                  value: '${stats['students'] ?? 0}',
                                  label: t('طلاب', 'Students'),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // ═══════════════════════════════════════
                  //  PENDING ORDERS ALERT
                  // ═══════════════════════════════════════
                  statsAsync.when(
                    loading: () => const SizedBox.shrink(),
                    error: (_, __) => const SizedBox.shrink(),
                    data: (stats) {
                      final pending = stats['pending_orders'] ?? 0;
                      if (pending <= 0) return const SizedBox.shrink();
                      return Padding(
                        padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                        child: GestureDetector(
                          onTap: () => context.push(Routes.teacherOrders),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                            decoration: BoxDecoration(
                              color: AppColors.warning.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.zero,
                              border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: AppColors.warning.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.zero,
                                  ),
                                  child: const Icon(Icons.receipt_long_rounded, color: AppColors.warning, size: 20),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        t('طلبات بانتظار التأكيد', 'Orders awaiting confirmation'),
                                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                                      ),
                                      Text(
                                        '$pending ${t("طلب", "order")}${pending > 1 && lang.languageCode == 'en' ? 's' : ''}',
                                        style: const TextStyle(fontSize: 13, color: AppColors.warning),
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.arrow_forward_ios_rounded, size: 16, color: AppColors.warning),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),

                  // ═══════════════════════════════════════
                  //  REVENUE CARD
                  // ═══════════════════════════════════════
                  statsAsync.when(
                    loading: () => const SizedBox.shrink(),
                    error: (_, __) => const SizedBox.shrink(),
                    data: (stats) {
                      final revenue = stats['revenue'] ?? 0.0;
                      return Padding(
                        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.surfaceDark : AppColors.surface,
                            borderRadius: BorderRadius.zero,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color: AppColors.success.withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.zero,
                                    ),
                                    child: const Icon(Icons.trending_up_rounded, color: AppColors.success, size: 22),
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    t('إجمالي الإيرادات', 'Total Revenue'),
                                    style: const TextStyle(fontSize: 14, color: AppColors.inkMuted, fontWeight: FontWeight.w500),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              Text(
                                '${revenue.toStringAsFixed(0)} SYP',
                                style: TextStyle(
                                  fontSize: 32,
                                  fontWeight: FontWeight.w800,
                                  color: isDark ? AppColors.inkDark : AppColors.ink,
                                  letterSpacing: -0.5,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                t('من الطلبات المؤكدة', 'from confirmed orders'),
                                style: const TextStyle(fontSize: 13, color: AppColors.inkMuted),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),

                  // ═══════════════════════════════════════
                  //  QUICK ACTIONS GRID
                  // ═══════════════════════════════════════
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                    child: Text(
                      t('إجراءات سريعة', 'Quick Actions'),
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: 2,
                      childAspectRatio: 1.4,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      children: [
                        _ActionCard(
                          icon: Icons.add_circle_outline_rounded,
                          label: t('مادة جديدة', 'New Course'),
                          subtitle: t('إنشاء مادة', 'Create a course'),
                          color: AppColors.accent,
                          isDark: isDark,
                          onTap: () => context.push('/teacher/course/new'),
                        ),
                        _ActionCard(
                          icon: Icons.receipt_long_rounded,
                          label: t('الطلبات', 'Orders'),
                          subtitle: t('إدارة المبيعات', 'Manage sales'),
                          color: AppColors.info,
                          isDark: isDark,
                          onTap: () => context.push(Routes.teacherOrders),
                        ),
                        _ActionCard(
                          icon: Icons.campaign_rounded,
                          label: t('إعلان', 'Announce'),
                          subtitle: t('أخبر طلابك', 'Notify students'),
                          color: AppColors.warning,
                          isDark: isDark,
                          onTap: () {},
                        ),
                        _ActionCard(
                          icon: Icons.star_rounded,
                          label: t('التقييمات', 'Reviews'),
                          subtitle: t('آراء الطلاب', 'Student feedback'),
                          color: AppColors.starFilled,
                          isDark: isDark,
                          onTap: () => context.push('/teacher/reviews'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // ═══════════════════════════════════════
                  //  SHAMCASH WARNING
                  // ═══════════════════════════════════════
                  if (profile?.shamcashAccountNumber == null || (profile?.shamcashAccountNumber ?? '').isEmpty)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              AppColors.error.withValues(alpha: 0.08),
                              AppColors.error.withValues(alpha: 0.03),
                            ],
                          ),
                          borderRadius: BorderRadius.zero,
                          border: Border.all(color: AppColors.error.withValues(alpha: 0.2)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: AppColors.error.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.zero,
                              ),
                              child: const Icon(Icons.account_balance_wallet_outlined, color: AppColors.error, size: 22),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    t('بيانات الدفع مفقودة', 'Payment info missing'),
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    t('أضف حساب ShamCash لبدء البيع', 'Add ShamCash to start selling'),
                                    style: const TextStyle(fontSize: 13, color: AppColors.inkMuted),
                                  ),
                                ],
                              ),
                            ),
                            TextButton(
                              onPressed: () {},
                              child: Text(
                                t('إعداد', 'Setup'),
                                style: const TextStyle(fontWeight: FontWeight.w700),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                  // ═══════════════════════════════════════
                  //  TIPS SECTION
                  // ═══════════════════════════════════════
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                    child: Text(
                      t('نصائح للمعلمين', 'Teacher Tips'),
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                    ),
                  ),
                  SizedBox(
                    height: 140,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      children: [
                        _TipCard(
                          emoji: '🎯',
                          title: t('أضف صورة غلاف', 'Add cover images'),
                          body: t(
                            'المواد مع صور غلاف جذابة تحصل على 3x مشاهدات',
                            'Courses with cover images get 3x more views',
                          ),
                        ),
                        const SizedBox(width: 12),
                        _TipCard(
                          emoji: '📝',
                          title: t('اكتب وصفاً مفصلاً', 'Write detailed descriptions'),
                          body: t(
                            'وصف المادة الجيد يساعد الطلاب على اتخاذ قرار الشراء',
                            'Good descriptions help students decide to enroll',
                          ),
                        ),
                        const SizedBox(width: 12),
                        _TipCard(
                          emoji: '🎬',
                          title: t('أضف فيديوهات', 'Add video lessons'),
                          body: t(
                            'الدروس المرئية أكثر تفاعلاً وتحقق تقييمات أعلى',
                            'Video lessons boost engagement & ratings',
                          ),
                        ),
                      ],
                    ),
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

  Widget _heroDivider() {
    return Container(
      width: Arc.borderWidth,
      height: 30,
      margin: const EdgeInsets.symmetric(horizontal: 14),
      color: Colors.white.withValues(alpha: 0.28),
    );
  }
}

// ── Hero stat (inside the purple card) ──
class _HeroStat extends StatelessWidget {
  final String value;
  final String label;

  const _HeroStat({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: context.arc.onInk,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: context.arc.onInkMuted,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Quick Action Card ──
class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final Color color;
  final bool isDark;
  final VoidCallback onTap;

  const _ActionCard({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.color,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    return ArcadeCard(
      onTap: onTap,
      padding: const EdgeInsets.all(14),
      shadowOffset: Arc.pressRestSm,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 36,
            height: 36,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: arc.wash,
              border: Border.all(color: arc.line, width: Arc.borderWidth),
            ),
            child: Icon(icon, color: color, size: 19),
          ),
          const SizedBox(height: 10),
          Text(
            label,
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: arc.ink),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            subtitle,
            style: TextStyle(fontSize: 11, color: arc.inkSoft),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

// ── Tip Card (horizontal scroll) ──
class _TipCard extends StatelessWidget {
  final String emoji;
  final String title;
  final String body;

  const _TipCard({
    required this.emoji,
    required this.title,
    required this.body,
  });

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    // Tips are advisory, so the card sits flat on the page rather than lifting
    // off it — on this screen the lifted cards are the ones you can tap.
    return ArcadeCard(
      width: 240,
      flat: true,
      fill: arc.wash,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(emoji, style: const TextStyle(fontSize: 22)),
          const SizedBox(height: 8),
          Text(
            title,
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: arc.ink),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            body,
            style: TextStyle(fontSize: 12, color: arc.inkSoft, height: 1.4),
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
