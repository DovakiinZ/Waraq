import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';

/// How to use Waraq, for students and teachers.
///
/// The Dart counterpart of `src/pages/Guide.tsx`. Keep the steps in step with
/// the web copy — a student who reads one and then the other should not find
/// two different products described.
///
/// One screen, two audiences, defaulting to whichever matches the signed-in
/// role. The app has no logged-out browsing, so unlike the web version there
/// is no "apply to teach" call to action at the end.
class GuideScreen extends ConsumerStatefulWidget {
  const GuideScreen({super.key});

  @override
  ConsumerState<GuideScreen> createState() => _GuideScreenState();
}

class _Step {
  final IconData icon;
  final String ar;
  final String en;
  final String bodyAr;
  final String bodyEn;
  final bool caution;
  const _Step(this.icon, this.ar, this.en, this.bodyAr, this.bodyEn, {this.caution = false});
}

const _studentSteps = <_Step>[
  _Step(Icons.storefront_outlined, '١. اختر مادتك', '1. Find your course',
      'افتح «المتجر» من القائمة. ستجد المواد المتاحة لمرحلتك مع اسم المعلم والسعر. اضغط على أي مادة لترى محتواها قبل الاشتراك.',
      'Open “Marketplace”. You will see the courses available for your stage with the teacher’s name and the price. Tap any course to see what is inside before you enrol.'),
  _Step(Icons.check_circle_outline, '٢. اشترك وادفع', '2. Enrol and pay',
      'اضغط «اشترك»، حوّل المبلغ عبر «شام كاش» وأدخل اسمك ورقم حسابك، ثم انتظر تأكيد المعلم. ستفتح المادة فور تأكيده.',
      'Tap “Enrol”, pay with Sham Cash, enter your name and account number, then wait for your teacher to confirm. The course opens as soon as they do.'),
  _Step(Icons.menu_book_outlined, '٣. ادرس الدرس', '3. Study the lesson',
      'افتح الدرس واقرأه حتى نهايته. شريط التقدم في الأعلى يحسب ما قرأته فعلاً والوقت الذي قضيته — لا مجرد التمرير للأسفل.',
      'Open the lesson and read to the end. The progress bar counts what you actually read and the time you spent — not just scrolling to the bottom.'),
  _Step(Icons.auto_awesome, '٤. استخدم الملخص الذكي', '4. Use the AI summary',
      'في أعلى كل درس ستجد «الملخص الذكي»: أهم النقاط وخلاصة مختصرة. يكتبه الذكاء الاصطناعي من محتوى الدرس نفسه، ولا يظهر إلا بعد أن يعتمده معلّمك.',
      'At the top of each lesson you will find the “AI summary”: key points and a short overview, written from the lesson’s own content. It only appears once your teacher approves it.'),
  _Step(Icons.slideshow_outlined, '٥. راجع كشرائح', '5. Revise as slides',
      'من داخل الملخص اضغط «عرض كشرائح» لتقرأه شريحة شريحة — مناسب للمراجعة السريعة قبل الاختبار. النسخة المطبوعة متاحة على الموقع.',
      'Inside the summary tap “View as slides” to read it one slide at a time — good for a quick review before a test. The printable version is on the website.'),
  _Step(Icons.workspace_premium_outlined, '٦. احصل على شهادتك', '6. Earn your certificate',
      'أكمل دروس المادة واجتز اختباراتها، ثم اطلب الشهادة من «شهاداتي». بعد اعتماد المعلم يمكنك تحميلها كملف PDF ومشاركتها.',
      'Finish the lessons and pass the quizzes, then request your certificate from “My Certificates”. Once approved you can download it as a PDF and share it.'),
];

