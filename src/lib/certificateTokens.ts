/**
 * Certificate Token System
 * 
 * Defines allowed tokens for certificate rendering and provides
 * two resolution modes:
 * - Official: resolves tokens from snapshot_json (immutable, for PDFs)
 * - Live: resolves tokens from latest DB data (for preview)
 */

import { supabase } from './supabase';
import type { Certificate, CertificateSnapshot } from '@/types/database';

// ============================================
// TOKEN REGISTRY
// ============================================

export interface TokenDefinition {
    token: string;
    label_ar: string;
    label_en: string;
    category: 'student' | 'course' | 'certificate' | 'signer';
}

export const CERTIFICATE_TOKENS: TokenDefinition[] = [
    // Student tokens
    { token: '{{student_name}}', label_ar: 'اسم الطالب', label_en: 'Student Name', category: 'student' },
    { token: '{{student_gender}}', label_ar: 'جنس الطالب', label_en: 'Student Gender', category: 'student' },
    { token: '{{student_stage}}', label_ar: 'المرحلة الدراسية', label_en: 'Student Stage', category: 'student' },

    // Course tokens
    { token: '{{course_name}}', label_ar: 'اسم المادة', label_en: 'Course Name', category: 'course' },
    { token: '{{subject_name}}', label_ar: 'اسم المادة', label_en: 'Subject Name', category: 'course' },
    { token: '{{teacher_name}}', label_ar: 'اسم المعلم', label_en: 'Teacher Name', category: 'course' },

    // Certificate tokens
    { token: '{{score}}', label_ar: 'الدرجة', label_en: 'Score', category: 'certificate' },
    { token: '{{average_rating}}', label_ar: 'متوسط التقييم', label_en: 'Average Rating', category: 'certificate' },
    { token: '{{teacher_remarks}}', label_ar: 'ملاحظات المعلم', label_en: 'Teacher Remarks', category: 'certificate' },
    { token: '{{date}}', label_ar: 'تاريخ الإتمام', label_en: 'Completion Date', category: 'certificate' },
    { token: '{{verification_code}}', label_ar: 'رمز التحقق', label_en: 'Verification Code', category: 'certificate' },
    { token: '{{version}}', label_ar: 'رقم الإصدار', label_en: 'Version Number', category: 'certificate' },

    // Signer tokens
    { token: '{{signer_name}}', label_ar: 'اسم الموقّع', label_en: 'Signer Name', category: 'signer' },
    { token: '{{signer_role}}', label_ar: 'صفة الموقّع', label_en: 'Signer Role', category: 'signer' },
];

// ============================================
// RESOLVED TOKEN DATA
// ============================================

export interface ResolvedTokenData {
    student_name: string;
    student_gender: string;
    student_stage: string;
    course_name: string;
    subject_name: string;
    teacher_name: string;
    score: string;
    average_rating: string;
    teacher_remarks: string;
    date: string;
    verification_code: string;
    version: string;
    signer_name: string;
    signer_role: string;
}

// ============================================
// RESOLVE FROM SNAPSHOT (OFFICIAL MODE)
// ============================================

export function resolveTokensFromSnapshot(
    cert: Certificate,
    snapshot?: CertificateSnapshot | null
): ResolvedTokenData {
    const snap = snapshot || cert.snapshot_json;

    return {
        student_name: snap?.student_name || cert.student_name || '',
        student_gender: snap?.gender || '',
        student_stage: (snap as any)?.student_stage || '',
        course_name: snap?.course_name || cert.course_name || '',
        subject_name: cert.subject_name || snap?.course_name || '',
        teacher_name: snap?.teacher_name || '',
        score: snap?.score != null ? `${snap.score}%` : (cert.score != null ? `${cert.score}%` : ''),
        average_rating: snap?.average_rating != null ? String(snap.average_rating) : '',
        teacher_remarks: snap?.teacher_remarks || '',
        date: formatDate(snap?.completion_date || cert.issued_at),
        verification_code: cert.verification_code || '',
        version: String(cert.version || 1),
        signer_name: snap?.signer_name || 'أ. أيمن',
        signer_role: snap?.signer_role || 'مدير الأكاديمية',
    };
}

// ============================================
// RESOLVE LIVE (FETCHES LATEST DB DATA)
// ============================================

export async function resolveTokensLive(
    cert: Certificate
): Promise<ResolvedTokenData> {
    const liveData = await buildLiveSnapshot(cert);
    return liveData;
}

/**
 * Builds a ResolvedTokenData object from the latest DB data.
 * Used for live preview rendering.
 */
