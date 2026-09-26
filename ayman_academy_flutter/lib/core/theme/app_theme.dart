import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:ayman_academy_app/brand/arcade.dart';
import 'app_colors.dart';

/// The app's `ThemeData`, built on the Waraq **arcade** design language — the
/// same green + white system the web platform uses on every public surface.
///
/// Three rules drive every value below, and breaking any one of them is what
/// makes a screen stop looking like the rest of the app:
///
///  1. **Radius is 0.** [Arc.radius]. No rounded corners anywhere — not on
///     cards, buttons, inputs, chips, sheets or dialogs.
///  2. **Borders are 2px, in `line`.** [Arc.borderWidth]. A surface without a
///     border is not an arcade surface.
///  3. **Elevation is a hard offset shadow, never a blur.** Material's own
///     `elevation` is therefore 0 everywhere; depth comes from
///     `context.arc.hard()`, which widgets apply themselves. A blurred Material
///     shadow next to a hard arcade one looks like a bug.
///
/// The [Arc] extension is registered on both themes, so `context.arc` resolves
/// to the right brightness anywhere under `MaterialApp`.
class AppTheme {
  // IBM Plex Sans Arabic, bundled in assets/fonts and declared in pubspec.yaml.
  //
  // This used to be `GoogleFonts.cairo()`, which fetches the font over the
  // network on first use. The 1.2 MB of IBM Plex Sans Arabic shipped inside the
  // APK was never used, and students on weak or intermittent connections (the
  // Syrian market this targets) got a download or a fallback face instead of
  // the brand font. Keep this a bundled family name; do not reintroduce a
  // runtime font fetch.
  static const String _ff = 'IBMPlexSansArabic';

