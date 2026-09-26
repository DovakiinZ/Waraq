import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/router/routes.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/arcade_auth_scaffold.dart';

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
  bool _obscureConfirm = true;
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
        body: SafeArea(
          top: false,
          child: SingleChildScrollView(
            child: Column(
              children: [
                ArcadeAuthHeader(
                  title: _success
                      ? t('أهلاً بك', 'Welcome aboard')
                      : t('إنشاء حساب', 'Create account'),
                  subtitle: _success
                      ? t('خطوة واحدة وتبدأ', 'One step left before you start')
                      : t('ابدأ رحلة التعلم مع ورق أكاديمي', 'Start your learning journey with Waraq'),
                  languageLabel: lang.languageCode == 'ar' ? 'EN' : 'عربي',
                  onToggleLanguage: () => ref.read(languageProvider.notifier).toggle(),
                  // `Navigator`, not go_router's `context.canPop()`: that extension
                  // asserts when no GoRouter is in scope, so the screen could not
                  // be rendered anywhere else (a test, a preview, a bare push).
                  // Both report the same thing for a pushed top-level route.
                  onBack: Navigator.of(context).canPop()
                      ? () => Navigator.of(context).pop()
                      : null,
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 28, 20, 28),
                  child: _success ? _buildSuccess(t) : _buildForm(t),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSuccess(String Function(String, String) t) {
    final arc = context.arc;
    return Column(
      children: [
        ArcadeCard(
          padding: const EdgeInsets.all(28),
          child: Column(
            children: [
              Container(
                width: 72,
                height: 72,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: arc.accent,
                  border: Border.all(color: arc.line, width: Arc.borderWidth),
                ),
                // On the electric-green fill the glyph takes `onAccent`, never
                // white.
                child: Icon(Icons.check_rounded, size: 40, color: arc.onAccent),
              ),
              const SizedBox(height: 22),
              Text(
                t('تم إنشاء الحساب بنجاح!', 'Account created!'),
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: arc.ink),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                t('يرجى تأكيد بريدك الإلكتروني ثم تسجيل الدخول',
                    'Please verify your email, then sign in'),
                style: TextStyle(color: arc.inkSoft, fontSize: 15, height: 1.5),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        ArcadeButton.nav(
          key: const Key('register_success_login'),
          onPressed: () => context.go(Routes.login),
          size: ArcadeSize.lg,
          variant: ArcadeVariant.solid,
          label: t('تسجيل الدخول', 'Sign In'),
        ),
      ],
    );
  }

  Widget _buildForm(String Function(String, String) t) {
    final arc = context.arc;

    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_error != null) ...[
            ArcadeAlert(message: _error!),
            const SizedBox(height: 20),
          ],

          ArcadeField(
            label: t('الاسم الكامل', 'Full name'),
            required: true,
            child: TextFormField(
              key: const Key('register_name'),
              controller: _nameController,
              textInputAction: TextInputAction.next,
              textCapitalization: TextCapitalization.words,
              autofillHints: const [AutofillHints.name],
              decoration: InputDecoration(
                hintText: t('أدخل اسمك الكامل', 'Enter your full name'),
                prefixIcon: Icon(Icons.person_outline_rounded, size: 20, color: arc.inkSoft),
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? t('مطلوب', 'Required') : null,
            ),
          ),
          const SizedBox(height: 18),

          ArcadeField(
            label: t('البريد الإلكتروني', 'Email'),
            required: true,
            child: TextFormField(
              key: const Key('register_email'),
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              textDirection: TextDirection.ltr,
              autofillHints: const [AutofillHints.email],
              decoration: InputDecoration(
                hintText: 'example@email.com',
                prefixIcon: Icon(Icons.mail_outline_rounded, size: 20, color: arc.inkSoft),
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return t('مطلوب', 'Required');
                if (!v.contains('@') || !v.contains('.')) {
                  return t('بريد إلكتروني غير صالح', 'Invalid email');
                }
                return null;
              },
            ),
          ),
          const SizedBox(height: 18),

          ArcadeField(
            label: t('كلمة المرور', 'Password'),
            required: true,
            hint: t('6 أحرف على الأقل', 'At least 6 characters'),
            child: TextFormField(
              key: const Key('register_password'),
              controller: _passwordController,
              obscureText: _obscurePassword,
              textInputAction: TextInputAction.next,
              textDirection: TextDirection.ltr,
              autofillHints: const [AutofillHints.newPassword],
              decoration: InputDecoration(
                hintText: t('أدخل كلمة المرور', 'Enter your password'),
                prefixIcon: Icon(Icons.lock_outline_rounded, size: 20, color: arc.inkSoft),
                suffixIcon: IconButton(
                  key: const Key('register_toggle_password'),
                  icon: Icon(
                    _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                    size: 20,
                    color: arc.inkSoft,
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
          ),
          const SizedBox(height: 18),

          ArcadeField(
            label: t('تأكيد كلمة المرور', 'Confirm password'),
            required: true,
            child: TextFormField(
              key: const Key('register_confirm'),
              controller: _confirmController,
              obscureText: _obscureConfirm,
              textInputAction: TextInputAction.done,
              textDirection: TextDirection.ltr,
              onFieldSubmitted: (_) => _loading ? null : _submit(),
              decoration: InputDecoration(
                hintText: t('أعد إدخال كلمة المرور', 'Re-enter your password'),
                prefixIcon: Icon(Icons.lock_outline_rounded, size: 20, color: arc.inkSoft),
                suffixIcon: IconButton(
                  key: const Key('register_toggle_confirm'),
                  icon: Icon(
                    _obscureConfirm ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                    size: 20,
                    color: arc.inkSoft,
                  ),
                  onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                ),
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return t('مطلوب', 'Required');
                if (v != _passwordController.text) {
                  return t('كلمة المرور غير متطابقة', 'Passwords do not match');
                }
                return null;
              },
            ),
          ),
          const SizedBox(height: 28),

          ArcadeButton(
            key: const Key('register_submit'),
            onPressed: _loading ? null : _submit,
            loading: _loading,
            size: ArcadeSize.lg,
            label: t('إنشاء حساب', 'Create account'),
          ),
          const SizedBox(height: 18),

          Center(
            child: Wrap(
              alignment: WrapAlignment.center,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text(
                  t('لديك حساب بالفعل؟', 'Already have an account?'),
                  style: TextStyle(color: arc.inkSoft, fontSize: 14),
                ),
                TextButton(
                  key: const Key('register_go_login'),
                  onPressed: () => context.go(Routes.login),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 6),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: Text(t('تسجيل الدخول', 'Sign in')),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