const _teacherSteps = <_Step>[
  _Step(Icons.school_outlined, '١. أنشئ مادتك', '1. Create your course',
      'من «موادي» أنشئ مادة واختر لها المرحلة والسعر. المواد التي تنشئها هي وحدها التي تستطيع إضافة دروس إليها.',
      'From “My Subjects” create a course and set its stage and price. You can only add lessons to courses you own.'),
  _Step(Icons.article_outlined, '٢. أضف الدروس', '2. Add lessons',
      'افتح المادة ثم «درس جديد». أضف المحتوى على شكل مقاطع: نص، صورة، فيديو، مثال، تمرين، معادلة… ويمكنك ترتيبها.',
      'Open the course then “New Lesson”. Add content as blocks: text, image, video, example, exercise, equation… and reorder them.'),
  _Step(Icons.videocam_outlined, '٣. أضف فيديو (اختياري)', '3. Add a video (optional)',
      'ضع رابط يوتيوب في إعدادات الدرس. إذا تركته فارغاً سيعرض الدرس النص فقط، ولن يظهر أي مشغّل — وهذا طبيعي.',
      'Paste a YouTube link in the lesson settings. Leave it empty and the lesson shows text only, with no player — which is normal.'),
  _Step(Icons.auto_awesome, '٤. أنشئ الملخص الذكي', '4. Generate the AI summary',
      'من الموقع، داخل محرّر الدرس، اضغط «الملخص الذكي» ثم «إنشاء». يقرأ الذكاء الاصطناعي محتوى درسك فقط ولا يضيف معلومات من خارجه.',
      'On the website, inside the lesson editor, tap “AI summary” then “Generate”. It reads only your lesson’s content and never adds outside facts.'),
  _Step(Icons.verified_outlined, '٥. راجع ثم اعتمد', '5. Review, then approve',
      'اقرأ الملخص وعدّله، ثم احفظ واعتمد. لا يرى الطالب أي ملخص قبل اعتمادك. ستجد حالة الملخص بجانب كل درس في قائمة دروسك.',
      'Read it, edit it, then save and approve. Students see nothing until you approve. Each lesson in your list shows its summary state.'),
  _Step(Icons.warning_amber_outlined, 'راجع دائماً قبل الاعتماد', 'Always read before approving',
      'الذكاء الاصطناعي يخطئ أحياناً في الصياغة. أنت المسؤول عمّا يُنشر باسمك، ولهذا لا يصل أي ملخص للطلاب قبل اعتمادك.',
      'The AI sometimes gets wording wrong. What goes out under your name is your responsibility, which is why nothing reaches students before you approve it.',
      caution: true),
  _Step(Icons.receipt_long_outlined, '٦. أكّد المدفوعات', '6. Confirm payments',
      'عندما يشترك طالب ستجد طلبه في «الطلبات». تحقق من وصول المبلغ عبر شام كاش ثم اضغط «تأكيد» — عندها فقط تُفتح له المادة.',
      'When a student enrols, their order appears under “Orders”. Check the Sham Cash payment arrived, then tap “Confirm” — only then does the course open for them.'),
];

class _GuideScreenState extends ConsumerState<GuideScreen> {
  bool _teacherTab = false;
  bool _initialised = false;

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final arc = context.arc;

    if (!_initialised) {
      final role = ref.read(authProvider).profile?.role;
      _teacherTab = role == 'teacher' || role == 'super_admin';
      _initialised = true;
    }

    final steps = _teacherTab ? _teacherSteps : _studentSteps;
    final isAr = lang == 'ar';

    return Directionality(
      textDirection: isAr ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        backgroundColor: arc.bg,
        appBar: AppBar(
          backgroundColor: arc.bg,
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          foregroundColor: arc.ink,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
            onPressed: () => Navigator.of(context).pop(),
          ),
          title: Text(t('دليل الاستخدام', 'How to use'),
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: arc.ink)),
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          children: [
            Text(
              t('كيف تستخدم ورق أكاديمي', 'How to use Waraq Academy'),
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: arc.ink, height: 1.3),
            ),
            const SizedBox(height: 6),
            Text(
              t('دليل قصير يشرح كل ما تحتاجه — خطوة بخطوة.',
                  'A short guide to everything you need — step by step.'),
              style: TextStyle(fontSize: 14, color: arc.inkSoft),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                for (final isTeacher in [false, true]) ...[
                  Expanded(
                    child: ArcadeButton(
                      label: isTeacher ? t('للمعلم', 'For teachers') : t('للطالب', 'For students'),
                      icon: isTeacher ? Icons.school_outlined : Icons.menu_book_outlined,
                      variant: _teacherTab == isTeacher ? ArcadeVariant.solid : ArcadeVariant.outline,
                      onPressed: () => setState(() => _teacherTab = isTeacher),
                    ),
                  ),
                  if (!isTeacher) const SizedBox(width: 10),
                ],
              ],
            ),
            const SizedBox(height: 18),
            for (final step in steps) ...[
              ArcadeCard(
                padding: const EdgeInsets.all(14),
                fill: step.caution ? arc.wash : null,
                borderColor: step.caution ? arc.danger : null,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(step.icon, size: 20, color: step.caution ? arc.danger : arc.mid),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(isAr ? step.ar : step.en,
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: arc.ink)),
                          const SizedBox(height: 5),
                          Text(isAr ? step.bodyAr : step.bodyEn,
                              style: TextStyle(fontSize: 13, height: 1.6, color: arc.inkSoft)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
            ],
          ],
        ),
      ),
    );
  }
}