  static TextTheme get _textTheme {
    const f = _ff;
    // Two brand rules are enforced here:
    //  - weight caps at 700, the heaviest face the family ships. w800 had no
    //    real face and was being synthesised.
    //  - no letterSpacing on Arabic: tracking breaks the joined letterforms.
    return const TextTheme(
      displayLarge: TextStyle(fontSize: 34, fontWeight: FontWeight.w700, height: 1.2, fontFamily: f),
      displayMedium: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, height: 1.25, fontFamily: f),
      displaySmall: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, height: 1.3, fontFamily: f),
      headlineLarge: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, height: 1.3, fontFamily: f),
      headlineMedium: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, height: 1.4, fontFamily: f),
      bodyLarge: TextStyle(fontSize: 17, fontWeight: FontWeight.w400, height: 1.5, fontFamily: f),
      bodyMedium: TextStyle(fontSize: 15, fontWeight: FontWeight.w400, height: 1.45, fontFamily: f),
      bodySmall: TextStyle(fontSize: 13, fontWeight: FontWeight.w400, height: 1.4, fontFamily: f),
      labelLarge: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, height: 1.4, fontFamily: f),
      labelMedium: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, height: 1.3, fontFamily: f),
      labelSmall: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, height: 1.3, fontFamily: f),
    );
  }

  /// Radius 0, everywhere. A single object so no call site can drift.
  static const _sharp = BorderRadius.zero;

  /// One builder for both brightnesses. Everything that differs between light
  /// and dark comes out of [arc], so the two themes cannot fall out of step —
  /// which is exactly what happened when they were two hand-maintained copies.
  static ThemeData _build(Arc arc, Brightness brightness) {
    const f = _ff;
    final isDark = brightness == Brightness.dark;

    // A 2px `line` border with square corners: the arcade surface.
    RoundedRectangleBorder outlined([Color? c, double w = Arc.borderWidth]) =>
        RoundedRectangleBorder(
          borderRadius: _sharp,
          side: BorderSide(color: c ?? arc.line, width: w),
        );

    OutlineInputBorder field(Color c, [double w = Arc.borderWidth]) =>
        OutlineInputBorder(borderRadius: _sharp, borderSide: BorderSide(color: c, width: w));

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      fontFamily: f,
      scaffoldBackgroundColor: arc.bg,
      canvasColor: arc.bg,
      splashFactory: InkRipple.splashFactory,

      // `context.arc` reads this.
      extensions: <ThemeExtension<dynamic>>[arc],

      colorScheme: ColorScheme(
        brightness: brightness,
        // In light mode the deep green carries text, borders and band fills; in
        // dark mode `mid` is the readable green that plays that role.
        primary: isDark ? arc.mid : arc.ink,
        onPrimary: isDark ? arc.onAccent : arc.onInk,
        // The one fill in the system.
        secondary: arc.accent,
        onSecondary: arc.onAccent,
        tertiary: arc.mid,
        onTertiary: arc.onInk,
        surface: arc.surface,
        onSurface: arc.ink,
        surfaceContainerHighest: arc.wash,
        onSurfaceVariant: arc.inkSoft,
        error: arc.danger,
        onError: Colors.white,
        outline: arc.line,
        outlineVariant: isDark ? AppColors.separatorDark : AppColors.separator,
        shadow: arc.shadow,
      ),

      textTheme: _textTheme.apply(bodyColor: arc.ink, displayColor: arc.ink),

      // ── App bar: flat, on the ground, with a 2px rule underneath ──
      appBarTheme: AppBarTheme(
        backgroundColor: arc.bg,
        foregroundColor: arc.ink,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
        // The arcade app bar is separated from content by a hard rule, not by a
        // shadow that appears on scroll.
        shape: Border(bottom: BorderSide(color: arc.line, width: Arc.borderWidth)),
        iconTheme: IconThemeData(color: arc.ink, size: 22),
        actionsIconTheme: IconThemeData(color: arc.ink, size: 22),
        titleTextStyle: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w700,
          color: arc.ink,
          fontFamily: f,
        ),
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarBrightness: brightness,
          statusBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
          statusBarColor: Colors.transparent,
        ),
      ),

      // ── Cards: bordered, square, unelevated. Depth is opt-in via hard(). ──
      cardTheme: CardThemeData(
        color: arc.surface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        margin: EdgeInsets.zero,
        shape: outlined(),
      ),

      // ── Inputs: surface-filled with a real border, not a tinted well ──
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: arc.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        border: field(arc.line),
        enabledBorder: field(arc.line),
        // Focus thickens and greens the border. The web adds a 3px offset
        // shadow too; Flutter cannot express that on an InputBorder, so the
        // weight carries the state instead.
        focusedBorder: field(arc.mid, 3),
        disabledBorder: field(arc.inkSoft),
        errorBorder: field(arc.danger),
        focusedErrorBorder: field(arc.danger, 3),
        hintStyle: TextStyle(color: arc.inkSoft, fontSize: 15, fontFamily: f),
        labelStyle: TextStyle(color: arc.inkSoft, fontSize: 15, fontFamily: f),
        floatingLabelStyle: TextStyle(color: arc.mid, fontSize: 14, fontFamily: f, fontWeight: FontWeight.w700),
        errorStyle: TextStyle(color: arc.danger, fontSize: 12, fontFamily: f, fontWeight: FontWeight.w700),
        prefixIconColor: arc.inkSoft,
        suffixIconColor: arc.inkSoft,
      ),

      // ── Primary action: electric green fill, deep green label ──
      //
      // Note the label is `onAccent`, never white. Electric green is a light
      // colour; white on it fails contrast.
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: arc.accent,
          foregroundColor: arc.onAccent,
          disabledBackgroundColor: arc.wash,
          disabledForegroundColor: arc.inkSoft,
          elevation: 0,
          shadowColor: Colors.transparent,
          minimumSize: const Size(double.infinity, 52),
          shape: outlined(),
          side: BorderSide(color: arc.line, width: Arc.borderWidth),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, fontFamily: f),
        ),
      ),

      // ── Secondary action: surface fill, ink label, same 2px border ──
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          backgroundColor: arc.surface,
          foregroundColor: arc.ink,
          disabledForegroundColor: arc.inkSoft,
          elevation: 0,
          minimumSize: const Size(double.infinity, 52),
          side: BorderSide(color: arc.line, width: Arc.borderWidth),
          shape: outlined(),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, fontFamily: f),
        ),
      ),

      // ── Tertiary action: `mid`, the readable green. Not accent (1.9:1). ──
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: arc.mid,
          shape: outlined(Colors.transparent),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, fontFamily: f),
        ),
      ),

      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: arc.accent,
          foregroundColor: arc.onAccent,
          elevation: 0,
          minimumSize: const Size(double.infinity, 52),
          shape: outlined(),
          side: BorderSide(color: arc.line, width: Arc.borderWidth),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, fontFamily: f),
        ),
      ),

      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(foregroundColor: arc.ink),
      ),

      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: arc.accent,
        foregroundColor: arc.onAccent,
        elevation: 0,
        focusElevation: 0,
        hoverElevation: 0,
        highlightElevation: 0,
        shape: outlined(),
      ),

      // ── Bottom nav: square green chip behind the selected destination ──
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: arc.surface,
        elevation: 0,
        height: 60,
        surfaceTintColor: Colors.transparent,
        indicatorColor: arc.accent,
        // Square, like everything else. The default is a pill.
        indicatorShape: const RoundedRectangleBorder(borderRadius: _sharp),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 10,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? arc.ink : arc.inkSoft,
            fontFamily: f,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          // Selected icons sit on the electric-green indicator, so they take
          // `onAccent` — white or `ink`-in-dark would be unreadable there.
          if (states.contains(WidgetState.selected)) {
            return IconThemeData(color: arc.onAccent, size: 22);
          }
          return IconThemeData(color: arc.inkSoft, size: 22);
        }),
      ),

      drawerTheme: DrawerThemeData(
        backgroundColor: arc.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: const RoundedRectangleBorder(borderRadius: _sharp),
      ),

      dividerTheme: DividerThemeData(
        thickness: 1,
        color: isDark ? AppColors.separatorDark : AppColors.separator,
        space: 0,
      ),

      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: arc.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        modalElevation: 0,
        shape: Border(top: BorderSide(color: arc.line, width: Arc.borderWidth)),
        showDragHandle: true,
        dragHandleColor: arc.line,
      ),

      dialogTheme: DialogThemeData(
        backgroundColor: arc.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: outlined(),
        titleTextStyle: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: arc.ink, fontFamily: f),
        contentTextStyle: TextStyle(fontSize: 15, color: arc.ink, height: 1.45, fontFamily: f),
      ),

      chipTheme: ChipThemeData(
        backgroundColor: arc.surface,
        selectedColor: arc.accent,
        disabledColor: arc.wash,
        checkmarkColor: arc.onAccent,
        secondarySelectedColor: arc.accent,
        labelStyle: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: arc.ink, fontFamily: f),
        secondaryLabelStyle: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: arc.onAccent, fontFamily: f),
        shape: outlined(),
        side: BorderSide(color: arc.line, width: Arc.borderWidth),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        showCheckmark: false,
        elevation: 0,
        pressElevation: 0,
      ),

      listTileTheme: ListTileThemeData(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16),
        minVerticalPadding: 12,
        iconColor: arc.ink,
        textColor: arc.ink,
        shape: const RoundedRectangleBorder(borderRadius: _sharp),
        selectedColor: arc.onAccent,
        selectedTileColor: arc.accent,
      ),

      snackBarTheme: SnackBarThemeData(
        backgroundColor: arc.band,
        contentTextStyle: TextStyle(color: AppColors.onBand, fontSize: 14, fontWeight: FontWeight.w500, fontFamily: f),
        actionTextColor: arc.accent,
        elevation: 0,
        shape: outlined(arc.accent),
        behavior: SnackBarBehavior.floating,
        insetPadding: const EdgeInsets.all(16),
      ),

      tabBarTheme: TabBarThemeData(
        labelColor: arc.ink,
        unselectedLabelColor: arc.inkSoft,
        indicatorColor: arc.mid,
        indicatorSize: TabBarIndicatorSize.tab,
        dividerColor: isDark ? AppColors.separatorDark : AppColors.separator,
        labelStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, fontFamily: f),
        unselectedLabelStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, fontFamily: f),
        overlayColor: WidgetStatePropertyAll(arc.wash),
      ),

      // Spinners take `mid`. Electric green on white is 1.9:1 — a spinner the
      // user cannot see is worse than no spinner.
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: arc.mid,
        linearTrackColor: arc.wash,
        circularTrackColor: Colors.transparent,
        linearMinHeight: 6,
      ),

      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected) ? arc.accent : arc.surface,
        ),
        checkColor: WidgetStatePropertyAll(arc.onAccent),
        side: BorderSide(color: arc.line, width: Arc.borderWidth),
        shape: const RoundedRectangleBorder(borderRadius: _sharp),
      ),

      radioTheme: RadioThemeData(
        fillColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected) ? arc.mid : arc.line,
        ),
      ),

      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected) ? arc.onAccent : arc.line,
        ),
        trackColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected) ? arc.accent : arc.wash,
        ),
        trackOutlineColor: WidgetStatePropertyAll(arc.line),
        trackOutlineWidth: const WidgetStatePropertyAll(Arc.borderWidth),
      ),

      sliderTheme: SliderThemeData(
        activeTrackColor: arc.mid,
        inactiveTrackColor: arc.wash,
        thumbColor: arc.accent,
        overlayColor: arc.accent.withValues(alpha: 0.2),
      ),

      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(
          color: arc.band,
          border: Border.all(color: arc.accent, width: Arc.borderWidth),
          borderRadius: _sharp,
        ),
        textStyle: const TextStyle(color: AppColors.onBand, fontSize: 12, fontFamily: f),
      ),

      popupMenuTheme: PopupMenuThemeData(
        color: arc.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: outlined(),
        textStyle: TextStyle(color: arc.ink, fontSize: 15, fontFamily: f),
      ),

      textSelectionTheme: TextSelectionThemeData(
        cursorColor: arc.mid,
        selectionColor: arc.accent.withValues(alpha: 0.35),
        selectionHandleColor: arc.mid,
      ),

      iconTheme: IconThemeData(color: arc.ink, size: 22),
      primaryIconTheme: IconThemeData(color: arc.ink, size: 22),
    );
  }

  static ThemeData get light => _build(Arc.light, Brightness.light);
  static ThemeData get dark => _build(Arc.dark, Brightness.dark);
}
