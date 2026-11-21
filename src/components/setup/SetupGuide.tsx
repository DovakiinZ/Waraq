// The setup guide UI, shared by the teacher and student pages. Knows nothing
// about either role: the pages pass the steps already worded.
// Spec: docs/superpowers/specs/2026-11-21-setup-guide.md
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { A } from '@/components/arcade/theme';
import { ArcadeButton, ArcadeCard, ArcadeLink, ArcadeSkeleton } from '@/components/arcade/primitives';

export interface GuideAction {
    to: string;
    label: string;
}

export interface GuideStep {
    key: string;
    done: boolean;
    title: string;
    why: string;
    /** One line under a closed row: the result, or the sub-count. */
    summary?: string;
    /** The one primary button. Omit and give `note` when the step can't be done yet. */
    primary?: GuideAction;
    /** Shown instead of a button ("Publishing opens once…"). Never a disabled button. */
    note?: string;
    /** Extra actions beside the primary, e.g. "Open my courses" on a done step. */
    secondary?: GuideAction[];
}

// ── Route bar: one segment per step ───────────────────────────────────────

export function RouteBar({ steps, onBand = false }: { steps: { done: boolean }[]; onBand?: boolean }) {
    const { t } = useLanguage();
    const current = steps.findIndex((s) => !s.done);
    const ink = onBand ? A.onInk : A.line;
    return (
        <ol className="flex gap-1.5" aria-label={t('تقدّم الإعداد', 'Setup progress')}>
            {steps.map((s, i) => {
                const state = s.done ? 'done' : i === current ? 'current' : 'todo';
                return (
                    <li key={i} className="h-2.5 flex-1" style={{ border: `2px solid ${ink}`, background: 'transparent' }}>
                        <span
                            className="block h-full origin-left rtl:origin-right"
                            style={{
                                background: A.accent,
                                transform: `scaleX(${state === 'done' ? 1 : state === 'current' ? 0.3 : 0})`,
                                transition: 'transform 500ms cubic-bezier(.23,1,.32,1)',
                            }}
                        />
                        <span className="sr-only">
                            {i + 1}: {state === 'done' ? t('تمّت', 'Done') : state === 'current' ? t('الخطوة الحالية', 'Current step') : t('لم تتم بعد', 'Not done yet')}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────

export function SetupGuideView({
    hero,
    prerequisite,
    steps,
    finished,
    isLoading,
    isError,
    onRetry,
}: {
    hero: { eyebrow: string; title: string; lede: string };
    prerequisite?: ReactNode;
    steps: GuideStep[];
    finished: { title: string; body: string; actions: [GuideAction, GuideAction] };
    isLoading: boolean;
    isError: boolean;
    onRetry: () => void;
}) {
    const { t } = useLanguage();
    const total = steps.length;
    const done = steps.filter((s) => s.done).length;
    const complete = total > 0 && done === total;
    const currentKey = steps.find((s) => !s.done)?.key ?? null;

    // The current step opens by itself ONCE, when data first arrives. After
    // that the user decides; a refetch never re-opens or moves anything.
    const [openKey, setOpenKey] = useState<string | null>(null);
    const seeded = useRef(false);
    useEffect(() => {
        if (!seeded.current && total > 0) {
            seeded.current = true;
            setOpenKey(currentKey);
        }
    }, [total, currentKey]);

    if (isLoading) {
        return (
            <div className="mx-auto max-w-3xl space-y-4" aria-busy="true">
                <ArcadeSkeleton className="h-48" />
                <ArcadeSkeleton className="h-64" />
            </div>
        );
    }
    if (isError) {
        return (
            <ArcadeCard className="mx-auto max-w-3xl p-6 text-center">
                <p className="font-bold" style={{ color: A.ink }}>
                    {t('تعذّر تحميل خطوات الإعداد.', 'Could not load your setup steps.')}
                </p>
                <p className="mt-1 text-sm" style={{ color: A.inkSoft }}>
                    {t('تحقّق من الاتصال ثم أعد المحاولة.', 'Check your connection and try again.')}
                </p>
                <ArcadeButton size="sm" className="mt-4" onClick={onRetry}>
                    {t('إعادة المحاولة', 'Try again')}
                </ArcadeButton>
            </ArcadeCard>
        );
    }

    const n = Math.min(done + 1, total);

    return (
        <div className="mx-auto max-w-3xl space-y-5">
            {/* Hero */}
            {complete ? (
                <div className="p-6 sm:p-8" style={{ background: A.band, color: A.onInk, border: `2px solid ${A.line}`, boxShadow: '6px 6px 0 var(--arc-shadow)' }}>
                    <span className="inline-flex h-11 w-11 items-center justify-center" style={{ background: A.accent, color: A.onAccent }} aria-hidden="true">
                        <Check className="h-6 w-6" strokeWidth={3} />
                    </span>
                    <h1 className="mt-4 text-2xl font-bold sm:text-3xl">{finished.title}</h1>
                    <p className="mt-1.5 max-w-xl" style={{ color: A.onInkMuted }}>{finished.body}</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <ArcadeLink to={finished.actions[0].to} size="sm">{finished.actions[0].label}</ArcadeLink>
                        <ArcadeLink to={finished.actions[1].to} size="sm" variant="onDark">{finished.actions[1].label}</ArcadeLink>
                    </div>
                </div>
            ) : (
                <div className="p-6 sm:p-8" style={{ background: A.band, color: A.onInk, border: `2px solid ${A.line}`, boxShadow: '6px 6px 0 var(--arc-shadow)' }}>
                    <p className="text-sm font-bold" style={{ color: A.accent }}>{hero.eyebrow}</p>
                    <p className="mt-1 text-sm" style={{ color: A.onInkMuted }}>
                        {t('الخطوة', 'Step')} <bdi dir="ltr" className="tabular-nums">{n}</bdi> {t('من', 'of')} <bdi dir="ltr" className="tabular-nums">{total}</bdi>
                    </p>
                    <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{hero.title}</h1>
                    <p className="mt-1.5 max-w-xl leading-relaxed" style={{ color: A.onInkMuted }}>{hero.lede}</p>
                    <div className="mt-5"><RouteBar steps={steps} onBand /></div>
                    <p className="mt-2 text-sm" style={{ color: A.onInkMuted }}>
                        {t('الخطوات المكتملة', 'Steps done')}: <bdi dir="ltr" className="tabular-nums">{done}</bdi> {t('من', 'of')} <bdi dir="ltr" className="tabular-nums">{total}</bdi>
                    </p>
                </div>
            )}

            {prerequisite && (
                <div className="flex items-start gap-2 px-1 text-sm" style={{ color: A.inkSoft }}>
                    <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: A.mid }} aria-hidden="true" />
                    <div className="min-w-0">{prerequisite}</div>
                </div>
            )}

            {/* Steps */}
            <ArcadeCard flat className="overflow-hidden">
                <ol>
                    {steps.map((s, i) => {
                        const open = openKey === s.key && !complete;
                        const isCurrent = s.key === currentKey;
                        return (
                            <StepRow
                                key={s.key}
                                step={s}
                                index={i}
                                open={open}
                                isCurrent={isCurrent}
                                first={i === 0}
                                onToggle={() => setOpenKey(open ? null : s.key)}
                            />
                        );
                    })}
                </ol>
            </ArcadeCard>

            {!complete && (
                <p className="px-1 text-sm" style={{ color: A.inkSoft }}>
                    {t('يمكنك المغادرة والعودة في أي وقت؛ تقدّمك محفوظ.', 'You can leave and come back any time; your progress is saved.')}
                </p>
            )}
        </div>
    );
}

function StepRow({
    step, index, open, isCurrent, first, onToggle,
}: {
    step: GuideStep; index: number; open: boolean; isCurrent: boolean; first: boolean; onToggle: () => void;
}) {
    const { t } = useLanguage();
    const panelId = useId();
    const state = step.done ? t('تمّت', 'Done') : isCurrent ? t('الخطوة الحالية', 'Current step') : t('لم تتم بعد', 'Not done yet');

    return (
        <li
            aria-current={isCurrent ? 'step' : undefined}
            style={{ borderTop: first ? 'none' : `2px solid ${A.wash}`, background: open ? A.wash : 'transparent' }}
        >
            <h3>
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={open}
                    aria-controls={panelId}
                    className="arc-focus flex min-h-[72px] w-full items-center gap-3 px-4 py-3 text-start sm:px-5"
                >
                    <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center text-sm font-bold tabular-nums"
                        style={
                            step.done
                                ? { background: A.accent, color: A.onAccent, border: `2px solid ${A.line}` }
                                : isCurrent
                                  ? { background: A.surface, color: A.ink, border: `2px solid ${A.line}`, boxShadow: `3px 3px 0 var(--arc-shadow)` }
                                  : { background: A.surface, color: A.inkSoft, border: `2px solid ${A.wash}` }
                        }
                        aria-hidden="true"
                    >
                        {step.done ? <Check className="h-5 w-5" strokeWidth={3} /> : <bdi dir="ltr">{index + 1}</bdi>}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-[16px] font-bold leading-snug" style={{ color: step.done ? A.inkSoft : A.ink }}>
                            {step.title}
                        </span>
                        {!open && step.summary && (
                            <span className="mt-0.5 block text-[13px]" style={{ color: A.inkSoft }}>{step.summary}</span>
                        )}
                        <span className="sr-only">{state}</span>
                    </span>
                    <ChevronDown
                        className="h-5 w-5 shrink-0 transition-transform duration-200"
                        style={{ color: A.inkSoft, transform: open ? 'rotate(180deg)' : 'none' }}
                        aria-hidden="true"
                    />
                </button>
            </h3>
            <div id={panelId} role="region" hidden={!open} className="px-4 pb-5 sm:px-5 sm:ps-[68px]">
                <p className="max-w-xl leading-relaxed" style={{ color: A.ink }}>{step.why}</p>
                {step.summary && <p className="mt-2 text-sm" style={{ color: A.inkSoft }}>{step.summary}</p>}
                {step.note && (
                    <p className="mt-3 max-w-xl border-s-4 ps-3 text-sm font-semibold" style={{ borderColor: A.mid, color: A.ink }}>
                        {step.note}
                    </p>
                )}
                {(step.primary || step.secondary?.length) && (
                    <div className="mt-4 flex flex-wrap gap-3">
                        {step.primary && (
                            <ArcadeLink to={step.primary.to} size="sm" variant={step.done ? 'outline' : 'solid'}>
                                {step.primary.label}
                            </ArcadeLink>
                        )}
                        {step.secondary?.map((a) => (
                            <ArcadeLink key={a.to + a.label} to={a.to} size="sm" variant="outline">{a.label}</ArcadeLink>
                        ))}
                    </div>
                )}
            </div>
        </li>
    );
}

// ── Dashboard card ────────────────────────────────────────────────────────

/** "Setup: 2 of 4", the next step's title, segments, one button. Renders nothing when complete. */
export function SetupProgressCard({ steps, to, nextTitle }: { steps: { done: boolean }[]; to: string; nextTitle?: string }) {
    const { t } = useLanguage();
    const total = steps.length;
    const done = steps.filter((s) => s.done).length;
    if (!total || done === total) return null;
    return (
        <ArcadeCard className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold" style={{ color: A.inkSoft }}>
                        {t('الإعداد', 'Setup')}: <bdi dir="ltr" className="tabular-nums">{done}</bdi> {t('من', 'of')} <bdi dir="ltr" className="tabular-nums">{total}</bdi>
                    </p>
                    <p className="mt-0.5 text-[17px] font-bold leading-snug" style={{ color: A.ink }}>
                        {nextTitle ?? t('ابدأ هنا', 'Start here')}
                    </p>
                    <div className="mt-3 max-w-xs"><RouteBar steps={steps} /></div>
                </div>
                <ArcadeLink to={to} size="sm">{t('تابع الإعداد', 'Continue setup')}</ArcadeLink>
            </div>
        </ArcadeCard>
    );
}
