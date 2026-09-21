import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/shared/models/profile.dart';
import 'package:ayman_academy_app/features/auth/data/auth_repository.dart';
import 'package:ayman_academy_app/shared/services/notification_service.dart';

enum AuthStatus { loading, authenticated, unauthenticated }

/// Raised when the credentials are valid but no matching `profiles` row can be
/// loaded. Previously this dropped the user back on the login screen with no
/// explanation at all.
class ProfileMissingException implements Exception {
  const ProfileMissingException();

  @override
  String toString() =>
      'تعذّر تحميل ملفك الشخصي. تواصل مع الدعم.\nCould not load your profile. Please contact support.';
}

class AuthState {
  final AuthStatus status;
  final Profile? profile;

  const AuthState({
    this.status = AuthStatus.loading,
    this.profile,
  });

  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isStudent => profile?.role == 'student';
  bool get isTeacher => profile?.role == 'teacher';
  bool get isAdmin => profile?.role == 'super_admin';
  bool get needsOnboarding => isStudent && (profile?.studentStage == null);

  AuthState copyWith({AuthStatus? status, Profile? profile}) {
    return AuthState(
      status: status ?? this.status,
      profile: profile ?? this.profile,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repo;
  StreamSubscription? _authSub;

  AuthNotifier(this._repo) : super(const AuthState()) {
    _init();
  }

  void _init() {
    _authSub = _repo.authStateChanges.listen((event) async {
      if (event.session != null) {
        final userId = event.session!.user.id;
        Profile? profile;
        try {
          profile = await _repo.fetchProfile(userId);
        } catch (_) {
          // Transport failure. Keep an already-authenticated session rather
          // than bouncing the user to the login screen on a flaky connection.
          if (state.isAuthenticated) return;
          profile = null;
        }
        if (profile != null) {
          // Associate this device with the user for targeted push.
          await NotificationService.login(userId);
          state = AuthState(status: AuthStatus.authenticated, profile: profile);
        } else {
          state = const AuthState(status: AuthStatus.unauthenticated);
        }
      } else {
        await NotificationService.logout();
        state = const AuthState(status: AuthStatus.unauthenticated);
      }
    });
    _checkCurrentSession();
  }

  Future<void> _checkCurrentSession() async {
    final session = _repo.currentSession;
    if (session != null) {
      Profile? profile;
      try {
        profile = await _repo.fetchProfile(session.user.id);
      } catch (_) {
        profile = null;
      }
      if (profile != null) {
        // Re-associate on session restore (app relaunch).
        await NotificationService.login(session.user.id);
        state = AuthState(status: AuthStatus.authenticated, profile: profile);
        return;
      }
    }
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  Future<void> signIn(String email, String password) async {
    final res = await _repo.signIn(email, password);
    final userId = res.user?.id;
    if (userId == null) throw const ProfileMissingException();

    // Confirm the profile row is reachable *before* reporting success, so the
    // caller can show a real message instead of the login screen silently
    // reappearing.
    final profile = await _repo.fetchProfile(userId);
    if (profile == null) {
      await _repo.signOut();
      throw const ProfileMissingException();
    }
  }

  Future<void> signUp({
    required String email,
    required String password,
    required String fullName,
  }) async {
    await _repo.signUp(email: email, password: password, fullName: fullName);
  }

  Future<void> signOut() async {
    await NotificationService.logout();
    await _repo.signOut();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  Future<void> resetPassword(String email) async {
    await _repo.resetPassword(email);
  }

  Future<void> refreshProfile() async {
    final user = _repo.currentUser;
    if (user == null) return;
    final profile = await _repo.fetchProfile(user.id);
    if (profile != null) {
      state = AuthState(status: AuthStatus.authenticated, profile: profile);
    }
  }

  @override
  void dispose() {
    _authSub?.cancel();
    super.dispose();
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository();
});

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.read(authRepositoryProvider));
});
