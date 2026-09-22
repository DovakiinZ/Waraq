import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:ayman_academy_app/core/env.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';

/// The admin control panel, served inside the app.
///
/// The admin CMS is a large web application (stages, subjects, lessons,
/// templates, homepage builder, plans, coupons, orders, invites...). Rather
/// than fork it into Flutter, this screen embeds it and hands over the signed-in
/// session so the admin is not asked to log in a second time: we navigate to
/// `/auth/bridge` with the tokens in the URL fragment, which the web app
/// consumes via supabase.auth.setSession().
///
/// Navigation is pinned to the portal's own origin — anything else is refused,
/// so a stray link cannot carry the session somewhere else.
class AdminPanelScreen extends ConsumerStatefulWidget {
  const AdminPanelScreen({super.key});

  @override
  ConsumerState<AdminPanelScreen> createState() => _AdminPanelScreenState();
}

class _AdminPanelScreenState extends ConsumerState<AdminPanelScreen> {
  WebViewController? _controller;
  bool _loading = true;
  String? _error;
  bool _canGoBack = false;

  @override
  void initState() {
    super.initState();
    _setUp();
  }

  String get _origin => Uri.parse(Env.webAppUrl).origin;

  Future<void> _setUp() async {
    final session = supabase.auth.currentSession;
    if (session == null) {
      setState(() {
        _loading = false;
        _error = 'no-session';
      });
      return;
    }

    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(AppColors.background)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) setState(() => _loading = true);
          },
          onPageFinished: (_) async {
            if (!mounted) return;
            final canGoBack = await _controller?.canGoBack() ?? false;
            if (!mounted) return;
            setState(() {
              _loading = false;
              _canGoBack = canGoBack;
            });
          },
          onWebResourceError: (error) {
            // Sub-resource failures (an image, a font) shouldn't blank the panel.
            if (!error.isForMainFrame!) return;
            if (mounted) {
              setState(() {
                _loading = false;
                _error = error.description;
              });
            }
          },
          onNavigationRequest: (request) {
            final host = Uri.tryParse(request.url)?.origin;
            return host == _origin
                ? NavigationDecision.navigate
                : NavigationDecision.prevent;
          },
        ),
      );

    await controller.loadRequest(Uri.parse(_bridgeUrl(session)));

    if (mounted) setState(() => _controller = controller);
  }

  /// Tokens go in the fragment, which browsers never send to the server.
  String _bridgeUrl(Session session) {
    // Named `at`/`rt` on purpose: the web client runs with detectSessionInUrl,
    // and supabase-js would grab `access_token` from the fragment itself before
    // the bridge page gets a chance to.
    final params = {
      'at': session.accessToken,
      'rt': session.refreshToken ?? '',
      'redirect': '/admin',
    };
    final fragment = params.entries
        .map((e) => '${e.key}=${Uri.encodeComponent(e.value)}')
        .join('&');
    return '$_origin/auth/bridge#$fragment';
  }

  Future<void> _reload() async {
    setState(() {
      _error = null;
      _loading = true;
    });
    final session = supabase.auth.currentSession;
    if (session == null || _controller == null) {
      await _setUp();
      return;
    }
    await _controller!.loadRequest(Uri.parse(_bridgeUrl(session)));
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: PopScope(
        // Let Android's back button walk the panel's own history first.
        canPop: !_canGoBack,
        onPopInvokedWithResult: (didPop, _) async {
          if (didPop) return;
          if (await _controller?.canGoBack() ?? false) {
            await _controller!.goBack();
          }
        },
        child: Scaffold(
          backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
          appBar: AppBar(
            backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
            surfaceTintColor: Colors.transparent,
            elevation: 0,
            title: Text(
              t('لوحة الإدارة', 'Admin Panel'),
              style: TextStyle(
                fontFamily: 'IBMPlexSansArabic',
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: isDark ? AppColors.inkDark : AppColors.ink,
              ),
            ),
            actions: [
              IconButton(
                tooltip: t('تحديث', 'Reload'),
                icon: const Icon(Icons.refresh_rounded, size: 22),
                onPressed: _reload,
              ),
              IconButton(
                tooltip: t('تسجيل الخروج', 'Sign Out'),
                icon: const Icon(Icons.logout_rounded, size: 20, color: AppColors.error),
                onPressed: () => ref.read(authProvider.notifier).signOut(),
              ),
            ],
          ),
          body: _error != null
              ? _buildError(t, isDark)
              : Stack(
                  children: [
                    if (_controller != null)
                      WebViewWidget(controller: _controller!),
                    if (_loading)
                      const Center(child: CircularProgressIndicator(color: AppColors.accent)),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildError(String Function(String, String) t, bool isDark) {
    final noSession = _error == 'no-session';
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.cloud_off_rounded, size: 64, color: AppColors.inkMuted),
            const SizedBox(height: 20),
            Text(
              noSession
                  ? t('انتهت الجلسة، الرجاء تسجيل الدخول مجدداً',
                      'Your session expired, please sign in again')
                  : t('تعذر فتح لوحة الإدارة', 'Could not open the admin panel'),
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'IBMPlexSansArabic',
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: isDark ? AppColors.inkDark : AppColors.ink,
              ),
            ),
            if (!noSession) ...[
              const SizedBox(height: 8),
              Text(
                t('تحقق من اتصالك بالإنترنت ثم أعد المحاولة',
                    'Check your internet connection and try again'),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontFamily: 'IBMPlexSansArabic',
                  fontSize: 13,
                  color: AppColors.inkMuted,
                ),
              ),
            ],
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: noSession
                  ? () => ref.read(authProvider.notifier).signOut()
                  : _reload,
              icon: Icon(noSession ? Icons.login_rounded : Icons.refresh_rounded),
              label: Text(noSession ? t('تسجيل الدخول', 'Sign In') : t('إعادة المحاولة', 'Retry')),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.accent,
                foregroundColor: Colors.white,
                elevation: 0,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
