class Env {
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
  static const webAppUrl = String.fromEnvironment('WEB_APP_URL', defaultValue: 'https://www.waraq.academy');
  static const oneSignalAppId = String.fromEnvironment('ONESIGNAL_APP_ID');

  /// Returns true if all required environment variables are configured.
  static bool get isConfigured => supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}
