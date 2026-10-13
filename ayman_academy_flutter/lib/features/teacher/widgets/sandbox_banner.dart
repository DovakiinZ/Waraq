import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';

/// Dart mirror of src/components/teacher/SandboxBanner.tsx — same four derived
/// rows, same contract: renders nothing once the teacher is approved and set
/// up, and hides the checklist rather than blocking if its lookup fails.
///
/// `is_active` is a PUBLISH gate, not a login gate. A pending teacher builds
/// freely; migration 113 is what stops them publishing.

/// The teacher's stages, read from their application row. Nullable on purpose:
/// null means "could not tell", which hides the checklist instead of showing a
/// row as undone on no evidence.
final teacherStagesProvider = FutureProvider<String?>((ref) async {
  final email = ref.watch(authProvider).profile?.email;
  if (email == null) return null;
  final row = await supabase
      .from('teacher_applications')
      .select('grades_taught')
      .eq('email', email)
      .maybeSingle();
  return row?['grades_taught'] as String?;
});

class _SetupRow {
  final String ar;
  final String en;
  final bool done;
  const _SetupRow(this.ar, this.en, this.done);
}

class SandboxBanner extends ConsumerWidget {
  const SandboxBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // watch (not read) so the banner re-renders when the user flips AR/EN.
    ref.watch(languageProvider);
    final t = ref.read(languageProvider.notifier).t;
    final arc = context.arc;
    final profile = ref.watch(authProvider).profile;
    final stages = ref.watch(teacherStagesProvider);

    final pending = profile?.isActive == false;

    final rows = <_SetupRow>[
      _SetupRow('الاسم والبريد', 'Name and email',
          (profile?.fullName ?? '').isNotEmpty && (profile?.email ?? '').isNotEmpty),
      _SetupRow('المراحل التي تُدرّسها', 'Stages you teach',
          (stages.valueOrNull ?? '').isNotEmpty),
      _SetupRow('نبذة عنك — تظهر في ملفك العام', 'A short bio — shown on your public profile',
          (profile?.bioAr ?? '').isNotEmpty),
      _SetupRow('حساب شام كاش لاستلام المدفوعات', 'Sham Cash account for receiving payments',
          (profile?.shamcashAccountName ?? '').isNotEmpty &&
              (profile?.shamcashAccountNumber ?? '').isNotEmpty),
    ];

    final doneCount = rows.where((r) => r.done).length;
    final complete = doneCount == rows.length;

    // Nothing to say once they are approved and set up.
    if (!pending && complete) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (pending)
          ArcadeCard(
            fill: arc.wash,
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    ArcadeChip(label: t('قيد المراجعة', 'Under review')),
                    const SizedBox(width: 10),
                    Text(
                      '~24h',
                      textDirection: TextDirection.ltr,
                      style: TextStyle(fontSize: 11, color: arc.inkSoft),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  t(
                    'ابنِ موادك ودروسك الآن. النشر والبيع يُفتحان بموافقة الإدارة.',
                    'Build your subjects and lessons now. Publishing and selling unlock once an admin approves you.',
                  ),
                  style: TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w600, height: 1.55, color: arc.ink),
                ),
              ],
            ),
          ),

        // hasValue, not valueOrNull: a failed lookup must hide the checklist
        // rather than show every row as undone.
        if (!complete && stages.hasValue)
          ArcadeCard(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      t('أكمل ملفك', 'Finish your profile'),
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: arc.ink),
                    ),
                    Text(
                      '$doneCount / ${rows.length}',
                      textDirection: TextDirection.ltr,
                      style: TextStyle(fontSize: 12, color: arc.inkSoft),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                for (final row in rows)
                  Semantics(
                    label:
                        '${row.done ? t('مكتمل', 'Completed') : t('غير مكتمل', 'Not completed')}: ${t(row.ar, row.en)}',
                    excludeSemantics: true,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 18,
                            height: 18,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              // On the electric-green fill the glyph takes
                              // onAccent, never white.
                              color: row.done ? arc.accent : Colors.transparent,
                              border: Border.all(color: arc.line, width: Arc.borderWidth),
                            ),
                            child: row.done
                                ? Icon(Icons.check_rounded, size: 12, color: arc.onAccent)
                                : null,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              t(row.ar, row.en),
                              style: TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w600,
                                color: row.done ? arc.inkSoft : arc.ink,
                                decoration: row.done ? TextDecoration.lineThrough : null,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}
