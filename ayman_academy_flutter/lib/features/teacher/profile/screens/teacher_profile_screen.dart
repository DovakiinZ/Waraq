import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/providers/theme_provider.dart';

class TeacherProfileScreen extends ConsumerStatefulWidget {
  const TeacherProfileScreen({super.key});

  @override
  ConsumerState<TeacherProfileScreen> createState() => _TeacherProfileScreenState();
}

class _TeacherProfileScreenState extends ConsumerState<TeacherProfileScreen> {
  late TextEditingController _nameController;
  late TextEditingController _bioArController;
  late TextEditingController _shamcashNameController;
  late TextEditingController _shamcashNumberController;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final profile = ref.read(authProvider).profile;
    _nameController = TextEditingController(text: profile?.fullName ?? '');
    _bioArController = TextEditingController(text: profile?.bioAr ?? '');
    _shamcashNameController = TextEditingController(text: profile?.shamcashAccountName ?? '');
    _shamcashNumberController = TextEditingController(text: profile?.shamcashAccountNumber ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _bioArController.dispose();
    _shamcashNameController.dispose();
    _shamcashNumberController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please log in to continue')),
          );
        }
        return;
      }
      await supabase.from('profiles').update({
        'full_name': _nameController.text.trim(),
        'bio_ar': _bioArController.text.trim(),
        'shamcash_account_name': _shamcashNameController.text.trim(),
        'shamcash_account_number': _shamcashNumberController.text.trim(),
      }).eq('id', userId);
      await ref.read(authProvider.notifier).refreshProfile();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ref.read(languageProvider.notifier).t('تم الحفظ', 'Saved')), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showEditField({
    required String title,
    required TextEditingController controller,
    int maxLines = 1,
    TextInputType? keyboardType,
    TextDirection? textDirection,
  }) {
    final t = ref.read(languageProvider.notifier).t;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final editController = TextEditingController(text: controller.text);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        title: Text(
          title,
          style: TextStyle(
            fontFamily: 'IBMPlexSansArabic',
            fontWeight: FontWeight.w700,
            color: isDark ? AppColors.inkDark : AppColors.ink,
          ),
        ),
        content: TextField(
          controller: editController,
          autofocus: true,
          maxLines: maxLines,
          keyboardType: keyboardType,
          textDirection: textDirection,
          style: TextStyle(
            fontFamily: 'IBMPlexSansArabic',
            color: isDark ? AppColors.inkDark : AppColors.ink,
          ),
          decoration: InputDecoration(
            filled: true,
            fillColor: isDark ? AppColors.secondaryDark : AppColors.secondary,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.zero,
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.zero,
              borderSide: const BorderSide(color: AppColors.accent, width: 1),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(t('إلغاء', 'Cancel'), style: const TextStyle(color: AppColors.inkMuted)),
          ),
          TextButton(
            onPressed: () {
              setState(() => controller.text = editController.text);
              Navigator.pop(ctx);
            },
            child: Text(t('تم', 'Done'), style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider);
    final auth = ref.watch(authProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Directionality(
      textDirection: lang.languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        backgroundColor: isDark ? AppColors.backgroundDark : AppColors.secondary,
        appBar: AppBar(
          backgroundColor: isDark ? AppColors.backgroundDark : AppColors.secondary,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          title: Text(
            t('ملفي الشخصي', 'My Profile'),
            style: TextStyle(
              fontFamily: 'IBMPlexSansArabic',
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: isDark ? AppColors.inkDark : AppColors.ink,
            ),
          ),
          centerTitle: true,
          actions: [
            TextButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accent))
                  : Text(
                      t('حفظ', 'Save'),
                      style: const TextStyle(
                        fontFamily: 'IBMPlexSansArabic',
                        color: AppColors.accent,
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                    ),
            ),
          ],
        ),
        body: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          children: [
            const SizedBox(height: 16),

            // ── Avatar with initial ──
            Center(
              child: Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  color: context.arc.wash,
                  border: Border.all(color: context.arc.line, width: Arc.borderWidth),
                ),
                alignment: Alignment.center,
                child: Text(
                  (auth.profile?.fullName ?? '?')[0].toUpperCase(),
                  style: const TextStyle(
                    fontFamily: 'IBMPlexSansArabic',
                    fontSize: 36,
                    fontWeight: FontWeight.w800,
                    color: AppColors.accent,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Center(
              child: Text(
                auth.profile?.fullName ?? '',
                style: TextStyle(
                  fontFamily: 'IBMPlexSansArabic',
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: isDark ? AppColors.inkDark : AppColors.ink,
                ),
              ),
            ),
            const SizedBox(height: 4),
            Center(
              child: Text(
                auth.profile?.email ?? '',
                style: const TextStyle(
                  fontFamily: 'IBMPlexSansArabic',
                  fontSize: 14,
                  color: AppColors.inkMuted,
                ),
              ),
            ),
            const SizedBox(height: 28),

            // ── Section 1: Personal Info ──
            _sectionHeader(t('المعلومات الشخصية', 'Personal Info')),
            const SizedBox(height: 6),
            Container(
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : AppColors.surface,
                borderRadius: BorderRadius.zero,
              ),
              child: Column(
                children: [
                  _settingsRow(
                    icon: Icons.person_outline_rounded,
                    label: t('الاسم', 'Name'),
                    value: _nameController.text,
                    isDark: isDark,
                    onTap: () => _showEditField(
                      title: t('تعديل الاسم', 'Edit Name'),
                      controller: _nameController,
                    ),
                    showDivider: true,
                  ),
                  _settingsRow(
                    icon: Icons.description_outlined,
                    label: t('نبذة عني', 'Bio'),
                    value: _bioArController.text.isEmpty ? t('لم يتم الإضافة', 'Not set') : _bioArController.text,
                    isDark: isDark,
                    onTap: () => _showEditField(
                      title: t('تعديل النبذة', 'Edit Bio'),
                      controller: _bioArController,
                      maxLines: 3,
                    ),
                    showDivider: false,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // ── Section 2: ShamCash ──
            _sectionHeader(t('بيانات ShamCash', 'ShamCash Details')),
            const SizedBox(height: 2),
            Padding(
              padding: const EdgeInsets.only(left: 4, right: 4, bottom: 6),
              child: Text(
                t('مطلوبة لاستقبال مدفوعات الطلاب', 'Required to receive student payments'),
                style: const TextStyle(
                  fontFamily: 'IBMPlexSansArabic',
                  fontSize: 12,
                  color: AppColors.inkMuted,
                ),
              ),
            ),
            Container(
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : AppColors.surface,
                borderRadius: BorderRadius.zero,
              ),
              child: Column(
                children: [
                  _settingsRow(
                    icon: Icons.account_circle_outlined,
                    label: t('اسم الحساب', 'Account Name'),
                    value: _shamcashNameController.text.isEmpty ? t('لم يتم الإضافة', 'Not set') : _shamcashNameController.text,
                    isDark: isDark,
                    onTap: () => _showEditField(
                      title: t('اسم حساب ShamCash', 'ShamCash Account Name'),
                      controller: _shamcashNameController,
                    ),
                    showDivider: true,
                  ),
                  _settingsRow(
                    icon: Icons.numbers_rounded,
                    label: t('رقم الحساب', 'Account Number'),
                    value: _shamcashNumberController.text.isEmpty ? t('لم يتم الإضافة', 'Not set') : _shamcashNumberController.text,
                    isDark: isDark,
                    onTap: () => _showEditField(
                      title: t('رقم حساب ShamCash', 'ShamCash Account Number'),
                      controller: _shamcashNumberController,
                      keyboardType: TextInputType.number,
                      textDirection: TextDirection.ltr,
                    ),
                    showDivider: false,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // ── Section 3: Settings ──
            _sectionHeader(t('الإعدادات', 'Settings')),
            const SizedBox(height: 6),
            Container(
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : AppColors.surface,
                borderRadius: BorderRadius.zero,
              ),
              child: Column(
                children: [
                  // Language toggle
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    child: Row(
                      children: [
                        Icon(Icons.language_rounded, size: 20, color: isDark ? AppColors.inkMuted : AppColors.inkSecondary),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            t('اللغة', 'Language'),
                            style: TextStyle(
                              fontFamily: 'IBMPlexSansArabic',
                              fontSize: 15,
                              color: isDark ? AppColors.inkDark : AppColors.ink,
                            ),
                          ),
                        ),
                        GestureDetector(
                          onTap: () => ref.read(languageProvider.notifier).toggle(),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.secondaryDark : AppColors.secondary,
                              borderRadius: BorderRadius.zero,
                            ),
                            child: Text(
                              lang.languageCode == 'ar' ? 'العربية' : 'English',
                              style: TextStyle(
                                fontFamily: 'IBMPlexSansArabic',
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.accent,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Divider(height: 0.5, thickness: 0.5, indent: 48, color: isDark ? AppColors.borderDark : AppColors.border),
                  // Dark mode toggle
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    child: Row(
                      children: [
                        Icon(Icons.dark_mode_outlined, size: 20, color: isDark ? AppColors.inkMuted : AppColors.inkSecondary),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            t('الوضع الداكن', 'Dark Mode'),
                            style: TextStyle(
                              fontFamily: 'IBMPlexSansArabic',
                              fontSize: 15,
                              color: isDark ? AppColors.inkDark : AppColors.ink,
                            ),
                          ),
                        ),
                        Switch.adaptive(
                          value: ref.watch(themeProvider) == ThemeMode.dark,
                          onChanged: (_) => ref.read(themeProvider.notifier).toggle(),
                          activeColor: AppColors.accent,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // ── Section 4: Sign Out ──
            Container(
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : AppColors.surface,
                borderRadius: BorderRadius.zero,
              ),
              child: InkWell(
                onTap: () => ref.read(authProvider.notifier).signOut(),
                borderRadius: BorderRadius.zero,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  child: Row(
                    children: [
                      const Icon(Icons.logout_rounded, size: 20, color: AppColors.error),
                      const SizedBox(width: 12),
                      Text(
                        t('تسجيل الخروج', 'Sign Out'),
                        style: const TextStyle(
                          fontFamily: 'IBMPlexSansArabic',
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AppColors.error,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _sectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, right: 4),
      child: Text(
        title.toUpperCase(),
        style: TextStyle(
          fontFamily: 'IBMPlexSansArabic',
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: AppColors.inkMuted,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _settingsRow({
    required IconData icon,
    required String label,
    required String value,
    required bool isDark,
    VoidCallback? onTap,
    bool showDivider = true,
  }) {
    return Column(
      children: [
        InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                Icon(icon, size: 20, color: isDark ? AppColors.inkMuted : AppColors.inkSecondary),
                const SizedBox(width: 12),
                Text(
                  label,
                  style: TextStyle(
                    fontFamily: 'IBMPlexSansArabic',
                    fontSize: 15,
                    color: isDark ? AppColors.inkDark : AppColors.ink,
                  ),
                ),
                const Spacer(),
                Flexible(
                  child: Text(
                    value,
                    style: const TextStyle(
                      fontFamily: 'IBMPlexSansArabic',
                      fontSize: 14,
                      color: AppColors.inkMuted,
                    ),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                  ),
                ),
                if (onTap != null) ...[
                  const SizedBox(width: 4),
                  const Icon(Icons.chevron_right_rounded, size: 18, color: AppColors.inkMuted),
                ],
              ],
            ),
          ),
        ),
        if (showDivider)
          Divider(
            height: 0.5,
            thickness: 0.5,
            indent: 48,
            color: isDark ? AppColors.borderDark : AppColors.border,
          ),
      ],
    );
  }
}
