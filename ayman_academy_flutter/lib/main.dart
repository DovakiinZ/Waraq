import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:ayman_academy_app/core/env.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/core/theme/app_theme.dart';
import 'package:ayman_academy_app/core/router/router.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/providers/theme_provider.dart';
import 'package:ayman_academy_app/shared/services/cache_service.dart';
import 'package:ayman_academy_app/shared/services/notification_service.dart';
import 'package:ayman_academy_app/shared/widgets/connectivity_banner.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Guard: if the build was compiled without the required --dart-define
  // values, the Supabase client would silently init with empty URL/key and
  // every request would fail cryptically. Show a clear error screen instead.
  if (!Env.isConfigured) {
    runApp(const _ConfigErrorApp());
    return;
  }

  await Hive.initFlutter();
  await CacheService.initBoxes();
  await initSupabase();
  await NotificationService.initialize();

  runApp(const ProviderScope(child: AymanAcademyApp()));
}

/// Shown when required environment variables (SUPABASE_URL / SUPABASE_ANON_KEY)
/// are missing from the build. This is a build/ops misconfiguration, not a
/// user-facing runtime state.
class _ConfigErrorApp extends StatelessWidget {
  const _ConfigErrorApp();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Directionality(
        textDirection: TextDirection.rtl,
        child: Scaffold(
          backgroundColor: const Color(0xFF131921),
          body: Padding(
            padding: const EdgeInsets.all(24),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Icon(Icons.error_outline, color: Color(0xFFAE944F), size: 56),
                  SizedBox(height: 16),
                  Text(
                    'إعدادات التطبيق غير مكتملة',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'App configuration is missing.\nSUPABASE_URL and SUPABASE_ANON_KEY must be provided at build time via --dart-define.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.5),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class AymanAcademyApp extends ConsumerStatefulWidget {
  const AymanAcademyApp({super.key});

  @override
  ConsumerState<AymanAcademyApp> createState() => _AymanAcademyAppState();
}

class _AymanAcademyAppState extends ConsumerState<AymanAcademyApp> {
  @override
  void initState() {
    super.initState();
    // Set up notification tap routing after router is available
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final router = ref.read(routerProvider);
      NotificationService.setupHandlers(
        onNavigate: (route) => router.go(route),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(languageProvider);
    final themeMode = ref.watch(themeProvider);
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'ورق أكاديمي',
      debugShowCheckedModeBanner: false,
      locale: locale,
      supportedLocales: const [
        Locale('ar', 'SA'),
        Locale('en', 'US'),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: themeMode,
      routerConfig: router,
      builder: (context, child) {
        return Column(
          children: [
            const ConnectivityBanner(),
            Expanded(child: child ?? const SizedBox.shrink()),
          ],
        );
      },
    );
  }
}
