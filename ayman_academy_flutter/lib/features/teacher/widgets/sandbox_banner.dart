import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';

/// Dart mirror of src/components/teacher/SandboxBanner.tsx: the "under review"
/// notice for a pending teacher. Renders nothing once they are approved.
///
/// The old four-row «أكمل ملفك» checklist that lived here was replaced by the
/// setup guide card (lib/features/setup), which covers the same profile step.
///
/// `is_active` is a PUBLISH gate, not a login gate. A pending teacher builds
/// freely; migration 113 is what stops them publishing.
class SandboxBanner extends ConsumerWidget {
  const SandboxBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // watch (not read) so the banner re-renders when the user flips AR/EN.
    ref.watch(languageProvider);
    final t = ref.read(languageProvider.notifier).t;
    final arc = context.arc;
    final pending = ref.watch(authProvider).profile?.isActive == false;
    if (!pending) return const SizedBox.shrink();

    return ArcadeCard(
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
    );
  }
}
