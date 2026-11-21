// Turns the derived steps into worded GuideSteps for each role, so the guide
// page and the dashboard card share one source of copy.
// Spec: docs/superpowers/specs/2026-11-21-setup-guide.md
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentSetupGuide, useTeacherSetupGuide } from '@/hooks/useSetupGuide';
import type { GuideStep } from '@/components/setup/SetupGuide';

export function useTeacherGuideSteps() {
    const { t } = useLanguage();
    const g = useTeacherSetupGuide();
    const by = Object.fromEntries(g.steps.map((s) => [s.key, s]));

    const steps: GuideStep[] = g.steps.length
        ? [
              {
                  key: 'profile',
                  done: by.profile.state === 'done',
                  title: t('جهّز ملفك للطلاب', 'Get your profile ready for students'),
                  why: t(
                      'الطلاب يقرؤون نبذتك قبل الشراء، ويدفعون لك على حساب شام كاش.',
                      'Students read your bio before buying, and pay you through your Sham Cash account.',
                  ),
                  // The sub-count once something is done; a bare "0 of 2" says nothing.
                  summary: by.profile.count!.done > 0
                      ? `${t('النبذة وحساب شام كاش', 'Bio and Sham Cash account')}: ${by.profile.count!.done} ${t('من', 'of')} 2`
                      : undefined,
                  primary: {
                      to: '/teacher/profile',
                      label: by.profile.state === 'done' ? t('تعديل ملفي', 'Edit my profile') : t('افتح ملفي الشخصي', 'Open my profile'),
                  },
              },
              {
                  key: 'course',
                  done: by.course.state === 'done',
                  title: t('أنشئ مادتك الأولى', 'Create your first course'),
                  why: t(
                      'الطالب يشتري مادة، والدروس بداخلها. ابدأ بالعنوان والمرحلة والسعر.',
                      'Students buy a course; lessons live inside it. Start with a title, stage and price.',
                  ),
                  summary: by.course.state === 'done' ? `${t('موادك', 'Your courses')}: ${by.course.n}` : undefined,
                  primary: {
                      to: '/teacher/subjects',
                      label: by.course.state === 'done' ? t('موادي', 'My courses') : t('أنشئ مادة', 'Create a course'),
                  },
              },
              {
                  key: 'lesson',
                  done: by.lesson.state === 'done',
                  title: t('اكتب أول درس', 'Write your first lesson'),
                  why: t(
                      'الصق درساً كتبته من قبل أو اكتبه مباشرة، ويمكنك نشره لاحقاً.',
                      'Paste a lesson you already wrote or type it in; you can publish it later.',
                  ),
                  summary: by.lesson.state === 'done' ? `${t('دروس فيها محتوى', 'Lessons with content')}: ${by.lesson.n}` : undefined,
                  // Writing a lesson needs a course to put it in; say so rather than
                  // sending the teacher to a wizard with an empty course list.
                  ...(by.course.state === 'done'
                      ? {
                            primary: {
                                to: '/teacher/lessons/new',
                                label: by.lesson.state === 'done' ? t('اكتب درساً آخر', 'Write another lesson') : t('اكتب درساً', 'Write a lesson'),
                            },
                        }
                      : { note: t('أنشئ مادة أولاً، ثم أضف دروسها.', 'Create a course first, then add its lessons.') }),
              },
              {
                  key: 'publish',
                  done: by.publish.state === 'done',
                  title: t('انشر مادتك للطلاب', 'Publish your course'),
                  why: t(
                      'تظهر المادة في المتجر عندما تكون منشورة وفيها درس منشور واحد على الأقل.',
                      'A course appears in the marketplace once it is published and has at least one published lesson.',
                  ),
                  summary: by.publish.state === 'done' ? `${t('منشورة في المتجر', 'Live in the marketplace')}: ${by.publish.n}` : undefined,
                  ...(g.isPending && by.publish.state !== 'done'
                      ? { note: t('يُفتح النشر بعد موافقة الإدارة على حسابك.', 'Publishing opens once an admin approves your account.') }
                      : { primary: { to: '/teacher/subjects', label: t('افتح موادي', 'Open my courses') } }),
              },
          ]
        : [];

    return { ...g, steps };
}

export function useStudentGuideSteps() {
    const { t } = useLanguage();
    const g = useStudentSetupGuide();
    const by = Object.fromEntries(g.steps.map((s) => [s.key, s]));

    const steps: GuideStep[] = g.steps.length
        ? [
              {
                  key: 'choose',
                  done: by.choose.state === 'done',
                  title: t('اختر مادتك الأولى', 'Pick your first course'),
                  why: t(
                      'تصفّح مواد مرحلتك. المجانية تبدأ فوراً، والمدفوعة تدفع ثمنها للمعلّم عبر شام كاش.',
                      "Browse your stage's courses. Free ones start right away; for paid ones you pay the teacher through Sham Cash.",
                  ),
                  summary: by.choose.state === 'done'
                      ? g.waitingForPayment
                          ? t('بانتظار تأكيد المعلّم للدفع', 'Waiting for the teacher to confirm payment')
                          : t('تم', 'Done')
                      : undefined,
                  primary: { to: '/student/marketplace', label: t('افتح المتجر', 'Open the marketplace') },
                  secondary: g.waitingForPayment
                      ? [{ to: '/student/marketplace?tab=orders', label: t('طلباتي', 'My orders') }]
                      : undefined,
              },
              {
                  key: 'start',
                  done: by.start.state === 'done',
                  title: t('افتح أول درس', 'Open your first lesson'),
                  why: t(
                      'ابدأ بالدرس الأول، أو جرّب درس «معاينة مجانية» قبل الشراء.',
                      'Start with the first lesson, or try a "Free preview" lesson before buying.',
                  ),
                  summary: by.start.state === 'done' ? t('تم', 'Done') : undefined,
                  primary: { to: '/student/subjects', label: t('اذهب إلى موادي', 'Go to my courses') },
              },
              {
                  key: 'finish',
                  done: by.finish.state === 'done',
                  title: t('أكمل درساً حتى النهاية', 'Finish a lesson'),
                  why: t(
                      'اقرأ الدرس حتى آخره واضغط «إكمال الدرس»، فيُحسب تقدّمك وتقترب من الشهادة.',
                      'Read to the end and press "Complete lesson"; your progress counts toward the certificate.',
                  ),
                  summary: by.finish.state === 'done' ? `${t('دروس مكتملة', 'Lessons finished')}: ${by.finish.n}` : undefined,
                  primary: {
                      to: g.resumeLessonId ? `/student/lesson/${g.resumeLessonId}` : '/student/subjects',
                      label: t('تابع التعلّم', 'Continue learning'),
                  },
              },
          ]
        : [];

    return { ...g, steps };
}
