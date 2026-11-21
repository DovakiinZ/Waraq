// «ابدأ هنا» for students — the setup guide. Spec: docs/superpowers/specs/2026-11-21-setup-guide.md
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { A } from '@/components/arcade/theme';
import { SetupGuideView } from '@/components/setup/SetupGuide';
import { useStudentGuideSteps } from '@/components/setup/useGuideSteps';
import { STAGES } from '@/lib/studentStages';

export default function StudentStart() {
    const { t, language } = useLanguage();
    const { profile } = useAuth();
    const g = useStudentGuideSteps();
    const stage = STAGES.find((s) => s.key === profile?.student_stage);

    return (
        <SetupGuideView
            hero={{
                eyebrow: t('أهلاً بك في ورق', 'Welcome to Waraq'),
                title: t('ابدأ هنا', 'Start here'),
                lede: t('ثلاث خطوات قصيرة: اختر مادة، افتح درساً، وأكمله.', 'Three short steps: pick a course, open a lesson, and finish it.'),
            }}
            prerequisite={
                stage && (
                    <>
                        {t('مرحلتك', 'Your stage')}: <b style={{ color: A.ink }}>{language === 'ar' ? stage.arLong : stage.enLong}</b>
                        {' · '}
                        <Link to="/student/profile" className="arc-link underline">{t('تغيير', 'Change')}</Link>
                    </>
                )
            }
            steps={g.steps}
            finished={{
                title: t('أحسنت! أكملت أول درس', 'Well done — you finished your first lesson'),
                body: t('تابع موادك، وتقدّمك يُحسب في كل درس.', 'Keep going; your progress counts in every lesson.'),
                actions: [
                    { to: '/student/subjects', label: t('تابع التعلّم', 'Continue learning') },
                    { to: '/student/marketplace', label: t('المتجر', 'Marketplace') },
                ],
            }}
            isLoading={g.isLoading}
            isError={g.isError}
            onRetry={() => g.refetch()}
        />
    );
}
