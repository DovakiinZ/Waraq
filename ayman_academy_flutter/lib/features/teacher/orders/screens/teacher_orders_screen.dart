import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/models/order.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';

final _teacherOrdersProvider = FutureProvider<List<Order>>((ref) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return [];
  final data = await supabase
      .from('orders')
      .select('*, student:profiles!student_id(full_name, email), subject:subjects(title_ar, title_en)')
      .eq('teacher_id', userId)
      .order('created_at', ascending: false);
  return (data as List).map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
});

class TeacherOrdersScreen extends ConsumerWidget {
  const TeacherOrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final ordersAsync = ref.watch(_teacherOrdersProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
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
            t('الطلبات', 'Orders'),
            style: TextStyle(
              fontFamily: 'IBMPlexSansArabic',
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: isDark ? AppColors.inkDark : AppColors.ink,
            ),
          ),
          centerTitle: true,
        ),
        body: ordersAsync.when(
          loading: () => const LoadingShimmer(),
          error: (e, _) => Center(child: Text('$e')),
          data: (orders) {
            if (orders.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.receipt_long_outlined,
                        size: 72,
                        color: AppColors.inkMuted.withValues(alpha: 0.3),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        t('لا توجد طلبات', 'No orders yet'),
                        style: const TextStyle(
                          fontFamily: 'IBMPlexSansArabic',
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                          color: AppColors.inkMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }
            return RefreshIndicator(
              color: AppColors.accent,
              onRefresh: () async => ref.invalidate(_teacherOrdersProvider),
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                itemCount: orders.length,
                separatorBuilder: (_, __) => Divider(
                  height: 0.5,
                  thickness: 0.5,
                  color: isDark ? AppColors.borderDark : AppColors.border,
                ),
                itemBuilder: (context, index) {
                  final o = orders[index];
                  return _OrderRow(order: o, t: t, lang: lang, ref: ref, isDark: isDark);
                },
              ),
            );
          },
        ),
      ),
    );
  }
}

class _OrderRow extends StatelessWidget {
  final Order order;
  final String Function(String, String) t;
  final String lang;
  final WidgetRef ref;
  final bool isDark;

  const _OrderRow({required this.order, required this.t, required this.lang, required this.ref, required this.isDark});

  Color _statusColor(String status) {
    switch (status) {
      case 'paid': return AppColors.success;
      case 'rejected': return AppColors.error;
      case 'cancelled': return AppColors.inkMuted;
      default: return AppColors.warning;
    }
  }

  String _statusLabel(String status, String Function(String, String) t) {
    switch (status) {
      case 'pending_payment': return t('بانتظار الدفع', 'Pending Payment');
      case 'paid': return t('مدفوع', 'Paid');
      case 'rejected': return t('مرفوض', 'Rejected');
      case 'cancelled': return t('ملغي', 'Cancelled');
      default: return status;
    }
  }

  Future<void> _confirmPayment(BuildContext context) async {
    try {
      await supabase.from('orders').update({
        'status': 'paid',
        'paid_at': DateTime.now().toIso8601String(),
      }).eq('id', order.id);
      ref.invalidate(_teacherOrdersProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(t('تم تأكيد الدفع', 'Payment confirmed')), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<void> _rejectOrder(BuildContext context) async {
    try {
      await supabase.from('orders').update({
        'status': 'rejected',
        'teacher_notes': 'Rejected by teacher',
      }).eq('id', order.id);
      ref.invalidate(_teacherOrdersProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(t('تم رفض الطلب', 'Order rejected')), backgroundColor: AppColors.error),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final sColor = _statusColor(order.status);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top row: student name + amount
          Row(
            children: [
              Expanded(
                child: Text(
                  order.studentFullName,
                  style: TextStyle(
                    fontFamily: 'IBMPlexSansArabic',
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: isDark ? AppColors.inkDark : AppColors.ink,
                  ),
                ),
              ),
              Text(
                '${order.amount.toInt()} ${order.currency}',
                style: TextStyle(
                  fontFamily: 'IBMPlexSansArabic',
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: isDark ? AppColors.inkDark : AppColors.ink,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),

          // ShamCash info
          Text(
            '${t("حساب ShamCash", "ShamCash Account")}: ${order.studentPaymentAccount}',
            style: const TextStyle(
              fontFamily: 'IBMPlexSansArabic',
              fontSize: 13,
              color: AppColors.inkMuted,
            ),
          ),
          const SizedBox(height: 8),

          // Status badge pill
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: sColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.zero,
                ),
                child: Text(
                  _statusLabel(order.status, t),
                  style: TextStyle(
                    fontFamily: 'IBMPlexSansArabic',
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: sColor,
                  ),
                ),
              ),
            ],
          ),

          // Actions for pending orders
          if (order.status == 'pending_payment') ...[
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 40,
                    child: ElevatedButton(
                      onPressed: () => _confirmPayment(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.accent,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.zero,
                        ),
                        elevation: 0,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.check_rounded, size: 16),
                          const SizedBox(width: 6),
                          Text(
                            t('تأكيد الدفع', 'Confirm'),
                            style: const TextStyle(
                              fontFamily: 'IBMPlexSansArabic',
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: SizedBox(
                    height: 40,
                    child: OutlinedButton(
                      onPressed: () => _rejectOrder(context),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppColors.error, width: 1),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.zero,
                        ),
                        elevation: 0,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.close_rounded, size: 16, color: AppColors.error),
                          const SizedBox(width: 6),
                          Text(
                            t('رفض', 'Reject'),
                            style: const TextStyle(
                              fontFamily: 'IBMPlexSansArabic',
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                              color: AppColors.error,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
