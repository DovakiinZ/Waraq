// One list of stages, grades and genders, shared by student onboarding, the
// student profile editor and the admin students table. Three copies drifted
// apart before; keep this the only source.
import type { StudentStage } from '@/types/database';

export type StageKey = StudentStage;

export const STAGES: {
    key: StageKey;
    ar: string;
    en: string;
    /** Grade span, shown as a mono sublabel. Latin — needs dir="ltr". */
    range: string;
    /** The character on the colour square. Arabic-Indic numerals for the
     *  grade the stage starts at, so the squares read as a progression. */
    glyph: string;
    /** Full phrase, for running prose. `مواد ابتدائي` is clumsy Arabic;
     *  `مواد المرحلة الابتدائية` is not. Matches the Flutter labels. */
    arLong: string;
    enLong: string;
    color: string;
}[] = [
    { key: 'kindergarten', ar: 'تمهيدي', en: 'Kindergarten', range: 'KG', glyph: 'ت', arLong: 'رياض الأطفال', enLong: 'Kindergarten', color: '#D1563A' },
    { key: 'primary', ar: 'ابتدائي', en: 'Primary', range: 'Grades 1–6', glyph: '١', arLong: 'المرحلة الابتدائية', enLong: 'Primary', color: '#C0881F' },
    { key: 'middle', ar: 'متوسط', en: 'Middle', range: 'Grades 7–9', glyph: '٧', arLong: 'المرحلة الإعدادية', enLong: 'Middle school', color: '#2E7F9E' },
    { key: 'high', ar: 'ثانوي', en: 'High school', range: 'Grades 10–12', glyph: '١٠', arLong: 'المرحلة الثانوية', enLong: 'High school', color: '#17864F' },
];

export const GRADE_OPTIONS: Record<StageKey, { value: number; ar: string; en: string }[]> = {
    kindergarten: [{ value: 0, ar: 'التمهيدي (KG)', en: 'Kindergarten' }],
    primary: [
        { value: 1, ar: 'الصف الأول', en: '1st Grade' },
        { value: 2, ar: 'الصف الثاني', en: '2nd Grade' },
        { value: 3, ar: 'الصف الثالث', en: '3rd Grade' },
        { value: 4, ar: 'الصف الرابع', en: '4th Grade' },
        { value: 5, ar: 'الصف الخامس', en: '5th Grade' },
        { value: 6, ar: 'الصف السادس', en: '6th Grade' },
    ],
    middle: [
        { value: 7, ar: 'الصف السابع', en: '7th Grade' },
        { value: 8, ar: 'الصف الثامن', en: '8th Grade' },
        { value: 9, ar: 'الصف التاسع', en: '9th Grade' },
    ],
    high: [
        { value: 10, ar: 'الصف العاشر', en: '10th Grade' },
        { value: 11, ar: 'الصف الحادي عشر', en: '11th Grade' },
        { value: 12, ar: 'الصف الثاني عشر', en: '12th Grade' },
    ],
};

export const GENDERS: { value: 'male' | 'female' | 'unspecified'; ar: string; en: string }[] = [
    { value: 'male', ar: 'ذكر', en: 'Male' },
    { value: 'female', ar: 'أنثى', en: 'Female' },
    { value: 'unspecified', ar: 'غير محدد', en: 'Unspecified' },
];
