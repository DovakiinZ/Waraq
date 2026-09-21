# Flutter
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Supabase / GoTrue
-keep class io.supabase.** { *; }
-dontwarn io.supabase.**

# Keep Kotlin metadata
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**

# Play Core / deferred components.
# The Flutter embedding references com.google.android.play.core.* for deferred
# component (split install) support. This app does not use deferred components
# and does not depend on Play Core, so R8 fails the release build with
# "Missing class com.google.android.play.core.splitcompat.SplitCompatApplication"
# and friends. Tell R8 these absences are expected.
-dontwarn com.google.android.play.core.**
-keep class com.google.android.play.core.** { *; }

# OneSignal keeps its receivers/services by reflection.
-keep class com.onesignal.** { *; }
-dontwarn com.onesignal.**
