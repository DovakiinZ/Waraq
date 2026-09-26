import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/core/utils/date_formatter.dart';
import 'package:ayman_academy_app/shared/models/certificate.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';

final teacherCertificatesProvider = FutureProvider<List<Certificate>>((ref) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return [];

  // Get teacher's subjects
  final subjects = await supabase.from('subjects').select('id').eq('teacher_id', userId);
  final subjectIds = (subjects as List).map((s) => s['id'] as String).toList();
  if (subjectIds.isEmpty) return [];

  final data = await supabase
      .from('certificates')
      .select('*')
      .inFilter('subject_id', subjectIds)
      .order('issued_at', ascending: false);

  return (data as List).map((e) => Certificate.fromJson(e as Map<String, dynamic>)).toList();
});

class TeacherCertificatesScreen extends ConsumerWidget {
  const TeacherCertificatesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final certsAsync = ref.watch(teacherCertificatesProvider);

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(title: Text(t('الشهادات', 'Certificates'))),
        body: certsAsync.when(
          loading: () => const LoadingShimmer(),
          error: (e, _) => Center(child: Text('$e')),
          data: (certs) {
            if (certs.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.workspace_premium, size: 64, color: AppColors.inkMuted),
                    const SizedBox(height: 16),
                    Text(t('لا توجد شهادات', 'No certificates'), style: const TextStyle(color: AppColors.inkMuted)),
                  ],
                ),
              );
            }

            final pending = certs.where((c) => c.status == 'pending_approval').toList();
            final issued = certs.where((c) => c.status == 'issued').toList();
            final other = certs.where((c) => c.status != 'pending_approval' && c.status != 'issued').toList();

            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(teacherCertificatesProvider),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (pending.isNotEmpty) ...[
                    Text(t('قيد المراجعة', 'Pending Approval'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    ...pending.map((c) => _CertCard(cert: c, t: t, lang: lang, ref: ref)),
                    const SizedBox(height: 24),
                  ],
                  if (issued.isNotEmpty) ...[
                    Text(t('صادرة', 'Issued'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    ...issued.map((c) => _CertCard(cert: c, t: t, lang: lang, ref: ref)),
                    const SizedBox(height: 24),
                  ],
                  if (other.isNotEmpty) ...[
                    Text(t('أخرى', 'Other'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    ...other.map((c) => _CertCard(cert: c, t: t, lang: lang, ref: ref)),
                  ],
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _CertCard extends StatelessWidget {
  final Certificate cert;
  final String Function(String, String) t;
  final String lang;
  final WidgetRef ref;

  const _CertCard({required this.cert, required this.t, required this.lang, required this.ref});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(cert.studentName, style: const TextStyle(fontWeight: FontWeight.w600))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: (cert.status == 'issued' ? AppColors.success : AppColors.warning).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.zero,
                  ),
                  child: Text(
                    cert.status == 'issued' ? t('صادرة', 'Issued') : t('قيد المراجعة', 'Pending'),
                    style: TextStyle(
                      fontSize: 11,
                      color: cert.status == 'issued' ? AppColors.success : AppColors.warning,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(cert.courseName, style: const TextStyle(fontSize: 13, color: AppColors.inkMuted)),
            if (cert.score != null)
              Text('${t("الدرجة", "Score")}: ${cert.score!.toInt()}%', style: const TextStyle(fontSize: 12, color: AppColors.inkMuted)),
            Text(formatDate(cert.issuedAt), style: const TextStyle(fontSize: 11, color: AppColors.inkMuted)),

            if (cert.status == 'pending_approval') ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () async {
                        try {
                          await supabase.rpc('admin_approve_certificate', params: {'p_certificate_id': cert.id});
                          ref.invalidate(teacherCertificatesProvider);
                        } catch (e) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'), backgroundColor: AppColors.error));
                          }
                        }
                      },
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
                      child: Text(t('الموافقة', 'Approve')),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () async {
                        try {
                          await supabase.rpc('admin_revoke_certificate', params: {'p_certificate_id': cert.id});
                          ref.invalidate(teacherCertificatesProvider);
                        } catch (e) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'), backgroundColor: AppColors.error));
                          }
                        }
                      },
                      style: OutlinedButton.styleFrom(side: const BorderSide(color: AppColors.error)),
                      child: Text(t('رفض', 'Reject'), style: const TextStyle(color: AppColors.error)),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