export async function buildLiveSnapshot(
    cert: Certificate
): Promise<ResolvedTokenData> {
    // Start with snapshot defaults
    const result: ResolvedTokenData = resolveTokensFromSnapshot(cert);

    try {
        // Fetch latest student profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, gender, student_stage')
            .eq('id', cert.student_id)
            .single() as any;

        if (profile) {
            result.student_name = profile.full_name || profile.email || result.student_name;
            result.student_gender = profile.gender || result.student_gender;
            result.student_stage = profile.student_stage || result.student_stage;
        }

        // Fetch latest subject info
        if (cert.subject_id) {
            const { data: subject } = await supabase
                .from('subjects')
                .select('title_ar, title_en')
                .eq('id', cert.subject_id)
                .single() as any;

            if (subject) {
                result.course_name = subject.title_ar || subject.title_en || result.course_name;
                result.subject_name = subject.title_ar || subject.title_en || result.subject_name;
            }
        }

        // Fetch latest teacher name (via subject)
        if (cert.subject_id) {
            const { data: subjectWithTeacher } = await supabase
                .from('subjects')
                .select('teacher_id')
                .eq('id', cert.subject_id)
                .single() as any;

            if (subjectWithTeacher?.teacher_id) {
                const { data: teacher } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', subjectWithTeacher.teacher_id)
                    .single() as any;

                if (teacher?.full_name) {
                    result.teacher_name = teacher.full_name;
                }
            }
        }

        // Fetch average lesson rating for the subject
        if (cert.subject_id) {
            try {
                const { data: lessons } = await supabase
                    .from('lessons')
                    .select('id')
                    .eq('subject_id', cert.subject_id) as any;

                if (lessons && lessons.length > 0) {
                    const lessonIds = lessons.map((l: any) => l.id);
                    const { data: ratings } = await supabase
                        .from('ratings')
                        .select('stars')
                        .eq('user_id', cert.student_id)
                        .eq('entity_type', 'lesson')
                        .in('entity_id', lessonIds) as any;

                    if (ratings && ratings.length > 0) {
                        const avg = ratings.reduce((sum: number, r: any) => sum + r.stars, 0) / ratings.length;
                        result.average_rating = String(Math.round(avg * 10) / 10);
                    }
                }
            } catch {
                // Keep snapshot fallback
            }
        }

        // Fetch teacher remarks (latest pinned comment from the teacher on this subject's lessons)
        if (cert.subject_id) {
            try {
                const { data: lessons } = await supabase
                    .from('lessons')
                    .select('id, created_by')
                    .eq('subject_id', cert.subject_id) as any;

                if (lessons && lessons.length > 0) {
                    const lessonIds = lessons.map((l: any) => l.id);
                    const teacherIds = Array.from(new Set(lessons.map((l: any) => l.created_by).filter(Boolean)));

                    if (teacherIds.length > 0) {
                        const { data: comments } = await supabase
                            .from('lesson_comments')
                            .select('content')
                            .in('lesson_id', lessonIds as string[])
                            .in('user_id', teacherIds as string[])
                            .eq('is_pinned', true)
                            .order('created_at', { ascending: false })
                            .limit(1) as any;

                        if (comments && comments.length > 0) {
                            result.teacher_remarks = comments[0].content;
                        }
                    }
                }
            } catch {
                // Keep snapshot fallback
            }
        }

        // Fetch latest signer info from template settings
        const { data: settings } = await supabase
            .from('certificate_template_settings')
            .select('setting_key, setting_value') as any;

        if (settings) {
            for (const s of settings) {
                if (s.setting_key === 'signer_name') result.signer_name = s.setting_value;
                if (s.setting_key === 'signer_role') result.signer_role = s.setting_value;
            }
        }
    } catch (error) {
        console.error('Error building live snapshot:', error);
        // Gracefully fall back to snapshot data
    }

    return result;
}

// ============================================
// TEMPLATE STRING RESOLVER
// ============================================

/**
 * Replace all {{token}} placeholders in a template string
 * with resolved values.
 */
export function resolveTemplateString(
    template: string,
    data: ResolvedTokenData
): string {
    let result = template;
    result = result.replace(/\{\{student_name\}\}/g, data.student_name);
    result = result.replace(/\{\{student_gender\}\}/g, data.student_gender);
    result = result.replace(/\{\{student_stage\}\}/g, data.student_stage);
    result = result.replace(/\{\{course_name\}\}/g, data.course_name);
    result = result.replace(/\{\{subject_name\}\}/g, data.subject_name);
    result = result.replace(/\{\{teacher_name\}\}/g, data.teacher_name);
    result = result.replace(/\{\{score\}\}/g, data.score);
    result = result.replace(/\{\{average_rating\}\}/g, data.average_rating);
    result = result.replace(/\{\{teacher_remarks\}\}/g, data.teacher_remarks);
    result = result.replace(/\{\{date\}\}/g, data.date);
    result = result.replace(/\{\{verification_code\}\}/g, data.verification_code);
    result = result.replace(/\{\{version\}\}/g, data.version);
    result = result.replace(/\{\{signer_name\}\}/g, data.signer_name);
    result = result.replace(/\{\{signer_role\}\}/g, data.signer_role);
    return result;
}

// ============================================
// HELPERS
// ============================================

function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

/**
 * Check if live data differs from the snapshot.
 * Useful for showing "data has changed" indicator in UI.
 */
export function hasDataChanged(
    snapshotData: ResolvedTokenData,
    liveData: ResolvedTokenData
): boolean {
    return (
        snapshotData.student_name !== liveData.student_name ||
        snapshotData.student_gender !== liveData.student_gender ||
        snapshotData.student_stage !== liveData.student_stage ||
        snapshotData.course_name !== liveData.course_name ||
        snapshotData.teacher_name !== liveData.teacher_name
    );
}
