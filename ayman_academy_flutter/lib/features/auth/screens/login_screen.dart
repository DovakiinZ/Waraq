import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/router/routes.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/arcade_auth_scaffold.dart';

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
    final arc = context.arc;

    return Directionality(
      textDirection: lang.languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        body: SafeArea(
          top: false,
          child: SingleChildScrollView(
            child: Column(
              children: [
                // The deep green gradient band with the brand lockup. One of the
                // two full-bleed gradient bands the arcade system allows.
                ArcadeAuthHeader(
                  title: t('ورق أكاديمي', 'Waraq Academy'),
                  tagline: t('ورقة بعد ورقة.. نكبر', 'Page by page, we grow.'),
                  languageLabel: lang.languageCode == 'ar' ? 'EN' : 'عربي',
                  onToggleLanguage: () => ref.read(languageProvider.notifier).toggle(),
                ),

                FadeTransition(
                  opacity: _fadeAnim,
                  child: SlideTransition(
                    position: _slideAnim,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 28, 20, 24),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              t('تسجيل الدخول', 'Sign In'),
                              style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700, color: arc.ink),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              t('أدخل بياناتك للمتابعة', 'Enter your credentials to continue'),
                              style: TextStyle(fontSize: 15, color: arc.inkSoft),
                            ),
                            const SizedBox(height: 24),

                            if (_error != null) ...[
                              ArcadeAlert(message: _error!),
                              const SizedBox(height: 20),
                            ],

                            ArcadeField(
                              label: t('البريد الإلكتروني', 'Email'),
                              required: true,
                              child: TextFormField(
                                key: const Key('login_email'),
                                controller: _emailController,
                                keyboardType: TextInputType.emailAddress,
                                textInputAction: TextInputAction.next,
                                textDirection: TextDirection.ltr,
                                autofillHints: const [AutofillHints.email],
                                style: TextStyle(fontSize: 16, color: arc.ink),
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
                              child: TextFormField(
                                key: const Key('login_password'),
                                controller: _passwordController,
                                obscureText: _obscurePassword,
                                textInputAction: TextInputAction.done,
                                textDirection: TextDirection.ltr,
                                autofillHints: const [AutofillHints.password],
                                onFieldSubmitted: (_) => _loading ? null : _submit(),
                                style: TextStyle(fontSize: 16, color: arc.ink),
                                decoration: InputDecoration(
                                  hintText: t('أدخل كلمة المرور', 'Enter your password'),
                                  prefixIcon: Icon(Icons.lock_outline_rounded, size: 20, color: arc.inkSoft),
                                  suffixIcon: IconButton(
                                    key: const Key('login_toggle_password'),
                                    tooltip: _obscurePassword
                                        ? t('إظهار كلمة المرور', 'Show password')
                                        : t('إخفاء كلمة المرور', 'Hide password'),
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
                            const SizedBox(height: 10),

                            Align(
                              alignment: AlignmentDirectional.centerEnd,
                              child: TextButton(
                                key: const Key('login_forgot'),
                                onPressed: () => context.push(Routes.resetPassword),
                                style: TextButton.styleFrom(
                                  padding: EdgeInsets.zero,
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                child: Text(t('نسيت كلمة المرور؟', 'Forgot password?')),
                              ),
                            ),
                            const SizedBox(height: 24),

                            ArcadeButton(
                              key: const Key('login_submit'),
                              onPressed: _loading ? null : _submit,
                              loading: _loading,
                              size: ArcadeSize.lg,
                              label: t('تسجيل الدخول', 'Sign In'),
                            ),
                            const SizedBox(height: 24),

                            _OrDivider(label: t('أو', 'or')),
                            const SizedBox(height: 20),

                            ArcadeButton.nav(
                              key: const Key('login_go_register'),
                              onPressed: () => context.push(Routes.register),
                              size: ArcadeSize.lg,
                              variant: ArcadeVariant.outline,
                              label: t('إنشاء حساب جديد', 'Create new account'),
                            ),
                            const SizedBox(height: 28),
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
      ),
    );
  }
}

/// A hairline rule with a centred label. Pixel-strip on either side rather than
/// a plain line, so the divider reads as part of the arcade system.
class _OrDivider extends StatelessWidget {
  final String label;
  const _OrDivider({required this.label});

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    return Row(
      children: [
        const Expanded(child: PixelDivider(height: 3)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Text(
            label,
            style: TextStyle(color: arc.inkSoft, fontSize: 13, fontWeight: FontWeight.w700),
          ),
        ),
        const Expanded(child: PixelDivider(height: 3)),
      ],
    );
  }
}
