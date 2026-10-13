// Pending-review banner plus the derived setup checklist, in the arcade
// language. The banner it replaces was amber and rounded, from before the
// rebrand, and promised a sandbox that nothing enforced; migration 113 makes
// that promise true.
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Check } from 'lucide-react';
import { A } from '@/components/arcade/theme';
import { ArcadeCard, ArcadeChip } from '@/components/arcade/primitives';
import { useTeacherSetup } from '@/hooks/useTeacherSetup';

export function SandboxBanner() {
    const { profile } = useAuth();
    const { t } = useLanguage();
    const { rows, doneCount, total, isLoading } = useTeacherSetup();

    const pending = profile?.is_active === false;
    const complete = doneCount === total;

    // Nothing to say once they are approved and set up.
    if (!pending && complete) return null;

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

            {/* A failed checklist query must never block a teacher from
                building, so this section simply does not render. */}
            {!isLoading && !complete && (
                <ArcadeCard className="p-4">
                    <div className="flex items-baseline justify-between">
                        <span className="text-[15px] font-black" style={{ color: A.ink }}>
                            {t('أكمل ملفك', 'Finish your profile')}
                        </span>
                        <span className="font-mono text-[12px] tabular-nums" style={{ color: A.inkSoft }} dir="ltr">
                            {doneCount} / {total}
                        </span>
                    </div>

                    <ul className="mt-3">
                        {rows.map((row) => (
                            <li
                                key={row.key}
                                className="flex items-start gap-2.5 border-t-2 py-2.5 first:border-t-0 first:pt-0"
                                style={{ borderColor: A.wash }}
                            >
                                <span
                                    className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center border-2"
                                    style={{
                                        borderColor: A.line,
                                        background: row.done ? A.accent : 'transparent',
                                        color: A.onAccent,
                                    }}
                                    aria-hidden
                                >
                                    {row.done && <Check className="h-3 w-3" strokeWidth={3} />}
                                </span>
                                <span
                                    className="text-[13.5px] font-semibold"
                                    style={{
                                        color: row.done ? A.inkSoft : A.ink,
                                        textDecoration: row.done ? 'line-through' : 'none',
                                    }}
                                >
                                    {row.done || !row.to ? t(row.ar, row.en) : (
                                        <Link to={row.to} className="arc-link arc-focus">{t(row.ar, row.en)}</Link>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                </ArcadeCard>
            )}
        </div>
    );
}
