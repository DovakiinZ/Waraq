import 'package:hive_flutter/hive_flutter.dart';

/// Whether this device has already seen the first-run intro.
///
/// Lives in the same `settings` box as language and theme (opened by
/// `CacheService.init`), because it is the same kind of thing: a per-device UI
/// preference, not account data. Nothing server-side needs to know, and a
/// signed-in user never reaches the intro anyway.
///
/// Reads are defensive. The router calls [seen] on every redirect, and a
/// redirect that throws would strand the app on a blank screen — so a missing
/// or unopened box is treated as "not seen", which merely shows the intro
/// once more rather than breaking navigation.
class IntroPrefs {
  IntroPrefs._();

  static const _boxName = 'settings';
  static const _key = 'intro_seen';

  static bool get seen {
    try {
      if (!Hive.isBoxOpen(_boxName)) return false;
      return Hive.box(_boxName).get(_key, defaultValue: false) as bool;
    } catch (_) {
      return false;
    }
  }

  static Future<void> markSeen() async {
    try {
      if (!Hive.isBoxOpen(_boxName)) return;
      await Hive.box(_boxName).put(_key, true);
    } catch (_) {
      // Preference just does not persist; the user sees the intro again.
    }
  }

  /// Test seam — lets a test replay a first run without reopening Hive.
  static Future<void> reset() async {
    try {
      if (!Hive.isBoxOpen(_boxName)) return;
      await Hive.box(_boxName).delete(_key);
    } catch (_) {}
  }
}
