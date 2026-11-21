// Top of the teacher dashboard: the pending-review banner plus the setup guide
// card («الإعداد: 2 من 4»). The steps are derived in src/lib/setupProgress.ts;
// the full guide lives at /teacher/start. A failed or loading query renders no
// card, so it can never show a wrong "not done".
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { A } from '@/components/arcade/theme';
import { ArcadeCard, ArcadeChip } from '@/components/arcade/primitives';
import { SetupProgressCard } from '@/components/setup/SetupGuide';
import { useTeacherGuideSteps } from '@/components/setup/useGuideSteps';

export function SandboxBanner() {
    const { profile } = useAuth();
    const { t } = useLanguage();
    const { steps } = useTeacherGuideSteps();
    const pending = profile?.is_active === false;

    return (
        <div className="space-y-4">
            {pending && (
                <ArcadeCard className="p-4" fill={A.wash}>
                    <div className="flex items-center gap-2.5">
                        <ArcadeChip>{t('قيد المراجعة', 'Under review')}</ArcadeChip>
                        <span className="font-mono text-[11px]" style={{ color: A.inkSoft }} dir="ltr">~24h</span>
                    </div>
                    <p className="mt-2.5 text-[14px] font-semibold leading-relaxed" style={{ color: A.ink }}>
                        {t(
                            'ابنِ موادك ودروسك الآن. النشر والبيع يُفتحان بموافقة الإدارة.',
                            'Build your subjects and lessons now. Publishing and selling unlock once an admin approves you.',
                        )}
                    </p>
                </ArcadeCard>
            )}
            <SetupProgressCard steps={steps} to="/teacher/start" nextTitle={steps.find((s) => !s.done)?.title} />
        </div>
    );
}
