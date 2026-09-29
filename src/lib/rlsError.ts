/**
 * Recognising a row-level-security refusal.
 *
 * Migration 107 tightened the write policies on `lessons`, so teacher-facing
 * mutations can now legitimately be refused. Postgres surfaces that in TWO
 * different ways, and only one of them is an error:
 *
 *   WITH CHECK violation  → error 42501, "new row violates row-level security
 *                           policy". Loud. `isRlsDenial` catches it.
 *
 *   USING clause mismatch → NO error at all. The row simply is not visible to
 *                           the statement, so UPDATE and DELETE affect ZERO
 *                           rows and report success. Silent.
 *
 * The silent case is the dangerous one: a teacher clicks a toggle on someone
 * else's lesson, sees a success toast, and nothing changed. Use
 * `affectedNoRows` on every UPDATE/DELETE whose policy could refuse it —
 * `.select('id')` on the mutation and check what came back.
 */

/** True when the error is Postgres/PostgREST refusing on a policy. */
export function isRlsDenial(err: unknown): boolean {
    const code = (err as { code?: string })?.code;
    if (code === '42501' || code === 'PGRST301') return true;
    const message = err instanceof Error ? err.message : String(err ?? '');
    return /row-level security/i.test(message);
}

/**
 * True when a mutation succeeded but touched nothing — the USING-clause
 * refusal above. Pass the `data` from a mutation with `.select(...)` chained.
 */
export function affectedNoRows(data: unknown): boolean {
    return Array.isArray(data) && data.length === 0;
}
