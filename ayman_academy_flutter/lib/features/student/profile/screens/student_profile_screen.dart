import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/features/student/profile/providers/profile_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/providers/theme_provider.dart';
import 'package:ayman_academy_app/shared/widgets/avatar_widget.dart';
import 'package:ayman_academy_app/shared/widgets/xp_progress_bar.dart';

class StudentProfileScreen extends ConsumerStatefulWidget {
  const StudentProfileScreen({super.key});

  @override
  ConsumerState<StudentProfileScreen> createState() => _StudentProfileScreenState();
}

class _StudentProfileScreenState extends ConsumerState<StudentProfileScreen> {
  late TextEditingController _nameController;
  String? _selectedGender;
  bool _saving = false;
  bool _uploading = false;

  @override
  void initState() {
    super.initState();
    final profile = ref.read(authProvider).profile;
    _nameController = TextEditingController(text: profile?.fullName ?? '');
    _selectedGender = profile?.gender;
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    // Both callers fire from a dialog that pops first, so there is no button to
    // disable — guard here instead so a quick double tap can't save twice.
    if (_saving) return;
    setState(() => _saving = true);
    try {
      await ProfileService.updateStudentProfile(
        fullName: _nameController.text.trim(),
        gender: _selectedGender,
      );
      await ref.read(authProvider.notifier).refreshProfile();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ref.read(languageProvider.notifier).t('تم الحفظ', 'Saved')), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'), backgroundColor: AppColors.error));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickAvatar() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery, maxWidth: 512, maxHeight: 512, imageQuality: 80);
    if (image == null) return;
    setState(() => _uploading = true);
    try {
      await ProfileService.uploadAvatar(image.path);
      await ref.read(authProvider.notifier).refreshProfile();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'), backgroundColor: AppColors.error));
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  void _showEditNameDialog() {
    final t = ref.read(languageProvider.notifier).t;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final controller = TextEditingController(text: _nameController.text);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        title: Text(
          t('تعديل الاسم', 'Edit Name'),
          style: TextStyle(
            fontFamily: 'IBMPlexSansArabic',
            fontWeight: FontWeight.w700,
            color: isDark ? AppColors.inkDark : AppColors.ink,
          ),
        ),
        content: TextField(
          controller: controller,
          autofocus: true,
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
              setState(() => _nameController.text = controller.text);
              Navigator.pop(ctx);
              _save();
            },
            child: Text(t('حفظ', 'Save'), style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  void _showGenderPicker() {
    final t = ref.read(languageProvider.notifier).t;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.zero,
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: isDark ? AppColors.borderDark : AppColors.border,
                borderRadius: BorderRadius.zero,
              ),
            ),
            const SizedBox(height: 16),
            _genderOption(ctx, 'male', t('ذكر', 'Male'), isDark),
            Divider(height: 0.5, thickness: 0.5, color: isDark ? AppColors.borderDark : AppColors.border),
            _genderOption(ctx, 'female', t('أنثى', 'Female'), isDark),
            Divider(height: 0.5, thickness: 0.5, color: isDark ? AppColors.borderDark : AppColors.border),
            _genderOption(ctx, 'unspecified', t('غير محدد', 'Unspecified'), isDark),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _genderOption(BuildContext ctx, String value, String label, bool isDark) {
    final isSelected = _selectedGender == value;
    return InkWell(
      onTap: () {
        setState(() => _selectedGender = value);
        Navigator.pop(ctx);
        _save();
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        child: Row(
          children: [
            Text(
              label,
              style: TextStyle(
                fontFamily: 'IBMPlexSansArabic',
                fontSize: 16,
                color: isDark ? AppColors.inkDark : AppColors.ink,
              ),
            ),
            const Spacer(),
            if (isSelected)
              const Icon(Icons.check_rounded, color: AppColors.accent, size: 20),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider);
    final profile = auth.profile;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    String genderLabel(String? g) {
      switch (g) {
        case 'male': return t('ذكر', 'Male');
        case 'female': return t('أنثى', 'Female');
        case 'unspecified': return t('غير محدد', 'Unspecified');
        default: return t('غير محدد', 'Not set');
      }
    }

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
        ),
        body: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          children: [
            const SizedBox(height: 16),

            // ── Avatar + Name + Email ──
            Center(
              child: GestureDetector(
                onTap: _pickAvatar,
                child: Stack(
                  children: [
                    _uploading
                        ? const CircleAvatar(
                            radius: 48,
                            backgroundColor: AppColors.secondary,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accent),
                          )
                        : AvatarWidget(
                            name: profile?.fullName ?? '?',
                            imageUrl: profile?.avatarUrl,
                            radius: 48,
                          ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: AppColors.accentFill,
                          border: Border.all(color: context.arc.line, width: Arc.borderWidth),
                        ),
                        child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 14),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Center(
              child: Text(
                profile?.fullName ?? '',
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
                profile?.email ?? '',
                style: const TextStyle(
                  fontFamily: 'IBMPlexSansArabic',
                  fontSize: 14,
                  color: AppColors.inkMuted,
                ),
              ),
            ),
            const SizedBox(height: 16),

            // ── XP Progress ──
            const XPProgressBar(),
            const SizedBox(height: 24),

            // ── Section 1: Personal Info ──
            _sectionHeader(t('المعلومات الشخصية', 'Personal Info'), isDark),
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
                    value: profile?.fullName ?? '',
                    isDark: isDark,
                    onTap: _showEditNameDialog,
                    showDivider: true,
                  ),
                  _settingsRow(
                    icon: Icons.email_outlined,
                    label: t('البريد الإلكتروني', 'Email'),
                    value: profile?.email ?? '',
                    isDark: isDark,
                    showDivider: true,
                  ),
                  _settingsRow(
                    icon: Icons.person_outline_rounded,
                    label: t('الجنس', 'Gender'),
                    value: genderLabel(_selectedGender),
                    isDark: isDark,
                    onTap: _showGenderPicker,
                    showDivider: true,
                  ),
                  _settingsRow(
                    icon: Icons.school_outlined,
                    label: t('المرحلة', 'Stage'),
                    value: _stageName(profile?.studentStage, t),
                    isDark: isDark,
                    showDivider: false,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // ── Section 2: Settings ──
            _sectionHeader(t('الإعدادات', 'Settings'), isDark),
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

            // ── Section 3: Sign Out ──
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

  Widget _sectionHeader(String title, bool isDark) {
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
                  Icon(
                    Icons.chevron_right_rounded,
                    size: 18,
                    color: isDark ? AppColors.inkMuted : AppColors.inkMuted,
                  ),
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

  String _stageName(String? stage, String Function(String, String) t) {
    switch (stage) {
      case 'kindergarten': return t('رياض الأطفال', 'Kindergarten');
      case 'primary': return t('ابتدائي', 'Primary');
      case 'middle': return t('إعدادي', 'Middle');
      case 'high': return t('ثانوي', 'High School');
      default: return t('غير محدد', 'Not set');
    }
  }
}
