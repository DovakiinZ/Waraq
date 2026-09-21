import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/shared/models/profile.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthRepository {
  Future<AuthResponse> signIn(String email, String password) async {
    return await supabase.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }

  Future<AuthResponse> signUp({
    required String email,
    required String password,
    required String fullName,
  }) async {
    return await supabase.auth.signUp(
      email: email,
      password: password,
      data: {'full_name': fullName},
    );
  }

  Future<void> signOut() async {
    await supabase.auth.signOut();
  }

  Future<void> resetPassword(String email) async {
    await supabase.auth.resetPasswordForEmail(email);
  }

  /// Returns null only when the profile row genuinely does not exist (or is
  /// hidden by RLS). Network/transport failures are rethrown so callers can
  /// tell "no account" apart from "no signal" instead of silently signing out.
  Future<Profile?> fetchProfile(String userId) async {
    final data = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
    if (data == null) return null;
    return Profile.fromJson(data);
  }

  User? get currentUser => supabase.auth.currentUser;
  Session? get currentSession => supabase.auth.currentSession;
  Stream<AuthState> get authStateChanges => supabase.auth.onAuthStateChange;
}
