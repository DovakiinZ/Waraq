import 'dart:io';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:ayman_academy_app/shared/models/certificate.dart';

class PdfService {
  static Future<void> generateAndShareCertificate(Certificate cert) async {
    final doc = pw.Document();
    final snapshot = cert.snapshotJson;
    final studentName = snapshot?.studentName ?? cert.studentName;
    final courseName = snapshot?.courseName ?? cert.courseName;
    final teacherName = snapshot?.teacherName ?? '';
    final signerName = snapshot?.signerName ?? 'أ. أيمن';
    final signerRole = snapshot?.signerRole ?? 'مدير الأكاديمية';
    final completionDate = snapshot?.completionDate ?? cert.issuedAt;

    // The Waraq brand palette. These are the print counterparts of
    // `BrandColors` in lib/brand/brand_colors.dart — kept as literals because
    // `PdfColor` is a different colour type from `dart:ui`'s `Color`.
    //
    // The certificate keeps a rounded, classical treatment rather than the
    // arcade's square borders: it is a printed document, not app chrome, and
    // the arcade's radius-0 rule is about screens.
    final deepColor = PdfColor.fromHex('#0B3B2C'); // brand deep green
    final accentColor = PdfColor.fromHex('#1E6B52'); // brand green
    final sunColor = PdfColor.fromHex('#F4A340'); // brand sun
    final mutedColor = PdfColor.fromHex('#5E6E67'); // brand muted

    doc.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4.landscape,
        margin: const pw.EdgeInsets.all(0),
        build: (pw.Context context) {
          return pw.Container(
            decoration: pw.BoxDecoration(
              border: pw.Border.all(color: deepColor, width: 4),
            ),
            child: pw.Container(
              margin: const pw.EdgeInsets.all(8),
              decoration: pw.BoxDecoration(
                border: pw.Border.all(color: accentColor, width: 2),
              ),
              padding: const pw.EdgeInsets.all(40),
              child: pw.Column(
                mainAxisAlignment: pw.MainAxisAlignment.center,
                children: [
                  // Academy name
                  pw.Text(
                    'ورق أكاديمي',
                    style: pw.TextStyle(
                      fontSize: 16,
                      color: accentColor,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                  pw.SizedBox(height: 4),
                  pw.Text(
                    'Waraq Academy',
                    style: pw.TextStyle(fontSize: 10, color: accentColor),
                  ),
                  pw.SizedBox(height: 16),

                  // Title
                  pw.Text(
                    'شهادة إتمام',
                    style: pw.TextStyle(
                      fontSize: 28,
                      fontWeight: pw.FontWeight.bold,
                      color: deepColor,
                    ),
                  ),
                  pw.Text(
                    'Certificate of Completion',
                    style: pw.TextStyle(fontSize: 12, color: deepColor),
                  ),
                  pw.SizedBox(height: 24),

                  // Decorative line
                  pw.Container(
                    width: 80,
                    height: 2,
                    color: accentColor,
                  ),
                  pw.SizedBox(height: 24),

                  // Certifies
                  pw.Text(
                    'يُشهد بأن',
                    style: pw.TextStyle(fontSize: 12, color: mutedColor),
                  ),
                  pw.SizedBox(height: 8),

                  // Student name
                  pw.Text(
                    studentName,
                    style: pw.TextStyle(
                      fontSize: 30,
                      fontWeight: pw.FontWeight.bold,
                      color: deepColor,
                    ),
                  ),
                  pw.SizedBox(height: 16),

                  // Completed
                  pw.Text(
                    'قد أتم بنجاح مادة',
                    style: pw.TextStyle(fontSize: 12, color: mutedColor),
                  ),
                  pw.SizedBox(height: 8),

                  // Course name
                  pw.Text(
                    courseName,
                    style: pw.TextStyle(
                      fontSize: 20,
                      fontWeight: pw.FontWeight.bold,
                      color: accentColor,
                    ),
                  ),

                  // Score
                  if (cert.score != null) ...[
                    pw.SizedBox(height: 12),
                    pw.Container(
                      padding: const pw.EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                      decoration: pw.BoxDecoration(
                        // brand paper
                        color: PdfColor.fromHex('#F7F2E8'),
                        borderRadius: pw.BorderRadius.circular(12),
                        border: pw.Border.all(color: sunColor),
                      ),
                      child: pw.Text(
                        'الدرجة: ${cert.score!.toInt()}%',
                        style: pw.TextStyle(fontSize: 12, color: accentColor, fontWeight: pw.FontWeight.bold),
                      ),
                    ),
                  ],

                  pw.SizedBox(height: 24),
                  pw.Container(width: double.infinity, height: 1, color: PdfColor.fromHex('#C9E3D6')),
                  pw.SizedBox(height: 16),

                  // Footer
                  pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text('التاريخ', style: pw.TextStyle(fontSize: 9, color: mutedColor)),
                          pw.Text(completionDate, style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold)),
                        ],
                      ),
                      if (teacherName.isNotEmpty)
                        pw.Column(
                          children: [
                            pw.Text('المعلم', style: pw.TextStyle(fontSize: 9, color: mutedColor)),
                            pw.Text(teacherName, style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold)),
                          ],
                        ),
                      pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.end,
                        children: [
                          pw.Text(signerName, style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold)),
                          pw.Text(signerRole, style: pw.TextStyle(fontSize: 9, color: mutedColor)),
                        ],
                      ),
                    ],
                  ),

                  pw.SizedBox(height: 12),
                  pw.Text(
                    'رمز التحقق: ${cert.verificationCode}',
                    style: pw.TextStyle(fontSize: 8, color: mutedColor),
                  ),
                  pw.Text(
                    cert.verifyUrl,
                    style: pw.TextStyle(fontSize: 7, color: mutedColor),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );

    final bytes = await doc.save();
    final tempDir = await getTemporaryDirectory();
    final file = File('${tempDir.path}/certificate_${cert.id.substring(0, 8)}.pdf');
    await file.writeAsBytes(bytes);

    await SharePlus.instance.share(
      ShareParams(
        files: [XFile(file.path)],
        text: 'شهادة إتمام - $courseName',
      ),
    );
  }
}
