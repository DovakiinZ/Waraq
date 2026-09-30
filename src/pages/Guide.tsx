/**
 * /guide — how to use Waraq, for students and for teachers.
 *
 * One page, two audiences, tabbed. Deliberately NOT two routes: most of the
 * traffic here is a teacher who has just been given an account and does not
 * yet know which role's instructions apply to them, and a student who lands on
 * a shared link. Defaults to whichever tab matches the signed-in role.
 *
 * Wrapped in Layout so it inherits the arcade public shell and works
 * logged-out — a teacher being recruited can read it before they have an
 * account.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    BookOpen, GraduationCap, Sparkles, Printer, Presentation, ShoppingCart,
    CheckCircle2, MessageSquare, Award, FileText, Video, AlertTriangle,
} from 'lucide-react';

import Layout from '@/components/layout/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Step {
    icon: typeof BookOpen;
    title: [string, string];
    body: [string, string];
    /** Rendered as a warning rather than a step. */
    caution?: boolean;
}

const STUDENT_STEPS: Step[] = [
    {
        icon: ShoppingCart,
        title: ['١. اختر مادتك', '1. Find your course'],
        body: [
            'افتح «المتجر» من القائمة. ستجد المواد المتاحة لمرحلتك الدراسية مع اسم المعلم والسعر. اضغط على أي مادة لترى محتواها قبل الاشتراك.',
            'Open “Marketplace” from the menu. You will see the courses available for your school stage with the teacher’s name and the price. Tap any course to see what is inside before you enrol.',
        ],
    },
    {
        icon: CheckCircle2,
        title: ['٢. اشترك وادفع', '2. Enrol and pay'],
        body: [
            'بعد اختيار المادة اضغط «اشترك». حوّل المبلغ عبر «شام كاش» وأدخل اسمك ورقم حسابك، ثم انتظر تأكيد المعلم. ستفتح المادة فور تأكيده.',
            'Choose the course and tap “Enrol”. Pay with Sham Cash, enter your name and account number, then wait for your teacher to confirm. The course opens as soon as they do.',
        ],
    },
    {
        icon: BookOpen,
        title: ['٣. ادرس الدرس', '3. Study the lesson'],
        body: [
            'افتح الدرس واقرأه حتى نهايته. شريط التقدم في الأعلى يمتلئ كلما قرأت أكثر — وهو يحسب المحتوى الذي قرأته فعلاً والوقت الذي قضيته، لا مجرد التمرير للأسفل.',
            'Open the lesson and read to the end. The progress bar fills as you go — it counts the content you actually read and the time you spent, not just scrolling to the bottom.',
        ],
    },
    {
        icon: Sparkles,
        title: ['٤. استخدم الملخص الذكي', '4. Use the AI summary'],
        body: [
            'في أعلى كل درس ستجد «الملخص الذكي»: أهم النقاط وخلاصة مختصرة. يكتبه الذكاء الاصطناعي من محتوى الدرس نفسه، ولا يظهر لك إلا بعد أن يراجعه معلّمك ويعتمده.',
            'At the top of each lesson you will find the “AI summary”: the key points and a short overview. It is written from the lesson’s own content, and only appears after your teacher has reviewed and approved it.',
        ],
    },
    {
        icon: Printer,
        title: ['٥. اطبع أو راجع كشرائح', '5. Print it, or revise as slides'],
        body: [
            'من داخل الملخص: «نسخة للطباعة» تعطيك ورقة مرتبة يمكنك طباعتها أو حفظها PDF للمراجعة بدون إنترنت، و«عرض كشرائح» يعرضه شريحة شريحة — مناسب للمراجعة السريعة قبل الاختبار.',
            'From inside the summary: “Printable version” gives you a clean sheet you can print or save as PDF to revise offline, and “View as slides” shows it one slide at a time — good for a quick review before a test.',
        ],
    },
    {
        icon: Award,
        title: ['٦. احصل على شهادتك', '6. Earn your certificate'],
        body: [
            'أكمل دروس المادة واجتز اختباراتها، ثم اطلب الشهادة من صفحة «شهاداتي». بعد اعتماد المعلم يمكنك تحميلها كملف PDF ومشاركتها.',
            'Finish the lessons and pass the quizzes, then request your certificate from “My Certificates”. Once your teacher approves it you can download it as a PDF and share it.',
        ],
    },
];

