import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/router/routes.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/student_stages.dart';
import 'package:ayman_academy_app/shared/widgets/arcade_auth_scaffold.dart';

/// Teacher application. The app had no teacher signup at all, so a teacher had
/// to leave for the web.
///
/// Five fields only: bio, profession and major belong to the sandbox checklist
/// on the dashboard, not to the approve-or-reject decision. The session is
/// kept — the router's redirect lands the teacher in their panel, where they
/// can build immediately while publishing stays gated on approval.
class TeacherApplicationScreen extends ConsumerStatefulWidget {
  const TeacherApplicationScreen({super.key});

  @override
  ConsumerState<TeacherApplicationScreen> createState() => _TeacherApplicationScreenState();
}

class _TeacherApplicationScreenState extends ConsumerState<TeacherApplicationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _phoneController = TextEditingController();

  final _selectedStages = <String>{};
  bool _obscurePassword = true;
  bool _loading = false;
  bool _success = false;
  String? _error;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final t = ref.read(languageProvider.notifier).t;
    if (!_formKey.currentState!.validate()) return;

    if (_selectedStages.isEmpty) {
      setState(() => _error = t('اختر مرحلة واحدة على الأقل', 'Pick at least one stage'));
      return;
    }

    setState(() { _loading = true; _error = null; });
    try {
      // Normalised once, used for every write below. profiles.email and
      // teacher_applications.email must agree on casing — GoTrue already
      // lowercases its own JWT email claim, and the admin approval flow and
      // the setup-checklist lookup both compare these two columns verbatim,
      // so a mismatch here means "Ahmad@Gmail.com" never matches
      // "ahmad@gmail.com" later.
      final normalizedEmail = _emailController.text.trim().toLowerCase();

      // GoTrue normalises the email itself; passing the as-typed value here
      // is fine.
      final session = await ref.read(authProvider.notifier).signUp(
        email: _emailController.text.trim(),
        password: _passwordController.text,
        fullName: _nameController.text.trim(),
      );

      final userId = supabase.auth.currentUser?.id;
      if (userId != null) {
        // is_active: false is the whole point — the teacher works, but cannot
        // publish until an admin flips it (enforced by migration 113).
        await supabase.from('profiles').upsert({
          'id': userId,
          'email': normalizedEmail,
          'full_name': _nameController.text.trim(),
          'phone': _phoneController.text.trim(),
          'role': 'teacher',
          'is_active': false,
          'language_pref': 'ar',
        });

        // Secondary: the account already exists, so a failure here must not
        // look like a failed signup. The web treats it the same way.
        try {
          await supabase.from('teacher_applications').insert({
            'full_name': _nameController.text.trim(),
            'email': normalizedEmail,
            'phone': _phoneController.text.trim(),
            'grades_taught': _selectedStages.join(','),
            'status': 'pending',
          });
        } catch (e) {
          debugPrint('teacher_applications insert failed: $e');
        }
      }

      // A session means they are in: the router redirect takes them to the
      // teacher home on its own. No session means confirmation is on — there
      // is no profile to refresh on that branch, since signUp returned before
      // one could ever be fetched.
      //
      // handle_new_user (043) hard-codes role = 'student' on the
      // trigger-created profile row, ignoring raw_user_meta_data.role. The
      // upsert above corrects it to 'teacher', but the router's own profile
      // read can win the race and leave stale state in the provider.
      // Awaiting a refresh here is load-bearing: skip it and the redirect in
      // router.dart can see role: 'student' and send this teacher to the
      // student onboarding stage picker.
      if (session == null) {
        setState(() => _success = true);
      } else {
        await ref.read(authProvider.notifier).refreshProfile();
      }
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
                  title: _success ? t('تحقّق من بريدك', 'Check your email') : t('علّم معنا', 'Teach with us'),
                  subtitle: _success
                      ? t('أكّد بريدك ثم سجّل الدخول', 'Confirm your email, then sign in')
                      : t('أنشئ حسابك وابدأ ببناء موادك الآن.', 'Create your account and start building now.'),
                  languageLabel: lang.languageCode == 'ar' ? 'EN' : 'عربي',
                  onToggleLanguage: () => ref.read(languageProvider.notifier).toggle(),
                  onBack: Navigator.of(context).canPop() ? () => Navigator.of(context).pop() : null,
                ),
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: _success ? _buildSuccess(t) : _buildForm(t, arc),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSuccess(String Function(String, String) t) => ArcadeButton.nav(
        key: const Key('apply_success_login'),
        onPressed: () => context.go(Routes.login),
        size: ArcadeSize.lg,
        variant: ArcadeVariant.solid,
        label: t('تسجيل الدخول', 'Sign In'),
      );

  Widget _buildForm(String Function(String, String) t, Arc arc) {
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
              key: const Key('apply_name'),
              controller: _nameController,
              textInputAction: TextInputAction.next,
              textCapitalization: TextCapitalization.words,
              autofillHints: const [AutofillHints.name],
              decoration: InputDecoration(
                hintText: t('أدخل اسمك الكامل', 'Enter your full name'),
                prefixIcon: Icon(Icons.person_outline_rounded, size: 20, color: arc.inkSoft),
              ),
              validator: (v) => (v == null || v.trim().length < 3)
                  ? t('الاسم مطلوب (3 أحرف على الأقل)', 'Name is required (at least 3 characters)')
                  : null,
            ),
          ),
          const SizedBox(height: 18),

          ArcadeField(
            label: t('البريد الإلكتروني', 'Email'),
            required: true,
            child: TextFormField(
              key: const Key('apply_email'),
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
            hint: t('6 أحرف على الأقل', 'At least 6 characters'),
            required: true,
            child: TextFormField(
              key: const Key('apply_password'),
              controller: _passwordController,
              obscureText: _obscurePassword,
              textInputAction: TextInputAction.next,
              textDirection: TextDirection.ltr,
              autofillHints: const [AutofillHints.newPassword],
              decoration: InputDecoration(
                hintText: t('أدخل كلمة المرور', 'Enter your password'),
                prefixIcon: Icon(Icons.lock_outline_rounded, size: 20, color: arc.inkSoft),
                suffixIcon: IconButton(
                  key: const Key('apply_toggle_password'),
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
            label: t('رقم الهاتف', 'Phone number'),
            required: true,
            child: TextFormField(
              key: const Key('apply_phone'),
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.done,
              textDirection: TextDirection.ltr,
              autofillHints: const [AutofillHints.telephoneNumber],
              decoration: InputDecoration(
                hintText: '+963 9xx xxx xxx',
                prefixIcon: Icon(Icons.phone_outlined, size: 20, color: arc.inkSoft),
              ),
              validator: (v) => (v == null || v.trim().length < 6)
                  ? t('رقم الهاتف مطلوب', 'Phone number is required')
                  : null,
            ),
          ),
          const SizedBox(height: 18),

          // ArcadeChip has no onTap, so selection is carried by a wrapper.
          // Semantics mirrors _StageTile on the onboarding screen.
          ArcadeField(
            label: t('المراحل التي تُدرّسها', 'Stages you teach'),
            required: true,
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: kStages.map((s) {
                final selected = _selectedStages.contains(s.key);
                return Semantics(
                  button: true,
                  selected: selected,
                  child: GestureDetector(
                    key: Key('apply_stage_${s.key}'),
                    onTap: () => setState(() {
                      selected ? _selectedStages.remove(s.key) : _selectedStages.add(s.key);
                      _error = null;
                    }),
                    child: ArcadeChip(label: t(s.ar, s.en), filled: selected),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 28),

          ArcadeButton(
            key: const Key('apply_submit'),
            onPressed: _loading ? null : _submit,
            loading: _loading,
            size: ArcadeSize.lg,
            label: t('إنشاء حساب والبدء', 'Create account and start'),
          ),
        ],
      ),
    );
  }
}
