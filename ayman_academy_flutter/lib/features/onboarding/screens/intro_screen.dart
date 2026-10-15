import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:ayman_academy_app/core/router/routes.dart';
import 'package:ayman_academy_app/features/onboarding/data/intro_prefs.dart';
import 'package:ayman_academy_app/features/onboarding/widgets/chalkboard.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';

/// The first thing a new install shows: four slides on a classroom board,
/// then into sign-in.
///
/// Shown once. [IntroPrefs] records that it has been seen, and the router
/// sends later launches straight to the login screen.
///
/// **Swipe direction is free.** The whole screen sits inside the app's
/// `Directionality`, and a [PageView] inside an RTL directionality reverses
/// itself — so in Arabic the reader swipes left-to-right to advance and in
/// English the other way, with no direction logic written here. Only the
/// back/next *arrows* need flipping, which is why [_arrowForward] exists.
class IntroScreen extends ConsumerStatefulWidget {
  /// Where "Skip" and "Let's start" go. Defaults to `context.go(login)`.
  ///
  /// Injectable because go_router's `context.go` asserts when no `GoRouter` is
  /// in scope, which is exactly how the register and reset-password screens
  /// used to crash in tests. A widget test passes its own callback instead of
  /// standing up a router.
  final VoidCallback? onFinish;

  const IntroScreen({super.key, this.onFinish});

  @override
  ConsumerState<IntroScreen> createState() => _IntroScreenState();
}

class _IntroScreenState extends ConsumerState<IntroScreen> {
  final _controller = PageController();
  int _page = 0;

  static const _slideCount = 4;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _finish() async {
    await IntroPrefs.markSeen();
    if (!mounted) return;
    final onFinish = widget.onFinish;
    if (onFinish != null) {
      onFinish();
    } else {
      context.go(Routes.login);
    }
  }

  void _next() {
    if (_page >= _slideCount - 1) {
      _finish();
      return;
    }
    _controller.nextPage(
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeOut,
    );
  }

  IconData _arrowForward(TextDirection dir) =>
      dir == TextDirection.rtl ? Icons.arrow_back_rounded : Icons.arrow_forward_rounded;

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final dir = lang == 'ar' ? TextDirection.rtl : TextDirection.ltr;
    final isLast = _page == _slideCount - 1;

