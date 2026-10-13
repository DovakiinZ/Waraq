// Student onboarding: one question, because `student_stage` is the only
// onboarding answer the system makes a decision from — the guard at
// RoleRoutes.tsx, `needsOnboarding` on Flutter, and every subject query's
// filter. Gender and grade live on the profile; nothing gates on them.
//
// Styled in the arcade language. This page previously used the pre-rebrand
// logo, rounded corners and a hard-coded dir="rtl" that ignored the language
// setting.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { AlertCircle, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { A, hard } from '@/components/arcade/theme';
import { ArcadeBrand, ArcadeButton } from '@/components/arcade/primitives';
import { STAGES, type StageKey } from '@/lib/studentStages';

export default function StudentOnboarding() {
    const { profile, refreshProfile } = useAuth();
    const { t, direction } = useLanguage();
    const navigate = useNavigate();

    const [stage, setStage] = useState<StageKey | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

    const onSubmit = async () => {
        if (!stage || !profile?.id) return;
        setSaving(true);
        setError('');
        try {
            // Deliberately NOT verifiedUpdate, despite it being the project's
            // stated convention for mutations. Two reasons, specific to this
            // screen: (1) verifiedUpdate re-selects after the write and
            // reports success even when the field comes back unchanged — its
            // comment says this is to tolerate RLS silently filtering a
            // field, but here that exact case IS the bug: RoleRoutes sends a
            // student with no student_stage straight back to this page, so a
            // write that "succeeds" without persisting creates an infinite
            // redirect loop with nothing to explain it. (2) checkAuth() fires
            // an unconditional toast.error on a missing session before
            // verifiedUpdate ever looks at options.showErrorToast, so that
            // flag cannot suppress it — a lapsed session here would toast
            // AND show the inline message below. A raw update + re-select
            // that strictly compares the returned value is simpler and
            // closes both gaps.
            const { data, error: updateError } = await supabase.from('profiles')
                .update({ student_stage: stage })
                .eq('id', profile.id)
                .select('student_stage')
                .single();

            if (updateError) throw updateError;
            // Prove the value actually landed. A zero-row update returns no
            // row here, and a row whose stage does not match means the write
            // was filtered. Either way the student must stay on this screen —
            // routing onward would bounce them straight back via RoleRoutes'
            // onboarding guard, with nothing to explain the loop.
            if (data?.student_stage !== stage) {
                throw new Error(`stage did not persist (got ${data?.student_stage ?? 'no row'})`);
            }

            await refreshProfile();
            navigate('/student/marketplace', { replace: true });
        } catch (err) {
            console.error('Onboarding save error:', err);
            // Inline and persistent, not a toast: the student cannot leave this
            // screen until it succeeds, so the message has to stay on screen.
            setError(t('فشل الحفظ — حاول مرة أخرى', 'Could not save — please try again'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            dir={direction}
            className="flex min-h-[100dvh] items-center justify-center p-5 font-arabic"
            style={{ background: A.bg }}
        >
            <div className="w-full max-w-[460px]">
                <ArcadeBrand size={36} className="mb-7" />

                <h1 className="text-[28px] font-black leading-tight tracking-tight" style={{ color: A.ink }}>
                    {profile?.full_name
                        ? t(`مرحبًا ${profile.full_name.split(' ')[0]}`, `Welcome, ${profile.full_name.split(' ')[0]}`)
                        : t('مرحبًا بك', 'Welcome')}
                </h1>
                <p className="mt-3 text-[15px] font-medium" style={{ color: A.inkSoft }}>
                    {t('اختر مرحلتك الدراسية لنُرتّب لك المواد.', 'Pick your stage and we will sort the subjects for you.')}
                </p>

                <div className="mt-7 flex flex-col gap-2.5">
                    {STAGES.map((s) => {
                        const selected = stage === s.key;
                        return (
                            <button
                                key={s.key}
                                type="button"
                                onClick={() => setStage(s.key)}
                                aria-pressed={selected}
                                className="arc-focus flex items-center gap-3 border-2 p-3 text-start"
                                style={{
                                    background: selected ? A.wash : A.surface,
                                    borderColor: A.line,
                                    boxShadow: selected ? hard(5) : 'none',
                                }}
                            >
                                <span
                                    className="flex h-11 w-11 shrink-0 items-center justify-center border-2 text-[15px] font-black"
                                    style={{ background: s.color, borderColor: A.line, color: '#FFFFFF' }}
                                    aria-hidden
                                >
                                    {s.glyph}
                                </span>
                                <span className="flex-1">
                                    <span className="block text-[15px] font-black" style={{ color: A.ink }}>
                                        {t(s.ar, s.en)}
                                    </span>
                                    <span dir="ltr" className="mt-0.5 block font-mono text-[11px]" style={{ color: A.inkSoft }}>
                                        {s.range}
                                    </span>
                                </span>
                                {selected && (
                                    <span
                                        className="flex h-6 w-6 shrink-0 items-center justify-center border-2"
                                        style={{ background: A.accent, borderColor: A.line, color: A.onAccent }}
                                    >
                                        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {error && (
                    <div
                        className="mt-5 flex items-start gap-2.5 border-2 p-3"
                        style={{
                            borderColor: 'hsl(var(--destructive))',
                            background: 'hsl(var(--destructive) / 0.08)',
                        }}
                        role="alert"
                    >
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'hsl(var(--destructive))' }} />
                        <p className="text-[13px] font-bold" style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
                    </div>
                )}

                <ArcadeButton
                    type="button"
                    variant="solid"
                    className="mt-6 w-full"
                    onClick={onSubmit}
                    disabled={!stage}
                    loading={saving}
                >
                    {!saving && t('متابعة', 'Continue')}
                    {saving && t('جارٍ الحفظ', 'Saving')}
                    {!saving && <ArrowIcon className="h-4 w-4" aria-hidden="true" />}
                </ArcadeButton>

                <p className="mt-4 text-center text-[13px] font-medium" style={{ color: A.inkSoft }}>
                    {t('يمكنك تغييرها لاحقًا من ملفك.', 'You can change this later from your profile.')}
                </p>
            </div>
        </div>
    );
}
