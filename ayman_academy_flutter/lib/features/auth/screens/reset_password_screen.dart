import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/arcade_auth_scaffold.dart';

class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  ConsumerState<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _loading = false;
  bool _sent = false;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    // Validate rather than silently returning on an empty field: the old
    // version's submit button did nothing at all with no email entered, which
    // reads as a broken button.
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(authProvider.notifier).resetPassword(_emailController.text.trim());
      setState(() => _sent = true);
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
    final arc = context.arc;

    return Directionality(
      textDirection: lang.languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        body: SafeArea(
          top: false,
          child: SingleChildScrollView(
            child: Column(
              children: [
                ArcadeAuthHeader(
                  title: t('استعادة كلمة المرور', 'Reset password'),
                  subtitle: _sent
                      ? t('تفقّد بريدك الإلكتروني', 'Check your inbox')
                      : t('سنرسل لك رابطاً لتعيين كلمة مرور جديدة',
                          'We will email you a link to set a new password'),
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
                  child: _sent ? _buildSent(t, arc) : _buildForm(t, arc),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSent(String Function(String, String) t, Arc arc) {
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
                child: Icon(Icons.mark_email_read_outlined, size: 36, color: arc.onAccent),
              ),
              const SizedBox(height: 22),
              Text(
                t('تم إرسال رابط الاستعادة', 'Reset link sent'),
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 21, fontWeight: FontWeight.w700, color: arc.ink),
              ),
              const SizedBox(height: 8),
              Text(
                // Echo the address back: the commonest reason a reset "never
                // arrives" is a typo the user cannot see any more.
                t('أرسلنا الرابط إلى ', 'We sent the link to ') + _emailController.text.trim(),
                textAlign: TextAlign.center,
                style: TextStyle(color: arc.inkSoft, fontSize: 14, height: 1.5),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        ArcadeButton.nav(
          key: const Key('reset_back'),
          onPressed: () => Navigator.of(context).pop(),
          size: ArcadeSize.lg,
          variant: ArcadeVariant.solid,
          label: t('العودة لتسجيل الدخول', 'Back to sign in'),
        ),
        const SizedBox(height: 10),
        TextButton(
          key: const Key('reset_resend'),
          onPressed: () => setState(() => _sent = false),
          child: Text(t('لم يصلك شيء؟ أعد المحاولة', "Didn't get it? Try again")),
        ),
      ],
    );
  }

  Widget _buildForm(String Function(String, String) t, Arc arc) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_error != null) ...[
            ArcadeAlert(message: _error!),
            const SizedBox(height: 20),
          ],
          ArcadeField(
            label: t('البريد الإلكتروني', 'Email'),
            required: true,
            child: TextFormField(
              key: const Key('reset_email'),
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.done,
              textDirection: TextDirection.ltr,
              autofillHints: const [AutofillHints.email],
              onFieldSubmitted: (_) => _loading ? null : _submit(),
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
          const SizedBox(height: 26),
          ArcadeButton(
            key: const Key('reset_submit'),
            onPressed: _loading ? null : _submit,
            loading: _loading,
            size: ArcadeSize.lg,
            label: t('إرسال رابط الاستعادة', 'Send reset link'),
          ),
        ],
      ),
    );
  }
}
