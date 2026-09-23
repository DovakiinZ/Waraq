import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/core/router/routes.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  bool _obscurePassword = true;
  String? _error;
  late AnimationController _animController;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));
    _fadeAnim = CurvedAnimation(parent: _animController, curve: Curves.easeOut);
    _slideAnim = Tween<Offset>(begin: const Offset(0, 0.08), end: Offset.zero)
        .animate(CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic));
    _animController.forward();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _animController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(authProvider.notifier).signIn(
        _emailController.text.trim(),
        _passwordController.text,
      );
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('AuthException(message: ', '').replaceAll(')', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final screenHeight = MediaQuery.of(context).size.height;

    return Directionality(
      textDirection: lang.languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        body: SingleChildScrollView(
          child: Column(
            children: [
              // ═══════════════════════════════════════
              //  BRAND HEADER — Colored, bold, memorable
              // ═══════════════════════════════════════
              Container(
                width: double.infinity,
                padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top + 20, bottom: 40),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: isDark
                        ? [const Color(0xFF2D1B69), const Color(0xFF1A1A2E)]
                        : [AppColors.accent, const Color(0xFF7C4DFF)],
                  ),
                ),
                child: Column(
                  children: [
                    // Language toggle — top right
                    Align(
                      alignment: AlignmentDirectional.centerEnd,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: GestureDetector(
                          onTap: () => ref.read(languageProvider.notifier).toggle(),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.language_rounded, size: 16, color: Colors.white),
                                const SizedBox(width: 6),
                                Text(
                                  lang.languageCode == 'ar' ? 'EN' : 'عربي',
                                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                    SizedBox(height: screenHeight * 0.03),

                    // Logo
                    Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.15),
                            blurRadius: 30,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Text(
                          'A',
                          style: TextStyle(
                            fontSize: 36,
                            fontWeight: FontWeight.w900,
                            color: AppColors.accent,
                            height: 1,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Brand name
                    Text(
                      t('ورق أكاديمي', 'Waraq Academy'),
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      t('تعلّم بلا حدود', 'Learn without limits'),
                      style: TextStyle(
                        fontSize: 16,
                        color: Colors.white.withValues(alpha: 0.85),
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ],
                ),
              ),

              // ═══════════════════════════════════════
              //  FORM SECTION
              // ═══════════════════════════════════════
              FadeTransition(
                opacity: _fadeAnim,
                child: SlideTransition(
                  position: _slideAnim,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Title
                          Text(
                            t('تسجيل الدخول', 'Sign In'),
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.3,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            t('أدخل بياناتك للمتابعة', 'Enter your credentials to continue'),
                            style: const TextStyle(fontSize: 15, color: AppColors.inkMuted),
                          ),
                          const SizedBox(height: 28),

                          // Error
                          if (_error != null) ...[
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: AppColors.error.withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 20),
                                  const SizedBox(width: 10),
                                  Expanded(child: Text(_error!, style: const TextStyle(color: AppColors.error, fontSize: 14))),
                                ],
                              ),
                            ),
                            const SizedBox(height: 20),
                          ],

                          // Email
                          Text(
                            t('البريد الإلكتروني', 'Email'),
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                            textDirection: TextDirection.ltr,
                            style: const TextStyle(fontSize: 16),
                            decoration: InputDecoration(
                              hintText: 'example@email.com',
                              prefixIcon: Icon(Icons.mail_outline_rounded, size: 20, color: AppColors.inkMuted),
                            ),
                            validator: (v) {
                              if (v == null || v.isEmpty) return t('مطلوب', 'Required');
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),

                          // Password
                          Text(
                            t('كلمة المرور', 'Password'),
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            textDirection: TextDirection.ltr,
                            style: const TextStyle(fontSize: 16),
                            decoration: InputDecoration(
                              hintText: t('أدخل كلمة المرور', 'Enter your password'),
                              prefixIcon: Icon(Icons.lock_outline_rounded, size: 20, color: AppColors.inkMuted),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                  size: 20,
                                  color: AppColors.inkMuted,
                                ),
                                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                              ),
                            ),
                            validator: (v) {
                              if (v == null || v.isEmpty) return t('مطلوب', 'Required');
                              if (v.length < 6) return t('6 أحرف على الأقل', 'At least 6 characters');
                              return null;
                            },
                          ),
                          const SizedBox(height: 8),

                          // Forgot password
                          Align(
                            alignment: AlignmentDirectional.centerEnd,
                            child: TextButton(
                              onPressed: () => context.push(Routes.resetPassword),
                              style: TextButton.styleFrom(
                                padding: EdgeInsets.zero,
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: Text(
                                t('نسيت كلمة المرور؟', 'Forgot password?'),
                                style: const TextStyle(fontSize: 14),
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Submit button — accent colored
                          SizedBox(
                            width: double.infinity,
                            height: 52,
                            child: ElevatedButton(
                              onPressed: _loading ? null : _submit,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.accent,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              child: _loading
                                  ? const SizedBox(
                                      width: 22, height: 22,
                                      child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                                    )
                                  : Text(
                                      t('تسجيل الدخول', 'Sign In'),
                                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
                                    ),
                            ),
                          ),
                          const SizedBox(height: 28),

                          // Divider
                          Row(
                            children: [
                              Expanded(child: Container(height: 0.5, color: AppColors.border)),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 16),
                                child: Text(t('أو', 'or'), style: const TextStyle(color: AppColors.inkMuted, fontSize: 14)),
                              ),
                              Expanded(child: Container(height: 0.5, color: AppColors.border)),
                            ],
                          ),
                          const SizedBox(height: 24),

                          // Register button
                          SizedBox(
                            width: double.infinity,
                            height: 52,
                            child: OutlinedButton(
                              onPressed: () => context.push(Routes.register),
                              style: OutlinedButton.styleFrom(
                                side: BorderSide(color: isDark ? AppColors.borderDark : AppColors.border, width: 1.5),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              child: Text(
                                t('إنشاء حساب جديد', 'Create new account'),
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? AppColors.inkDark : AppColors.ink,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 32),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
