import 'package:onesignal_flutter/onesignal_flutter.dart';
import 'package:ayman_academy_app/core/env.dart';

class NotificationService {
  static Function(String route)? _navigateCallback;

  static Future<void> initialize() async {
    if (Env.oneSignalAppId.isEmpty) return;
    OneSignal.initialize(Env.oneSignalAppId);
    // NOTE: permission is deliberately NOT requested here. Prompting on first
    // launch, before the user has even signed in, gets denied most of the time
    // and the Android 13+ prompt is one-shot. We ask after sign-in instead.
  }

  static Future<void> login(String userId) async {
    if (Env.oneSignalAppId.isEmpty) return;
    await OneSignal.login(userId);
    // Ask once we know who the user is and there is something worth notifying
    // them about. No-op if they already answered the prompt.
    try {
      await OneSignal.Notifications.requestPermission(true);
    } catch (_) {
      // Permission prompt is best-effort; never block sign-in on it.
    }
  }

  static Future<void> logout() async {
    if (Env.oneSignalAppId.isEmpty) return;
    await OneSignal.logout();
  }

  static void setupHandlers({
    required Function(String route) onNavigate,
  }) {
    _navigateCallback = onNavigate;

    OneSignal.Notifications.addClickListener((event) {
      final data = event.notification.additionalData;
      if (data == null || _navigateCallback == null) return;

      final type = data['type'] as String? ?? '';
      switch (type) {
        case 'new_message':
          final senderId = data['sender_id'] as String?;
          if (senderId != null) {
            _navigateCallback!('/student/messages/$senderId');
          }
          break;
        case 'announcement':
          _navigateCallback!('/student');
          break;
        case 'certificate_issued':
          final certId = data['certificate_id'] as String?;
          if (certId != null) {
            _navigateCallback!('/student/certificates/$certId');
          } else {
            _navigateCallback!('/student/certificates');
          }
          break;
        case 'order_confirmed':
        case 'order_rejected':
          _navigateCallback!('/student/subjects');
          break;
        case 'new_order':
          _navigateCallback!('/teacher/orders');
          break;
        default:
          break;
      }
    });
  }
}
