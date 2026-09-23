import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final connectivityProvider = StreamProvider<List<ConnectivityResult>>((ref) async* {
  final connectivity = Connectivity();
  // onConnectivityChanged only emits on *transitions*, so an app that is
  // launched while already offline would otherwise never see the offline
  // state. Emit the current status first, then follow the change stream.
  try {
    yield await connectivity.checkConnectivity();
  } catch (_) {
    // Platform check failed - fall through to the change stream and let
    // isOnlineProvider's optimistic default apply.
  }
  yield* connectivity.onConnectivityChanged;
});

final isOnlineProvider = Provider<bool>((ref) {
  final connectivity = ref.watch(connectivityProvider);
  return connectivity.when(
    data: (results) => !results.contains(ConnectivityResult.none),
    loading: () => true,
    error: (_, _) => true,
  );
});
