/**
 * The "you need to buy this course" state for a lesson whose content RLS
 * withheld.
 *
 * After migration 109, an unentitled reader gets a lesson ROW (titles are
 * public) with ZERO blocks and ZERO sections — not an error. Without this the
 * page renders an empty content area and reads as broken rather than locked.
 *
 * Deliberately says nothing about WHY beyond "not enrolled": the distinction
 * between "not published", "not purchased" and "subject inactive" is not the
 * student's problem, and guessing wrong would be worse than a clear CTA.
 */

import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface LessonLockedProps {
    /** Used to build the course link. Omitted → falls back to the marketplace. */
    subjectId?: string | null;
    /** Rendered above the CTA when known. */
    subjectTitle?: string | null;
}

export function LessonLocked({ subjectId, subjectTitle }: LessonLockedProps) {
    const { t } = useLanguage();
    const { isAuthenticated } = useAuth();

    // A signed-in student belongs on the in-app course page; a guest has no
    // /student/* access at all and must land on the public one.
    const courseHref = subjectId
        ? (isAuthenticated ? `/student/course/${subjectId}` : `/course/${subjectId}`)
        : (isAuthenticated ? '/student/marketplace' : '/marketplace');

    return (
        <div className="border-2 border-dashed border-border rounded-lg p-8 md:p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Lock className="w-6 h-6 text-muted-foreground" />
            </div>

            <h3 className="text-lg font-bold mb-2">
                {t('هذا الدرس مقفل', 'This lesson is locked')}
            </h3>

            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                {subjectTitle
                    ? t(
                        `اشترك في «${subjectTitle}» لفتح محتوى هذا الدرس كاملاً.`,
                        `Enrol in “${subjectTitle}” to unlock the full lesson content.`
                    )
                    : t(
                        'اشترك في هذه المادة لفتح محتوى الدرس كاملاً.',
                        'Enrol in this course to unlock the full lesson content.'
                    )}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2">
                <Button asChild>
                    <Link to={courseHref}>
                        {t('عرض المادة والاشتراك', 'View course & enrol')}
                    </Link>
                </Button>
                {!isAuthenticated && (
                    <Button asChild variant="outline">
                        <Link to="/login">{t('تسجيل الدخول', 'Log in')}</Link>
                    </Button>
                )}
            </div>

            {!isAuthenticated && (
                <p className="text-xs text-muted-foreground mt-4">
                    {t(
                        'إذا كنت مشتركاً بالفعل، سجّل الدخول لعرض الدرس.',
                        'Already enrolled? Log in to view the lesson.'
                    )}
                </p>
            )}
        </div>
    );
}