    return Directionality(
      textDirection: dir,
      child: Scaffold(
        backgroundColor: Chalkboard.board,
        body: BoardSurface(
          child: SafeArea(
            child: Column(
              children: [
                // Skip, on every slide but the last — the last one ends in a
                // single clear action instead.
                SizedBox(
                  height: 48,
                  child: Align(
                    alignment: AlignmentDirectional.centerEnd,
                    child: isLast
                        ? const SizedBox.shrink()
                        : TextButton(
                            onPressed: _finish,
                            child: Text(
                              t('تخطّي', 'Skip'),
                              style: const TextStyle(
                                color: Chalkboard.chalkSoft,
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                  ),
                ),

                Expanded(
                  child: PageView(
                    controller: _controller,
                    onPageChanged: (i) => setState(() => _page = i),
                    children: [
                      _SlideBrand(t: t),
                      _SlideStages(t: t),
                      _SlideLessons(t: t),
                      _SlideCertificate(t: t),
                    ],
                  ),
                ),

                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          ChalkDots(count: _slideCount, active: _page),
                          const Spacer(),
                          Icon(
                            _arrowForward(dir),
                            size: 18,
                            color: Chalkboard.chalkSoft.withValues(alpha: .55),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      ChalkButton(
                        label: isLast ? t('هيّا نبدأ', "Let's start") : t('التالي', 'Next'),
                        onPressed: _next,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Shared frame for a slide: artwork on top, then title and body.
class _Slide extends StatelessWidget {
  final Widget art;
  final String title;
  final String body;
  const _Slide({required this.art, required this.title, required this.body});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: Center(child: art)),
          const SizedBox(height: 20),
          Text(
            title,
            style: const TextStyle(
              color: Chalkboard.chalk,
              fontSize: 26,
              fontWeight: FontWeight.w700,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 6),
          const ChalkUnderline(width: 128),
          const SizedBox(height: 12),
          Text(
            body,
            style: const TextStyle(
              color: Chalkboard.chalkSoft,
              fontSize: 15,
              height: 1.65,
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

typedef _T = String Function(String ar, String en);

class _SlideBrand extends StatelessWidget {
  final _T t;
  const _SlideBrand({required this.t});

  @override
  Widget build(BuildContext context) => _Slide(
        art: const ChalkMark(size: 148),
        title: t('ورقة بعد ورقة.. نكبر', 'Page by page, we grow'),
        body: t(
          'منصّة سورية لدروس المدرسة — شرح من معلّمين حقيقيين، على هاتفك.',
          'A Syrian platform for school lessons — taught by real teachers, on your phone.',
        ),
      );
}

class _SlideStages extends StatelessWidget {
  final _T t;
  const _SlideStages({required this.t});

  @override
  Widget build(BuildContext context) {
    // The four real stages, in their database order. "Primary" is circled
    // only as an example of selection — the intro asks for nothing.
    final stages = [
      (t('كتاب تمهيدي', 'Kindergarten'), false),
      (t('ابتدائي', 'Primary'), true),
      (t('متوسط', 'Middle'), false),
      (t('ثانوي', 'Secondary'), false),
    ];

    return _Slide(
      art: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final (name, circled) in stages)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 9),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const ChalkDash(),
                  const SizedBox(width: 12),
                  ChalkCircled(
                    active: circled,
                    child: Text(
                      name,
                      style: TextStyle(
                        color: Chalkboard.chalk,
                        fontSize: 18,
                        fontWeight: circled ? FontWeight.w700 : FontWeight.w400,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
      title: t('مرحلتك وحدها', 'Only your stage'),
      body: t(
        'اخترها مرة واحدة، فتظهر لك موادّ صفّك فقط — بلا بحث ولا تشتّت.',
        'Pick it once, and you only ever see courses for your own level — no searching, no noise.',
      ),
    );
  }
}

class _SlideLessons extends StatelessWidget {
  final _T t;
  const _SlideLessons({required this.t});

  @override
  Widget build(BuildContext context) {
    // Content types that genuinely exist in the lesson editor.
    final rows = [
      (Icons.subject_rounded, t('شرح الدرس', 'Lesson text')),
      (Icons.play_circle_outline_rounded, t('فيديو', 'Video')),
      (Icons.edit_note_rounded, t('تمرين', 'Exercise')),
      (Icons.attach_file_rounded, t('ورقة عمل', 'Worksheet')),
    ];

    return _Slide(
      art: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final (icon, label) in rows)
            Container(
              margin: const EdgeInsets.symmetric(vertical: 5),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
              decoration: BoxDecoration(
                border: Border.all(color: Chalkboard.chalkSoft.withValues(alpha: .5), width: 2),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, size: 18, color: Chalkboard.chalkSoft),
                  const SizedBox(width: 10),
                  Text(label, style: const TextStyle(color: Chalkboard.chalk, fontSize: 14)),
                ],
              ),
            ),
          const SizedBox(height: 12),
          // Progress, the one thing that is always running in the background.
          SizedBox(
            width: 180,
            height: 12,
            child: Stack(
              children: [
                Container(
                  decoration: BoxDecoration(
                    border: Border.all(color: Chalkboard.chalkSoft.withValues(alpha: .5), width: 2),
                  ),
                ),
                FractionallySizedBox(
                  widthFactor: .62,
                  child: Container(color: Chalkboard.accent),
                ),
              ],
            ),
          ),
        ],
      ),
      title: t('دروس تُفهم', 'Lessons that explain'),
      body: t(
        'شرح وفيديو وتمارين وأوراق عمل. ويُحفظ تقدّمك تلقائياً لتُكمل من حيث توقّفت.',
        'Text, video, exercises and worksheets. Your progress saves itself, so you pick up where you stopped.',
      ),
    );
  }
}

class _SlideCertificate extends StatelessWidget {
  final _T t;
  const _SlideCertificate({required this.t});

  @override
  Widget build(BuildContext context) => _Slide(
        art: CustomPaint(
          size: const Size(190, 140),
          painter: const _CertificatePainter(),
        ),
        title: t('شهادة عند الإنجاز', 'A certificate at the end'),
        body: t(
          'أنهِ المادة واحصل على شهادة يمكن لأي أحد التحقّق منها برمز.',
          'Finish a course and earn a certificate anyone can verify by code.',
        ),
      );
}

/// A certificate sketched on the board: a framed sheet, three ruled lines and
/// a ticked seal.
class _CertificatePainter extends CustomPainter {
  const _CertificatePainter();

  @override
  void paint(Canvas canvas, Size size) {
    final stroke = Paint()
      ..color = Chalkboard.chalk
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..strokeWidth = 2.6;

    final sheet = Rect.fromLTWH(size.width * .08, size.height * .10,
        size.width * .78, size.height * .70);
    canvas.drawRect(sheet, stroke);

    final line = Paint()
      ..color = Chalkboard.chalkSoft
      ..strokeWidth = 2.2
      ..strokeCap = StrokeCap.round;
    for (var i = 0; i < 3; i++) {
      final y = sheet.top + sheet.height * (.26 + i * .20);
      canvas.drawLine(
        Offset(sheet.left + 18, y),
        Offset(sheet.left + sheet.width * (i == 2 ? .52 : .78), y),
        line,
      );
    }

    // The seal, in accent so the eye lands on the thing being earned.
    final sealCentre = Offset(size.width * .78, size.height * .70);
    final seal = Paint()
      ..color = Chalkboard.accent
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.8
      ..strokeCap = StrokeCap.round;
    canvas.drawCircle(sealCentre, size.width * .115, seal);
    final tick = Path()
      ..moveTo(sealCentre.dx - 9, sealCentre.dy)
      ..lineTo(sealCentre.dx - 2, sealCentre.dy + 7)
      ..lineTo(sealCentre.dx + 10, sealCentre.dy - 8);
    canvas.drawPath(tick, seal..strokeWidth = 3.2);
  }

  @override
  bool shouldRepaint(_CertificatePainter old) => false;
}
