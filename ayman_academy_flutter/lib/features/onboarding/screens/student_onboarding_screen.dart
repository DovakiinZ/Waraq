import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/student_stages.dart';
import 'package:ayman_academy_app/shared/widgets/arcade_auth_scaffold.dart';

class StudentOnboardingScreen extends ConsumerStatefulWidget {
  const StudentOnboardingScreen({super.key});

  @override
  ConsumerState<StudentOnboardingScreen> createState() => _StudentOnboardingScreenState();
}

class _StudentOnboardingScreenState extends ConsumerState<StudentOnboardingScreen> {
  String? _selectedStage;
  bool _loading = false;
  String? _error;

  Future<void> _submit() async {
    if (_selectedStage == null) return;
    setState(() { _loading = true; _error = null; });
    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) {
        // Surface this in the page rather than a snackbar: the user is stuck
        // here until they sign in again, so the message has to persist.
        setState(() => _error = ref
            .read(languageProvider.notifier)
            .t('انتهت الجلسة. سجّل الدخول من جديد.', 'Session expired. Please sign in again.'));
        return;
      }
      await supabase.from('profiles').update({
        'student_stage': _selectedStage,
      }).eq('id', userId);
      await ref.read(authProvider.notifier).refreshProfile();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider);
    final isAr = lang.languageCode == 'ar';

    return Directionality(
      textDirection: isAr ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        body: Column(
          children: [
            ArcadeAuthHeader(
              title: t('مرحباً بك!', 'Welcome!'),
              subtitle: t('اختر مرحلتك الدراسية للبدء', 'Pick your stage to get started'),
              languageLabel: isAr ? 'EN' : 'عربي',
              onToggleLanguage: () => ref.read(languageProvider.notifier).toggle(),
            ),
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
                itemCount: kStages.length + (_error != null ? 1 : 0),
                separatorBuilder: (_, _) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  if (_error != null && index == 0) {
                    return ArcadeAlert(message: _error!);
                  }
                  final stage = kStages[index - (_error != null ? 1 : 0)];
                  return _StageTile(
                    stage: stage,
                    label: t(stage.ar, stage.en),
                    selected: _selectedStage == stage.key,
                    onTap: () => setState(() => _selectedStage = stage.key),
                  );
                },
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(20, 8, 20, MediaQuery.of(context).padding.bottom + 16),
              child: ArcadeButton(
                key: const Key('onboarding_continue'),
                // Disabled until a stage is chosen — the arcade's disabled
                // state drops the shadow, so the button visibly is not ready.
                onPressed: (_selectedStage != null && !_loading) ? _submit : null,
                loading: _loading,
                size: ArcadeSize.lg,
                label: t('متابعة', 'Continue'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StageTile extends StatelessWidget {
  final StageOption stage;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _StageTile({
    required this.stage,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;

    return Semantics(
      selected: selected,
      button: true,
      child: ArcadeCard(
        onTap: onTap,
        // Selection is carried by the shadow as well as the fill: a selected
        // card lifts off the page, an unselected one sits flat on it.
        flat: !selected,
        fill: selected ? arc.wash : arc.surface,
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: selected ? stage.color : arc.wash,
                border: Border.all(color: arc.line, width: Arc.borderWidth),
              ),
              child: Icon(
                stage.icon,
                size: 24,
                // On the filled stage colour the glyph goes white; the stage
                // colours are all dark enough to carry it.
                color: selected ? Colors.white : stage.color,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
                      color: arc.ink,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    stage.range,
                    textDirection: TextDirection.ltr,
                    style: TextStyle(
                      fontSize: 11,
                      fontFeatures: const [FontFeature.tabularFigures()],
                      color: arc.inkSoft,
                    ),
                  ),
                ],
              ),
            ),
            if (selected)
              Container(
                width: 26,
                height: 26,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: arc.accent,
                  border: Border.all(color: arc.line, width: Arc.borderWidth),
                ),
                child: Icon(Icons.check_rounded, color: arc.onAccent, size: 15),
              ),
          ],
        ),
      ),
    );
  }
}
