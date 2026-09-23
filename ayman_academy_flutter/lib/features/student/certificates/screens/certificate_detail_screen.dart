import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:share_plus/share_plus.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/services/pdf_service.dart';
import 'package:ayman_academy_app/core/utils/date_formatter.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';
import 'package:ayman_academy_app/features/student/certificates/providers/certificates_provider.dart';

class CertificateDetailScreen extends ConsumerWidget {
  final String certId;
  const CertificateDetailScreen({super.key, required this.certId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final certAsync = ref.watch(certificateDetailProvider(certId));

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(
          title: Text(t('تفاصيل الشهادة', 'Certificate Details')),
          actions: [
            certAsync.whenOrNull(
              data: (cert) {
                if (cert == null || cert.status != 'issued') return const SizedBox.shrink();
                return IconButton(
                  icon: const Icon(Icons.share),
                  onPressed: () {
                    SharePlus.instance.share(
                      ShareParams(text: '${t("شهادة إتمام", "Certificate of Completion")} - ${cert.courseName}\n${cert.verifyUrl}'),
                    );
                  },
                );
              },
            ) ?? const SizedBox.shrink(),
          ],
        ),
        body: certAsync.when(
          loading: () => const LoadingShimmer(),
          error: (e, _) => Center(child: Text('$e')),
          data: (cert) {
            if (cert == null) return Center(child: Text(t('الشهادة غير موجودة', 'Certificate not found')));

            final snapshot = cert.snapshotJson;
            final studentName = snapshot?.studentName ?? cert.studentName;
            final courseName = snapshot?.courseName ?? cert.courseName;
            final teacherName = snapshot?.teacherName ?? '';
            final signerName = snapshot?.signerName ?? 'أ. أيمن';
            final signerRole = snapshot?.signerRole ?? t('مدير الأكاديمية', 'Academy Director');

            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // Certificate card
                  Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.primary, width: 3),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.1),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Container(
                      margin: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.gold, width: 1.5),
                      ),
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        children: [
                          // Academy name
                          Text(
                            t('ورق أكاديمي التعليمية', 'Ayman Educational Academy'),
                            style: TextStyle(
                              fontSize: 14,
                              color: AppColors.gold,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 1.2,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            t('شهادة إتمام', 'Certificate of Completion'),
                            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primary),
                          ),
                          const SizedBox(height: 20),

                          // Decorative line
                          Container(height: 2, width: 60, color: AppColors.gold),
                          const SizedBox(height: 20),

                          // Student name
                          Text(
                            t('يُشهد بأن', 'This certifies that'),
                            style: const TextStyle(fontSize: 12, color: AppColors.inkMuted),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            studentName,
                            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.primary),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 16),

                          // Course
                          Text(
                            t('قد أتم بنجاح مادة', 'has successfully completed'),
                            style: const TextStyle(fontSize: 12, color: AppColors.inkMuted),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            courseName,
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.primaryLight),
                            textAlign: TextAlign.center,
                          ),

                          // Score
                          if (cert.score != null) ...[
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                              decoration: BoxDecoration(
                                color: AppColors.gold.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                '${t("الدرجة", "Score")}: ${cert.score!.toInt()}%',
                                style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.gold),
                              ),
                            ),
                          ],

                          const SizedBox(height: 20),
                          Container(height: 1, color: AppColors.border),
                          const SizedBox(height: 16),

                          // Date and teacher
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(t('التاريخ', 'Date'), style: const TextStyle(fontSize: 10, color: AppColors.inkMuted)),
                                  Text(formatDate(cert.issuedAt), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(signerName, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                  Text(signerRole, style: const TextStyle(fontSize: 10, color: AppColors.inkMuted)),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Status badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: _statusColor(cert.status).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(_statusIcon(cert.status), size: 18, color: _statusColor(cert.status)),
                        const SizedBox(width: 6),
                        Text(
                          _statusLabel(cert.status, t),
                          style: TextStyle(fontWeight: FontWeight.w600, color: _statusColor(cert.status)),
                        ),
                      ],
                    ),
                  ),

                  // QR Code for issued certificates
                  if (cert.status == 'issued') ...[
                    const SizedBox(height: 24),
                    Text(t('رمز التحقق', 'Verification QR'), style: const TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: QrImageView(
                        data: cert.verifyUrl,
                        version: QrVersions.auto,
                        size: 180,
                        backgroundColor: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextButton.icon(
                      onPressed: () => launchUrl(Uri.parse(cert.verifyUrl), mode: LaunchMode.externalApplication),
                      icon: const Icon(Icons.open_in_browser, size: 18),
                      label: Text(t('فتح رابط التحقق', 'Open verify link')),
                    ),
                    const SizedBox(height: 8),
                    ElevatedButton.icon(
                      onPressed: () => PdfService.generateAndShareCertificate(cert),
                      icon: const Icon(Icons.picture_as_pdf),
                      label: Text(t('تحميل ومشاركة PDF', 'Download & Share PDF')),
                    ),
                  ],

                  // Info
                  if (teacherName.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    ListTile(
                      leading: const Icon(Icons.person, color: AppColors.primary),
                      title: Text(t('المعلم', 'Teacher')),
                      subtitle: Text(teacherName),
                    ),
                  ],

                  Text(
                    '${t("رقم التحقق", "Verification code")}: ${cert.verificationCode}',
                    style: const TextStyle(fontSize: 11, color: AppColors.inkMuted),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'issued': return AppColors.success;
      case 'pending_approval': return AppColors.warning;
      case 'revoked': return AppColors.error;
      default: return AppColors.inkMuted;
    }
  }

  IconData _statusIcon(String status) {
    switch (status) {
      case 'issued': return Icons.verified;
      case 'pending_approval': return Icons.pending;
      case 'revoked': return Icons.block;
      default: return Icons.help_outline;
    }
  }

  String _statusLabel(String status, String Function(String, String) t) {
    switch (status) {
      case 'issued': return t('صادرة', 'Issued');
      case 'pending_approval': return t('قيد المراجعة', 'Pending Approval');
      case 'eligible': return t('مؤهل', 'Eligible');
      case 'revoked': return t('ملغية', 'Revoked');
      default: return t('مسودة', 'Draft');
    }
  }
}