const TEACHER_STEPS: Step[] = [
    {
        icon: GraduationCap,
        title: ['١. أنشئ مادتك', '1. Create your course'],
        body: [
            'من «موادي» أنشئ مادة جديدة واختر لها المرحلة الدراسية والسعر. المواد التي تنشئها هي وحدها التي تستطيع إضافة دروس إليها.',
            'From “My Subjects” create a course and set its school stage and price. You can only add lessons to courses you own.',
        ],
    },
    {
        icon: FileText,
        title: ['٢. أضف الدروس', '2. Add lessons'],
        body: [
            'من «دروسي» اضغط «درس جديد» واختر المادة. بعدها افتح المحرّر وأضف المحتوى على شكل مقاطع: نص، صورة، فيديو، مثال، تمرين، معادلة… ويمكنك ترتيبها بالسحب.',
            'From “My Lessons” tap “New Lesson” and pick the course. Then open the editor and add content as blocks: text, image, video, example, exercise, equation… and drag them into order.',
        ],
    },
    {
        icon: Video,
        title: ['٣. أضف فيديو (اختياري)', '3. Add a video (optional)'],
        body: [
            'في إعدادات الدرس ضع رابط يوتيوب ليظهر مشغّل الفيديو للطلاب. إذا تركته فارغاً سيعرض الدرس النص فقط — ولن يظهر أي مشغّل، وهذا طبيعي.',
            'In the lesson settings, paste a YouTube link to show a video player to students. Leave it empty and the lesson shows text only — no player appears, which is normal.',
        ],
    },
    {
        icon: Sparkles,
        title: ['٤. أنشئ الملخص الذكي', '4. Generate the AI summary'],
        body: [
            'داخل محرّر الدرس اضغط «الملخص الذكي» في الشريط العلوي، ثم «إنشاء ملخص ذكي». سيقرأ الذكاء الاصطناعي محتوى درسك فقط — لا يضيف معلومات من خارجه — ويكتب ملخصاً ونقاطاً وشرائح بالعربية والإنجليزية.',
            'Inside the lesson editor, click “AI summary” in the toolbar, then “Generate AI summary”. It reads only your lesson’s content — it never adds outside facts — and writes a summary, key points and slides in Arabic and English.',
        ],
    },
    {
        icon: CheckCircle2,
        title: ['٥. راجع ثم اعتمد', '5. Review, then approve'],
        body: [
            'اقرأ الملخص وعدّله كما تشاء — كل حقل قابل للتعديل. ثم اضغط «حفظ التعديلات» ثم «اعتماد». لا يرى الطالب أي ملخص قبل اعتمادك له. يمكنك معاينة ما سيراه الطالب عبر «معاينة الطباعة» و«معاينة الشرائح».',
            'Read it and edit anything you like — every field is editable. Then “Save edits” and “Approve”. Students see nothing until you approve. Use “Preview print” and “Preview slides” to see exactly what they will get.',
        ],
    },
    {
        icon: AlertTriangle,
        caution: true,
        title: ['راجع دائماً قبل الاعتماد', 'Always read before approving'],
        body: [
            'الذكاء الاصطناعي يخطئ أحياناً في الصياغة أو التشكيل. أنت المسؤول عن صحة ما يُنشر باسمك، ولهذا لا يظهر أي ملخص للطلاب قبل اعتمادك. إذا عدّلت الدرس بعد إنشاء الملخص ستظهر لك رسالة تنبّهك أن الملخص لم يعد مطابقاً.',
            'The AI sometimes gets wording or grammar wrong. What goes out under your name is your responsibility, which is why nothing reaches students before you approve it. If you edit the lesson after generating, a warning tells you the summary no longer matches.',
        ],
    },
    {
        icon: ShoppingCart,
        title: ['٦. أكّد المدفوعات', '6. Confirm payments'],
        body: [
            'عندما يشترك طالب ستجد طلبه في «الطلبات». تحقق من وصول المبلغ عبر شام كاش ثم اضغط «تأكيد» — عندها فقط تُفتح له المادة. الرفض متاح أيضاً مع سبب.',
            'When a student enrols, their order appears under “Orders”. Check the Sham Cash payment arrived, then tap “Confirm” — only then does the course open for them. You can also reject with a reason.',
        ],
    },
    {
        icon: MessageSquare,
        title: ['٧. تابع طلابك', '7. Follow your students'],
        body: [
            'من «التقييمات والآراء» ترى تقدّم الطلاب وآراءهم، ومن «الرسائل» تتواصل معهم مباشرة، ومن «الإعلانات» ترسل إعلاناً لكل المشتركين في مادة.',
            '“Ratings & Feedback” shows student progress and reviews, “Messages” lets you talk to them directly, and “Announcements” broadcasts to everyone enrolled in a course.',
        ],
    },
];

