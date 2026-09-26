import 'package:flutter/material.dart';
import 'package:ayman_academy_app/brand/arcade.dart';

/// Which ground the button sits on, and what job it does.
enum ArcadeVariant {
  /// Electric green fill, deep green label. The primary action.
  solid,

  /// Surface fill, ink label. Secondary.
  outline,

  /// For a deep green band or the gradient, where the border and shadow have to
  /// be light instead of dark to stay visible.
  onDark,

  /// Destructive. Surface fill with the one non-green colour in the system, so
  /// "delete" and "reject" never look like an ordinary action.
  danger,
}

enum ArcadeSize { sm, md, lg }

/// The arcade button: 2px border, square corners, and a hard offset shadow that
/// the button *falls into* when pressed.
///
/// The press is the whole character of the control, so it is worth stating what
/// it does: at rest the button floats `n` px up-left of its shadow; on press it
/// translates `n` px down-right while the shadow collapses to zero, so the
/// button appears to be pushed flat against the page. Releasing springs it back.
/// This is the Flutter equivalent of the `.arc-press` rules in `src/index.css`.
///
/// Use [ArcadeButton] for actions and [ArcadeButton.nav] for navigation, the
/// same split the web makes between `ArcadeButton` and `ArcadeLink`.
class ArcadeButton extends StatefulWidget {
  final VoidCallback? onPressed;
  final Widget? child;
  final String? label;
  final IconData? icon;
  final ArcadeVariant variant;
  final ArcadeSize size;
  final bool loading;

  /// Stretch to the width of the parent. The app's forms are full-width, so
  /// this is on by default for [ArcadeSize.lg] and off otherwise.
  final bool? expand;

  const ArcadeButton({
    super.key,
    required this.onPressed,
    this.label,
    this.child,
    this.icon,
    this.variant = ArcadeVariant.solid,
    this.size = ArcadeSize.md,
    this.loading = false,
    this.expand,
  }) : assert(label != null || child != null, 'ArcadeButton needs a label or a child');

  /// Same control, for navigation rather than a state change. Semantically
  /// distinct at the call site; visually identical.
  const ArcadeButton.nav({
    super.key,
    required this.onPressed,
    this.label,
    this.child,
    this.icon,
    this.variant = ArcadeVariant.outline,
    this.size = ArcadeSize.md,
    this.expand,
  })  : loading = false,
        assert(label != null || child != null, 'ArcadeButton needs a label or a child');

  @override
  State<ArcadeButton> createState() => _ArcadeButtonState();
}

class _ArcadeButtonState extends State<ArcadeButton> {
  bool _down = false;

  bool get _enabled => widget.onPressed != null && !widget.loading;

  EdgeInsets get _padding => switch (widget.size) {
        ArcadeSize.sm => const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        ArcadeSize.md => const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
        ArcadeSize.lg => const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
      };

  double get _fontSize => switch (widget.size) {
        ArcadeSize.sm => 14,
        ArcadeSize.md => 15,
        ArcadeSize.lg => 16,
      };

  /// Small controls get a shorter throw, matching `.arc-press-sm`.
  double get _rest =>
      widget.size == ArcadeSize.sm ? Arc.pressRestSm : Arc.pressRest;

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    final expand = widget.expand ?? (widget.size == ArcadeSize.lg);

    late final Color fill;
    late final Color fg;
    late final Color borderColor;
    late final Color shadowColor;

    switch (widget.variant) {
      case ArcadeVariant.solid:
        fill = arc.accent;
        fg = arc.onAccent;
        borderColor = arc.line;
        shadowColor = arc.shadow;
      case ArcadeVariant.outline:
        fill = arc.surface;
        fg = arc.ink;
        borderColor = arc.line;
        shadowColor = arc.shadow;
      case ArcadeVariant.onDark:
        // On a dark band the normal shadow is invisible, so both border and
        // shadow flip to the light on-band colour.
        fill = arc.accent;
        fg = arc.onAccent;
        borderColor = arc.onInk;
        shadowColor = arc.onInk;
      case ArcadeVariant.danger:
        fill = arc.surface;
        fg = arc.danger;
        borderColor = arc.danger;
        shadowColor = arc.danger;
    }

    // Disabled drops the shadow entirely and washes the fill out: the control
    // reads as flat against the page, which is the point.
    final disabled = !_enabled;
    final offset = disabled ? 0.0 : (_down ? 0.0 : _rest);
    final shift = disabled ? 0.0 : (_down ? _rest : 0.0);

    final content = widget.child ??
        Row(
          mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (widget.loading)
              Padding(
                padding: const EdgeInsetsDirectional.only(end: 8),
                child: SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2.5, color: fg),
                ),
              )
            else if (widget.icon != null)
              Padding(
                padding: const EdgeInsetsDirectional.only(end: 8),
                child: Icon(widget.icon, size: _fontSize + 3, color: fg),
              ),
            Flexible(
              child: Text(
                widget.label!,
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: _fontSize,
                  fontWeight: FontWeight.w700,
                  color: fg,
                  height: 1.2,
                ),
              ),
            ),
          ],
        );

    return Semantics(
      button: true,
      enabled: _enabled,
      label: widget.label,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: _enabled ? (_) => setState(() => _down = true) : null,
        onTapUp: _enabled ? (_) => setState(() => _down = false) : null,
        onTapCancel: _enabled ? () => setState(() => _down = false) : null,
        onTap: _enabled ? widget.onPressed : null,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 90),
          curve: Curves.easeOut,
          // The shadow lives at (n, n) — down and to the right — in both text
          // directions. It is a light-source cue, not a reading-order one, so
          // it must not mirror under RTL.
          transform: Matrix4.translationValues(shift, shift, 0),
          width: expand ? double.infinity : null,
          padding: _padding,
          decoration: BoxDecoration(
            color: disabled ? arc.wash : fill,
            border: Border.all(
              color: disabled ? arc.inkSoft : borderColor,
              width: Arc.borderWidth,
            ),
            boxShadow: offset == 0
                ? const []
                : [BoxShadow(color: shadowColor, offset: Offset(offset, offset), blurRadius: 0)],
          ),
          child: DefaultTextStyle.merge(
            style: TextStyle(color: disabled ? arc.inkSoft : fg),
            child: IconTheme.merge(
              data: IconThemeData(color: disabled ? arc.inkSoft : fg),
              child: content,
            ),
          ),
        ),
      ),
    );
  }
}
