import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/core/router/routes.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _loading = false;
  bool _obscurePassword = true;
  String? _error;
  bool _success = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(authProvider.notifier).signUp(
        email: _emailController.text.trim(),
        password: _passwordController.text,
        fullName: _nameController.text.trim(),
      );
      setState(() => _success = true);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider);

    return Directionality(
      textDirection: lang.languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
            onPressed: () => context.pop(),
          ),
        ),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: _success ? _buildSuccess(t) : _buildForm(t),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSuccess(String Function(String, String) t) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: AppColors.success.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.check_rounded, size: 44, color: AppColors.success),
        ),
        const SizedBox(height: 24),
        Text(
          t('تم إنشاء الحساب بنجاح!', 'Account created!'),
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          t('يرجى تأكيد بريدك الإلكتروني ثم تسجيل الدخول', 'Please verify your email, then sign in'),
          style: const TextStyle(color: AppColors.inkMuted, fontSize: 15, height: 1.5),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 32),
        ElevatedButton(
          onPressed: () => context.go(Routes.login),
          child: Text(t('تسجيل الدخول', 'Sign In')),
        ),
      ],
    );
  }

  Widget _buildForm(String Function(String, String) t) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Title ──
          Text(
            t('إنشاء حساب', 'Create account'),
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            t('ابدأ رحلة التعلم مع ورق أكاديمي', 'Start your learning journey'),
            style: const TextStyle(fontSize: 16, color: AppColors.inkMuted),
          ),
          const SizedBox(height: 32),

          // ── Error ──
          if (_error != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(_error!, style: const TextStyle(color: AppColors.error, fontSize: 14)),
            ),

          // Full Name
          _fieldLabel(t('الاسم الكامل', 'Full name')),
          const SizedBox(height: 8),
          TextFormField(
            controller: _nameController,
            decoration: InputDecoration(
              hintText: t('أدخل اسمك الكامل', 'Enter your full name'),
            ),
            validator: (v) => (v == null || v.isEmpty) ? t('مطلوب', 'Required') : null,
          ),
          const SizedBox(height: 20),

          // Email
          _fieldLabel(t('البريد الإلكتروني', 'Email')),
          const SizedBox(height: 8),
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            textDirection: TextDirection.ltr,
            decoration: InputDecoration(
              hintText: t('أدخل بريدك الإلكتروني', 'Enter your email'),
            ),
            validator: (v) => (v == null || v.isEmpty) ? t('مطلوب', 'Required') : null,
          ),
          const SizedBox(height: 20),

          // Password
          _fieldLabel(t('كلمة المرور', 'Password')),
          const SizedBox(height: 8),
          TextFormField(
            controller: _passwordController,
            obscureText: _obscurePassword,
            textDirection: TextDirection.ltr,
            decoration: InputDecoration(
              hintText: t('6 أحرف على الأقل', 'At least 6 characters'),
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
          const SizedBox(height: 20),

          // Confirm Password
          _fieldLabel(t('تأكيد كلمة المرور', 'Confirm password')),
          const SizedBox(height: 8),
          TextFormField(
            controller: _confirmController,
            obscureText: true,
            textDirection: TextDirection.ltr,
            decoration: InputDecoration(
              hintText: t('أعد إدخال كلمة المرور', 'Re-enter your password'),
            ),
            validator: (v) {
              if (v != _passwordController.text) return t('كلمة المرور غير متطابقة', 'Passwords do not match');
              return null;
            },
          ),
          const SizedBox(height: 32),

          // Submit
          ElevatedButton(
            onPressed: _loading ? null : _submit,
            child: _loading
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                  )
                : Text(t('إنشاء حساب', 'Create account')),
          ),
          const SizedBox(height: 20),

          // Login link
          Center(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  t('لديك حساب بالفعل؟', 'Already have an account?'),
                  style: const TextStyle(color: AppColors.inkMuted, fontSize: 14),
                ),
                TextButton(
                  onPressed: () => context.go(Routes.login),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 6),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: Text(
                    t('تسجيل الدخول', 'Sign in'),
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _fieldLabel(String label) {
    return Text(
      label,
      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
    );
  }
}
