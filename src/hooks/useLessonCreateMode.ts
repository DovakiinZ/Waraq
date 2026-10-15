/**
 * Which lesson-creation flow this teacher prefers.
 *
 * The four-step wizard suits a teacher building a lesson from scratch or
 * pasting one in; the single-form version is faster when you just want a
 * titled shell to fill in later. Neither is right for everyone, so the
 * teacher picks and we remember.
 *
 * Stored per device in localStorage rather than on `profiles`, matching the
 * existing client-side preference keys (`ayman-academy-theme`,
 * `ayman-academy-palette`). It is a UI preference, not account data — no
 * migration, and no write that could fail.
 */
import { useCallback, useEffect, useState } from 'react';

export type LessonCreateMode = 'wizard' | 'quick';

const STORAGE_KEY = 'ayman-academy-lesson-create-mode';
const DEFAULT_MODE: LessonCreateMode = 'wizard';

function read(): LessonCreateMode {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved === 'quick' || saved === 'wizard' ? saved : DEFAULT_MODE;
    } catch {
        // Private mode or blocked storage — the default is still correct.
        return DEFAULT_MODE;
    }
}

export function useLessonCreateMode(): [LessonCreateMode, (mode: LessonCreateMode) => void] {
    // Read lazily so the first paint already shows the remembered choice
    // rather than flashing the default.
    const [mode, setModeState] = useState<LessonCreateMode>(read);

    // Keep tabs in step: a teacher who switches in one tab should not find
    // the other tab still offering the flow they just moved away from.
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) setModeState(read());
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const setMode = useCallback((next: LessonCreateMode) => {
        setModeState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // Preference just does not persist; the session still honours it.
        }
    }, []);

    return [mode, setMode];
}
