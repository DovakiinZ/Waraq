import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/providers/connectivity_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';

class ConnectivityBanner extends ConsumerWidget {
  const ConnectivityBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOnline = ref.watch(isOnlineProvider);
    // watch (not read) so the banner re-renders when the user flips AR/EN.
    ref.watch(languageProvider);
    final t = ref.read(languageProvider.notifier).t;

    if (isOnline) return const SizedBox.shrink();

    // This widget renders above the Navigator, so no Scaffold or SafeArea is
    // padding it. Consume the status-bar inset here.
    final topInset = MediaQuery.of(context).padding.top;

    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(16, topInset + 8, 16, 8),
      color: AppColors.error,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.wifi_off, color: Colors.white, size: 16),
          const SizedBox(width: 8),
          Text(
            t('لا يوجد اتصال بالإنترنت', 'No internet connection'),
            style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }
}
