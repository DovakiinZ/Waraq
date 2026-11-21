// «ابدأ هنا» for teachers — the setup guide. Spec: docs/superpowers/specs/2026-11-21-setup-guide.md
import { useLanguage } from '@/contexts/LanguageContext';
import { SetupGuideView } from '@/components/setup/SetupGuide';
import { useTeacherGuideSteps } from '@/components/setup/useGuideSteps';

export default function TeacherStart() {
    const { t } = useLanguage();
    const g = useTeacherGuideSteps();

    return (
        <SetupGuideView
            hero={{
                eyebrow: t('أهلاً بك في ورق', 'Welcome to Waraq'),
                title: t('ابدأ هنا', 'Start here'),
                lede: t(
                    'أربع خطوات، نحو 15 دقيقة. بعدها تظهر مادتك في المتجر ويستطيع الطلاب شراءها.',
                    'Four steps, about 15 minutes. After that your course is in the marketplace and students can buy it.',
                ),
            }}
            prerequisite={
                g.isPending
                    ? t('حسابك قيد المراجعة — ابنِ موادك الآن، والنشر يُفتح بعد الموافقة.', "Your account is under review — build now; publishing opens once you're approved.")
                    : t('حسابك معتمد.', 'Your account is approved.')
            }
            steps={g.steps}
            finished={{
                title: t('اكتمل الإعداد', 'Setup complete'),
                body: t('مادتك في المتجر الآن.', 'Your course is in the marketplace.'),
                actions: [
                    { to: '/teacher', label: t('لوحة التحكم', 'Dashboard') },
                    { to: '/teacher/orders', label: t('الطلبات', 'Orders') },
                ],
            }}
            isLoading={g.isLoading}
            isError={g.isError}
            onRetry={() => g.refetch()}
        />
    );
}
