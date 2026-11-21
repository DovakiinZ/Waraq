/**
 * One price formatter for every student-facing price.
 *
 * Teachers price in SYP, USD or SAR (TeacherSubjects' currency picker). The
 * pages used to print either the raw ISO code ("100 SYP" to an Arabic reader)
 * or `t('ل.س', currency)`, which labelled a USD price «ل.س» in Arabic.
 */

const CURRENCY_LABELS: Record<string, { ar: string; en: string }> = {
    SYP: { ar: 'ل.س', en: 'SYP' },
    USD: { ar: '$', en: 'USD' },
    SAR: { ar: 'ر.س', en: 'SAR' },
};

export function currencyLabel(currency: string | null | undefined, language: string): string {
    const code = (currency || 'SYP').toUpperCase();
    const entry = CURRENCY_LABELS[code];
    if (!entry) return code;
    return language === 'ar' ? entry.ar : entry.en;
}

/** "25,000 ل.س" / "25,000 SYP". Does not decide free-ness — callers do. */
export function formatAmount(
    amount: number | null | undefined,
    currency: string | null | undefined,
    language: string,
): string {
    const n = Number(amount || 0).toLocaleString('en-US');
    return `${n} ${currencyLabel(currency, language)}`;
}

/**
 * Free exactly when the SERVER treats it as free: `subject_entitlement_reason()`
 * (migration 109) opens a subject without purchase only when `is_paid` is false.
 * Deciding from `price_amount` instead (as the pages did) labelled a paid
 * course with no price "Free" while its lessons stayed locked.
 */
export function isFreeSubject(s: { is_paid?: boolean | null } | null | undefined): boolean {
    return !!s && !s.is_paid; // COALESCE(is_paid, false) in SQL: null is free
}
