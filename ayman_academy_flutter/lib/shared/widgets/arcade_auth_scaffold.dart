import 'package:flutter/material.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';

/// The deep-green gradient band that tops every unauthenticated screen.
///
/// The arcade system allows the full-bleed gradient on **exactly two** bands,
/// and this is one of them: the auth entry point. Everything else in the app is
/// white (or the dark ground) with green borders, so do not reach for the
/// gradient again on an inner screen.
///
/// The language toggle lives here rather than in each screen because it has to
/// be reachable *before* sign-in — a student who lands on an Arabic build they
/// cannot read has no other way out.
class ArcadeAuthHeader extends StatelessWidget {
  final String title;
  final String? tagline;

  /// The label for the *other* language, e.g. `EN` while Arabic is active.
  final String? languageLabel;
  final VoidCallback? onToggleLanguage;

  /// Shown instead of [tagline] on the secondary auth screens, where the brand
  /// pitch has already been made.
  final String? subtitle;

  /// Draw a back affordance — reset-password and register are pushed, so the
  /// band has to carry the way out.
  final VoidCallback? onBack;

  const ArcadeAuthHeader({
    super.key,
    required this.title,
    this.tagline,
    this.subtitle,
    this.languageLabel,
    this.onToggleLanguage,
    this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    final topInset = MediaQuery.of(context).padding.top;

    return Container(
      width: double.infinity,
      padding: EdgeInsets.only(top: topInset + 12, bottom: 32),
      decoration: BoxDecoration(
        gradient: arc.gradient,
        border: Border(bottom: BorderSide(color: arc.line, width: Arc.borderWidth)),
      ),
      child: Column(
        children: [
          SizedBox(
            height: 40,
            child: Row(
              children: [
                if (onBack != null)
                  IconButton(
                    key: const Key('auth_back'),
                    onPressed: onBack,
                    // The arrow points back along the reading direction, so it
                    // must flip under RTL.
                    icon: Icon(Icons.arrow_back, color: arc.onInk, size: 22),
                    tooltip: MaterialLocalizations.of(context).backButtonTooltip,
                  )
                else
                  const SizedBox(width: 8),
                const Spacer(),
                if (onToggleLanguage != null && languageLabel != null)
                  Padding(
                    padding: const EdgeInsetsDirectional.only(end: 12),
                    child: ArcadeButton(
                      key: const Key('auth_language_toggle'),
                      onPressed: onToggleLanguage,
                      size: ArcadeSize.sm,
                      variant: ArcadeVariant.onDark,
                      icon: Icons.language_rounded,
                      label: languageLabel!,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          BrandLogo(size: 64, onDark: true, markOnly: true),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 27, fontWeight: FontWeight.w700, color: arc.onInk, height: 1.25),
            ),
          ),
          if (tagline != null || subtitle != null) ...[
            const SizedBox(height: 6),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                subtitle ?? tagline!,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: arc.onInkMuted, height: 1.45),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Severity of an [ArcadeAlert].
enum ArcadeAlertKind { error, success, info }

/// An inline banner: bordered, square, no shadow.
///
/// Errors use [Arc.danger] — the one non-green colour in the system — because
/// an error rendered in the brand green would not read as an error.
class ArcadeAlert extends StatelessWidget {
  final String message;
  final ArcadeAlertKind kind;

  const ArcadeAlert({super.key, required this.message, this.kind = ArcadeAlertKind.error});

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;

    final (Color accent, IconData icon) = switch (kind) {
      ArcadeAlertKind.error => (arc.danger, Icons.error_outline_rounded),
      ArcadeAlertKind.success => (arc.mid, Icons.check_circle_outline_rounded),
      ArcadeAlertKind.info => (arc.mid, Icons.info_outline_rounded),
    };

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        // A 12%-alpha tint of the accent reads on both the white and the dark
        // ground, where a fixed pale wash would only work on one.
        color: accent.withValues(alpha: 0.12),
        border: Border.all(color: accent, width: Arc.borderWidth),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: accent, size: 19),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                color: kind == ArcadeAlertKind.error ? accent : arc.ink,
                fontSize: 14,
                fontWeight: FontWeight.w600,
                height: 1.45,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
