import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';
import 'package:ayman_academy_app/features/student/subjects/providers/subjects_provider.dart';
import 'package:ayman_academy_app/features/student/marketplace/providers/marketplace_provider.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  final String subjectId;
  const CheckoutScreen({super.key, required this.subjectId});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _accountController = TextEditingController();
  bool _submitting = false;
  bool _done = false;
  Map<String, dynamic>? _teacherPayment;

  @override
  void dispose() {
    _accountController.dispose();
    super.dispose();
  }

  Future<void> _loadTeacherPayment(String teacherId) async {
    if (_teacherPayment != null) return;
    try {
      final data = await supabase
          .from('profiles')
          .select('full_name, shamcash_account_name, shamcash_account_number')
          .eq('id', teacherId)
          .maybeSingle();
      if (data == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(ref.read(languageProvider.notifier).t(
                'لم يتم العثور على بيانات الدفع للمعلم',
                'Teacher payment info not found',
              )),
              backgroundColor: AppColors.error,
            ),
          );
        }
        return;
      }
      if (mounted) setState(() => _teacherPayment = data);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<void> _submitOrder(String teacherId, double amount, String currency) async {
    if (_accountController.text.trim().isEmpty) return;
    final profile = ref.read(authProvider).profile;
    setState(() => _submitting = true);
    try {
      await OrderService.createOrder(
        subjectId: widget.subjectId,
        teacherId: teacherId,
        amount: amount,
        currency: currency,
        studentFullName: profile?.fullName ?? '',
        studentPaymentAccount: _accountController.text.trim(),
      );
      setState(() => _done = true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final subjectAsync = ref.watch(subjectDetailProvider(widget.subjectId));
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        backgroundColor: isDark ? AppColors.backgroundDark : Colors.white,
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
            onPressed: () => Navigator.of(context).pop(),
          ),
          title: Text(
            t('إتمام الشراء', 'Checkout'),
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: isDark ? AppColors.inkDark : AppColors.ink,
            ),
          ),
          backgroundColor: isDark ? AppColors.backgroundDark : Colors.white,
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          foregroundColor: isDark ? AppColors.inkDark : AppColors.ink,
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(0.5),
            child: Container(
              height: 0.5,
              color: isDark ? AppColors.borderDark : AppColors.border,
            ),
          ),
        ),
        body: subjectAsync.when(
          loading: () => const LoadingShimmer(),
          error: (e, _) => Center(child: Text('$e')),
          data: (subject) {
            if (subject == null) {
              return Center(child: Text(t('المادة غير موجودة', 'Subject not found')));
            }

            if (subject.teacherId != null) _loadTeacherPayment(subject.teacherId!);

            // Success state
            if (_done) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: AppColors.accentFill,
                          border: Border.all(color: context.arc.line, width: Arc.borderWidth),
                        ),
                        // On the electric-green fill the tick is `onAccent`.
                        child: const Icon(Icons.check_rounded, size: 40, color: AppColors.onAccent),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        t('تم إرسال الطلب!', 'Order submitted!'),
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: isDark ? AppColors.inkDark : AppColors.ink,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        t('سيقوم المعلم بتأكيد الدفع', 'The teacher will confirm your payment'),
                        style: const TextStyle(color: AppColors.inkMuted, fontSize: 15),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 32),
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton(
                          onPressed: () => Navigator.pop(context),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.accent,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.zero,
                            ),
                          ),
                          child: Text(
                            t('العودة', 'Go Back'),
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }

            return Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Order summary section
                        Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                t('ملخص الطلب', 'Order Summary'),
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                  color: isDark ? AppColors.inkDark : AppColors.ink,
                                ),
                              ),
                              const SizedBox(height: 16),
                              // Course info row
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Thumbnail placeholder
                                  Container(
                                    width: 60,
                                    height: 60,
                                    decoration: BoxDecoration(
                                      color: isDark ? AppColors.secondaryDark : AppColors.secondary,
                                      borderRadius: BorderRadius.zero,
                                    ),
                                    child: Center(
                                      child: Icon(
                                        Icons.menu_book,
                                        color: isDark ? AppColors.borderDark : AppColors.inkMuted,
                                        size: 24,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          subject.title(lang),
                                          style: TextStyle(
                                            fontWeight: FontWeight.w700,
                                            fontSize: 15,
                                            color: isDark ? AppColors.inkDark : AppColors.ink,
                                          ),
                                        ),
                                        if (subject.teacherName != null) ...[
                                          const SizedBox(height: 4),
                                          Text(
                                            subject.teacherName!,
                                            style: const TextStyle(
                                              color: AppColors.inkMuted,
                                              fontSize: 13,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              // Price row
                              Divider(height: 1, thickness: 0.5, color: isDark ? AppColors.borderDark : AppColors.border),
                              const SizedBox(height: 16),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    t('المجموع', 'Total'),
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                      color: isDark ? AppColors.inkDark : AppColors.ink,
                                    ),
                                  ),
                                  Text(
                                    '${subject.priceAmount?.toInt() ?? 0} ${subject.priceCurrency ?? "SYP"}',
                                    style: TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.w800,
                                      color: isDark ? AppColors.inkDark : AppColors.ink,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),

                        // Divider between sections
                        Container(
                          height: 8,
                          color: isDark ? AppColors.secondaryDark : AppColors.secondary,
                        ),

                        // Payment instructions section
                        Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                t('تعليمات الدفع عبر ShamCash', 'ShamCash Payment Instructions'),
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                  color: isDark ? AppColors.inkDark : AppColors.ink,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                t('حول المبلغ إلى الحساب التالي:', 'Transfer the amount to this account:'),
                                style: const TextStyle(color: AppColors.inkMuted, fontSize: 14),
                              ),
                              const SizedBox(height: 16),

                              if (_teacherPayment != null) ...[
                                // Payment details card with thin border
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.zero,
                                    border: Border.all(
                                      color: isDark ? AppColors.borderDark : AppColors.border,
                                      width: 0.5,
                                    ),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      // Account name
                                      Text(
                                        t('اسم الحساب', 'Account Name'),
                                        style: const TextStyle(fontSize: 12, color: AppColors.inkMuted),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        _teacherPayment!['shamcash_account_name'] as String? ?? '-',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w700,
                                          color: isDark ? AppColors.inkDark : AppColors.ink,
                                        ),
                                      ),
                                      const SizedBox(height: 16),
                                      Divider(height: 1, thickness: 0.5, color: isDark ? AppColors.borderDark : AppColors.border),
                                      const SizedBox(height: 16),
                                      // Account number
                                      Text(
                                        t('رقم الحساب', 'Account Number'),
                                        style: const TextStyle(fontSize: 12, color: AppColors.inkMuted),
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              _teacherPayment!['shamcash_account_number'] as String? ?? '-',
                                              style: TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.w700,
                                                color: isDark ? AppColors.inkDark : AppColors.ink,
                                              ),
                                            ),
                                          ),
                                          GestureDetector(
                                            onTap: () {
                                              Clipboard.setData(ClipboardData(
                                                text: _teacherPayment!['shamcash_account_number'] as String? ?? '',
                                              ));
                                              ScaffoldMessenger.of(context).showSnackBar(
                                                SnackBar(
                                                  content: Text(t('تم النسخ', 'Copied')),
                                                  duration: const Duration(seconds: 1),
                                                ),
                                              );
                                            },
                                            child: Container(
                                              padding: const EdgeInsets.all(8),
                                              decoration: BoxDecoration(
                                                color: isDark ? AppColors.secondaryDark : AppColors.secondary,
                                                borderRadius: BorderRadius.zero,
                                              ),
                                              child: Icon(
                                                Icons.copy,
                                                size: 16,
                                                color: isDark ? AppColors.inkSecondaryDark : AppColors.inkSecondary,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ] else
                                const Center(
                                  child: Padding(
                                    padding: EdgeInsets.symmetric(vertical: 20),
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: AppColors.accent,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),

                        // Divider
                        Container(
                          height: 8,
                          color: isDark ? AppColors.secondaryDark : AppColors.secondary,
                        ),

                        // Student account input
                        Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                t('رقم حسابك في ShamCash', 'Your ShamCash Account Number'),
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? AppColors.inkDark : AppColors.ink,
                                ),
                              ),
                              const SizedBox(height: 12),
                              TextField(
                                controller: _accountController,
                                keyboardType: TextInputType.number,
                                textDirection: TextDirection.ltr,
                                decoration: InputDecoration(
                                  hintText: t('أدخل رقم حسابك', 'Enter your account number'),
                                  hintStyle: const TextStyle(color: AppColors.inkMuted),
                                  filled: true,
                                  fillColor: isDark ? AppColors.secondaryDark : AppColors.secondary,
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.zero,
                                    borderSide: BorderSide.none,
                                  ),
                                  focusedBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.zero,
                                    borderSide: const BorderSide(color: AppColors.accent, width: 1.5),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // Sticky bottom CTA
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : Colors.white,
                    border: Border(
                      top: BorderSide(
                        color: isDark ? AppColors.borderDark : AppColors.border,
                        width: 0.5,
                      ),
                    ),
                  ),
                  child: SafeArea(
                    top: false,
                    child: SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: (_submitting || _teacherPayment == null)
                            ? null
                            : () => _submitOrder(
                                subject.teacherId!,
                                subject.priceAmount ?? 0,
                                subject.priceCurrency ?? 'SYP',
                              ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.accent,
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: AppColors.accent.withValues(alpha: 0.4),
                          disabledForegroundColor: Colors.white70,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.zero,
                          ),
                        ),
                        child: _submitting
                            ? const SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : Text(
                                t('تأكيد الطلب', 'Confirm Order'),
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                              ),
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