export default function Guide() {
    const { t, language } = useLanguage();
    const { role } = useAuth();
    const [tab, setTab] = useState<'student' | 'teacher'>(
        role === 'teacher' || role === 'super_admin' ? 'teacher' : 'student'
    );

    const steps = tab === 'student' ? STUDENT_STEPS : TEACHER_STEPS;
    const pick = (pair: [string, string]) => (language === 'en' ? pair[1] : pair[0]);

    return (
        <Layout>
            <div className="container-academic py-10 md:py-14 max-w-3xl">
                <header className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold mb-3">
                        {t('كيف تستخدم ورق أكاديمي', 'How to use Waraq Academy')}
                    </h1>
                    <p className="text-muted-foreground">
                        {t(
                            'دليل قصير يشرح كل ما تحتاجه — خطوة بخطوة.',
                            'A short guide to everything you need — step by step.'
                        )}
                    </p>
                </header>

                {/* Audience switch */}
                <div className="flex gap-2 mb-8" role="tablist">
                    {(['student', 'teacher'] as const).map((key) => (
                        <button
                            key={key}
                            role="tab"
                            aria-selected={tab === key}
                            onClick={() => setTab(key)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-2 transition-colors',
                                tab === key
                                    ? 'bg-foreground text-background border-foreground'
                                    : 'border-border hover:border-foreground/40'
                            )}
                        >
                            {key === 'student' ? <BookOpen className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                            {key === 'student' ? t('للطالب', 'For students') : t('للمعلم', 'For teachers')}
                        </button>
                    ))}
                </div>

                <ol className="space-y-5">
                    {steps.map((step, i) => {
                        const Icon = step.icon;
                        return (
                            <li
                                key={i}
                                className={cn(
                                    'border-2 p-5',
                                    step.caution
                                        ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
                                        : 'border-border bg-card'
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <Icon className={cn('w-5 h-5 mt-0.5 shrink-0', step.caution ? 'text-yellow-600' : 'text-primary')} />
                                    <div>
                                        <h2 className="font-bold mb-1.5">{pick(step.title)}</h2>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{pick(step.body)}</p>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ol>

                <div className="mt-10 pt-6 border-t border-border flex flex-wrap gap-3">
                    {tab === 'student' ? (
                        <>
                            <Button asChild><Link to="/marketplace">{t('تصفّح المواد', 'Browse courses')}</Link></Button>
                            <Button asChild variant="outline"><Link to="/register">{t('إنشاء حساب', 'Create an account')}</Link></Button>
                        </>
                    ) : (
                        <>
                            <Button asChild><Link to="/apply/teacher">{t('انضم كمعلّم', 'Apply to teach')}</Link></Button>
                            <Button asChild variant="outline"><Link to="/login">{t('تسجيل الدخول', 'Log in')}</Link></Button>
                        </>
                    )}
                    <Button asChild variant="ghost" className="gap-1.5">
                        <Link to="/download"><Presentation className="w-4 h-4" />{t('تحميل التطبيق', 'Get the app')}</Link>
                    </Button>
                </div>
            </div>
        </Layout>
    );
}
