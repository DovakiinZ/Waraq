import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'app_colors.dart';

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
      headlineMedium: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, height: 1.4, fontFamily: f),
      bodyLarge: TextStyle(fontSize: 17, fontWeight: FontWeight.w400, height: 1.5, fontFamily: f),
      bodyMedium: TextStyle(fontSize: 15, fontWeight: FontWeight.w400, height: 1.45, fontFamily: f),
      bodySmall: TextStyle(fontSize: 13, fontWeight: FontWeight.w400, height: 1.4, fontFamily: f),
      labelLarge: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, height: 1.4, fontFamily: f),
      labelMedium: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, height: 1.3, fontFamily: f),
      labelSmall: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, height: 1.3, fontFamily: f),
    );
  }

  // ═══════════════════════════════════════════
  //  LIGHT THEME
  // ═══════════════════════════════════════════
  static ThemeData get light {
    final f = _ff;
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.light(
        primary: AppColors.primary,
        secondary: AppColors.accent,
        surface: AppColors.surface,
        onPrimary: AppColors.primaryForeground,
        outline: AppColors.border,
        tertiary: AppColors.accent,
      ),
      fontFamily: f,
      textTheme: _textTheme.apply(bodyColor: AppColors.ink, displayColor: AppColors.ink),
      scaffoldBackgroundColor: AppColors.background,

      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.ink,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.ink, fontFamily: f),
        systemOverlayStyle: const SystemUiOverlayStyle(
          statusBarBrightness: Brightness.light,
          statusBarIconBrightness: Brightness.dark,
          statusBarColor: Colors.transparent,
        ),
      ),

      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.inputFill,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.accent, width: 2)),
        errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.error, width: 1)),
        hintStyle: TextStyle(color: AppColors.inkMuted, fontSize: 15, fontFamily: f),
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.primaryForeground,
          elevation: 0,
          minimumSize: const Size(double.infinity, 50),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, fontFamily: f),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary,
          elevation: 0,
          minimumSize: const Size(double.infinity, 50),
          side: const BorderSide(color: AppColors.primary, width: 1.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, fontFamily: f),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.accent,
          textStyle: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, fontFamily: f),
        ),
      ),

      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.background,
        elevation: 0,
        height: 56,
        indicatorColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.primary, fontFamily: f);
          }
          return TextStyle(fontSize: 10, fontWeight: FontWeight.w400, color: AppColors.inkMuted, fontFamily: f);
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: AppColors.primary, size: 24);
          }
          return const IconThemeData(color: AppColors.inkMuted, size: 24);
        }),
      ),

      dividerTheme: const DividerThemeData(thickness: 0.5, color: AppColors.border, space: 0),

      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors.background,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
        showDragHandle: true,
        dragHandleColor: AppColors.border,
      ),

      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.background,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),

      chipTheme: ChipThemeData(
        backgroundColor: AppColors.secondary,
        selectedColor: AppColors.primary,
        labelStyle: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, fontFamily: f),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        side: BorderSide.none,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      ),

      listTileTheme: const ListTileThemeData(contentPadding: EdgeInsets.symmetric(horizontal: 16), minVerticalPadding: 12),

      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.primary,
        contentTextStyle: TextStyle(color: AppColors.primaryForeground, fontSize: 14, fontFamily: f),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        behavior: SnackBarBehavior.floating,
      ),

      tabBarTheme: TabBarThemeData(
        labelColor: AppColors.primary,
        unselectedLabelColor: AppColors.inkMuted,
        indicatorColor: AppColors.primary,
        labelStyle: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, fontFamily: f),
        unselectedLabelStyle: TextStyle(fontSize: 15, fontWeight: FontWeight.w400, fontFamily: f),
      ),
    );
  }

  // ═══════════════════════════════════════════
  //  DARK THEME
  // ═══════════════════════════════════════════
  static ThemeData get dark {
    final f = _ff;
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.dark(
        primary: AppColors.accentLight,
        secondary: AppColors.accent,
        surface: AppColors.surfaceDark,
        outline: AppColors.borderDark,
        tertiary: AppColors.accentLight,
      ),
      fontFamily: f,
      textTheme: _textTheme.apply(bodyColor: AppColors.inkDark, displayColor: AppColors.inkDark),
      scaffoldBackgroundColor: AppColors.backgroundDark,

      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.backgroundDark,
        foregroundColor: AppColors.inkDark,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.inkDark, fontFamily: f),
        systemOverlayStyle: const SystemUiOverlayStyle(
          statusBarBrightness: Brightness.dark,
          statusBarIconBrightness: Brightness.light,
          statusBarColor: Colors.transparent,
        ),
      ),

      cardTheme: CardThemeData(
        color: AppColors.surfaceDark,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.secondaryDark,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.accentLight, width: 2)),
        errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.error, width: 1)),
        hintStyle: TextStyle(color: AppColors.inkMuted.withValues(alpha: 0.6), fontSize: 15, fontFamily: f),
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.accentLight,
          foregroundColor: AppColors.primaryForeground,
          elevation: 0,
          minimumSize: const Size(double.infinity, 50),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, fontFamily: f),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.accentLight,
          elevation: 0,
          minimumSize: const Size(double.infinity, 50),
          side: const BorderSide(color: AppColors.accentLight, width: 1.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, fontFamily: f),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.accentLight,
          textStyle: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, fontFamily: f),
        ),
      ),

      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.surfaceDark,
        elevation: 0,
        height: 56,
        indicatorColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.accentLight, fontFamily: f);
          }
          return TextStyle(fontSize: 10, fontWeight: FontWeight.w400, color: AppColors.inkMuted, fontFamily: f);
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: AppColors.accentLight, size: 24);
          }
          return const IconThemeData(color: AppColors.inkMuted, size: 24);
        }),
      ),

      dividerTheme: const DividerThemeData(thickness: 0.5, color: AppColors.borderDark, space: 0),

      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors.surfaceDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
        showDragHandle: true,
        dragHandleColor: AppColors.borderDark,
      ),

      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.surfaceDark,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),

      chipTheme: ChipThemeData(
        backgroundColor: AppColors.secondaryDark,
        selectedColor: AppColors.accentLight,
        labelStyle: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, fontFamily: f),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        side: BorderSide.none,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      ),

      listTileTheme: const ListTileThemeData(contentPadding: EdgeInsets.symmetric(horizontal: 16), minVerticalPadding: 12),

      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.secondaryDark,
        contentTextStyle: TextStyle(color: AppColors.inkDark, fontSize: 14, fontFamily: f),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        behavior: SnackBarBehavior.floating,
      ),

      tabBarTheme: TabBarThemeData(
        labelColor: AppColors.accentLight,
        unselectedLabelColor: AppColors.inkMuted,
        indicatorColor: AppColors.accentLight,
        labelStyle: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, fontFamily: f),
        unselectedLabelStyle: TextStyle(fontSize: 15, fontWeight: FontWeight.w400, fontFamily: f),
      ),
    );
  }
}
