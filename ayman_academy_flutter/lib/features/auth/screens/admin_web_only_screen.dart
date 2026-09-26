import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/env.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';

class AdminWebOnlyScreen extends ConsumerWidget {
  const AdminWebOnlyScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final arc = context.arc;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const BrandLogo(size: 56, markOnly: true),
                const SizedBox(height: 28),
                ArcadeCard(
                  padding: const EdgeInsets.all(26),
                  child: Column(
                    children: [
                      Container(
                        width: 64,
                        height: 64,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: arc.wash,
                          border: Border.all(color: arc.line, width: Arc.borderWidth),
                        ),
                        child: Icon(Icons.computer_rounded, size: 32, color: arc.mid),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        t('لوحة الإدارة', 'Admin Panel'),
                        style: TextStyle(fontSize: 21, fontWeight: FontWeight.w700, color: arc.ink),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        t('يمكن الوصول إلى لوحة الإدارة عبر المتصفح فقط',
                            'Admin access is available on web only'),
                        textAlign: TextAlign.center,
                        style: TextStyle(color: arc.inkSoft, fontSize: 14, height: 1.5),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 26),
                ArcadeButton(
                  key: const Key('admin_open_browser'),
                  onPressed: () => launchUrl(
                    Uri.parse(Env.webAppUrl),
                    mode: LaunchMode.externalApplication,
                  ),
                  size: ArcadeSize.lg,
                  icon: Icons.open_in_browser_rounded,
                  label: t('فتح في المتصفح', 'Open in Browser'),
                ),
                const SizedBox(height: 12),
                ArcadeButton(
                  key: const Key('admin_sign_out'),
                  onPressed: () => ref.read(authProvider.notifier).signOut(),
                  size: ArcadeSize.lg,
                  variant: ArcadeVariant.danger,
                  icon: Icons.logout_rounded,
                  label: t('تسجيل الخروج', 'Sign Out'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
