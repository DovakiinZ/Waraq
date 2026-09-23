// ============================================
// TEACHER EVALUATION SERVICE
// ============================================

import { supabase } from '@/lib/supabase';
import type { CourseQualityReport } from '@/types/database';

// ============================================
// MAIN EVALUATION FUNCTION
// ============================================

export async function evaluateCourseQuality(subjectId: string): Promise<CourseQualityReport> {
    // Fetch all data in parallel
    const [lessonsRes, progressRes, quizAttemptsRes] = await Promise.all([
        (supabase.from('lessons') as any)
            .select('id, title_ar, sort_order')
            .eq('subject_id', subjectId)
            .order('sort_order'),
        (supabase.from('lesson_progress') as any)
            .select('user_id, lesson_id, progress_percent, lessons!inner(subject_id)')
            .eq('lessons.subject_id', subjectId),
        (supabase.from('quiz_attempts') as any)
            .select('student_id, quiz_id, score_percent, passed, created_at, quizzes!inner(lesson_id, lessons!inner(subject_id))')
            .eq('quizzes.lessons.subject_id', subjectId),
    ]);

    const lessons = lessonsRes.data || [];
    const progressRecords = progressRes.data || [];
    const quizAttempts = quizAttemptsRes.data || [];

    if (lessons.length === 0) {
        return {
            qualityScore: 0,
            difficultyBalanceScore: 0,
            engagementScore: 0,
            dropoutRisk: 0,
            detectedIssues: ['لا توجد دروس في هذه المادة'],
            recommendations: ['أضف دروساً للبدء في تقييم المادة'],
        };
    }

    const issues: string[] = [];
    const recommendations: string[] = [];

    // ============================
    // 1. Average Score Analysis
    // ============================
    const scores = quizAttempts.map((a: any) => a.score_percent as number);
    const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;

    if (avgScore < 50) {
        issues.push('متوسط الدرجات منخفض جداً (%' + Math.round(avgScore) + ')');
        recommendations.push('راجع صعوبة الأسئلة — قد تكون صعبة للغاية');
    } else if (avgScore > 90) {
        issues.push('متوسط الدرجات مرتفع جداً (%' + Math.round(avgScore) + ')');
        recommendations.push('أضف أسئلة تحدي لرفع مستوى التفاعل');
    }

    // ============================
    // 2. Score Distribution
    // ============================
    const distribution = { low: 0, mid: 0, high: 0 };
    scores.forEach((s: number) => {
        if (s < 50) distribution.low++;
        else if (s < 80) distribution.mid++;
        else distribution.high++;
    });

    const total = scores.length || 1;
    const distributionBalance = 100 - Math.abs(distribution.low / total - 0.2) * 100
        - Math.abs(distribution.mid / total - 0.5) * 100
        - Math.abs(distribution.high / total - 0.3) * 100;
    const difficultyBalanceScore = Math.max(0, Math.min(100, Math.round(distributionBalance)));

    if (distribution.low / total > 0.4) {
        issues.push('نسبة كبيرة من الطلاب يحصلون على درجات منخفضة');
        recommendations.push('أضف مواد تعليمية إضافية قبل الاختبارات');
    }

    // ============================
    // 3. Drop-off Rate
    // ============================
    const lessonStudentCounts = new Map<number, number>();
    const lessonMap = new Map<string, number>(lessons.map((l: any, i: number) => [l.id, i] as [string, number]));

    progressRecords.forEach((p: any) => {
        const idx = lessonMap.get(p.lesson_id);
        if (idx !== undefined) {
            lessonStudentCounts.set(idx, (lessonStudentCounts.get(idx) || 0) + 1);
        }
    });

    const uniqueStudents = new Set(progressRecords.map((p: any) => p.user_id)).size;
    let maxDropoff = 0;
    let dropoffLesson = '';

    for (let i = 1; i < lessons.length; i++) {
        const prev = lessonStudentCounts.get(i - 1) || 0;
        const curr = lessonStudentCounts.get(i) || 0;
        if (prev > 0) {
            const dropRate = (prev - curr) / prev;
            if (dropRate > maxDropoff) {
                maxDropoff = dropRate;
                dropoffLesson = lessons[i].title_ar;
            }
        }
    }

    const dropoutRisk = Math.min(100, Math.round(maxDropoff * 100));

    if (dropoutRisk > 30) {
        issues.push(`معدل تسرب مرتفع عند الدرس: ${dropoffLesson}`);
        recommendations.push('راجع محتوى الدرس الذي يتسرب عنده الطلاب — قد يكون طويلاً أو صعباً');
    }

    // ============================
    // 4. Engagement Score
    // ============================
    const completionRate = uniqueStudents > 0
        ? progressRecords.filter((p: any) => p.progress_percent === 100).length / (uniqueStudents * lessons.length) * 100
        : 0;

    const passRate = quizAttempts.length > 0
        ? quizAttempts.filter((a: any) => a.passed).length / quizAttempts.length * 100
        : 0;

    const engagementScore = Math.min(100, Math.round((completionRate * 0.6 + passRate * 0.4)));

    if (engagementScore < 40) {
        issues.push('مستوى التفاعل منخفض');
        recommendations.push('أضف محتوى تفاعلي ومقاطع فيديو قصيرة');
    }

    // ============================
    // 5. Overall Quality Score
    // ============================
    const qualityScore = Math.min(100, Math.round(
        engagementScore * 0.35 +
        difficultyBalanceScore * 0.25 +
        (100 - dropoutRisk) * 0.25 +
        Math.min(100, avgScore) * 0.15
    ));

    // If no students yet
    if (uniqueStudents === 0) {
        issues.push('لا يوجد طلاب مسجلين بعد');
        recommendations.push('شارك رابط المادة لجذب الطلاب');
    }

    // ============================
    // 6. Cache result
    // ============================
    const report: CourseQualityReport = {
        qualityScore,
        difficultyBalanceScore,
        engagementScore,
        dropoutRisk,
        detectedIssues: issues,
        recommendations,
    };

    await (supabase.from('teacher_evaluations') as any)
        .upsert({
            subject_id: subjectId,
            quality_score: qualityScore,
            difficulty_balance_score: difficultyBalanceScore,
            engagement_score: engagementScore,
            dropout_risk: dropoutRisk,
            detected_issues: issues,
            recommendations,
            evaluated_at: new Date().toISOString(),
        }, { onConflict: 'subject_id' });

    return report;
}

// ============================================
// CACHED EVALUATION
// ============================================

export async function getCachedEvaluation(subjectId: string): Promise<CourseQualityReport | null> {
    const { data } = await (supabase
        .from('teacher_evaluations') as any)
        .select('*')
        .eq('subject_id', subjectId)
        .single();

    if (!data) return null;

    return {
        qualityScore: data.quality_score,
        difficultyBalanceScore: data.difficulty_balance_score,
        engagementScore: data.engagement_score,
        dropoutRisk: data.dropout_risk,
        detectedIssues: data.detected_issues || [],
        recommendations: data.recommendations || [],
    };
}

// ============================================
// SCORE LABEL HELPERS
// ============================================

export function getScoreColor(score: number): string {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
}

export function getScoreLabel(score: number, lang: 'ar' | 'en' = 'ar'): string {
    if (score >= 80) return lang === 'ar' ? 'ممتاز' : 'Excellent';
    if (score >= 60) return lang === 'ar' ? 'جيد' : 'Good';
    if (score >= 40) return lang === 'ar' ? 'متوسط' : 'Average';
    return lang === 'ar' ? 'يحتاج تحسين' : 'Needs Improvement';
}

export function getRiskLabel(risk: number, lang: 'ar' | 'en' = 'ar'): string {
    if (risk >= 50) return lang === 'ar' ? 'مرتفع' : 'High';
    if (risk >= 30) return lang === 'ar' ? 'متوسط' : 'Medium';
    return lang === 'ar' ? 'منخفض' : 'Low';
}
