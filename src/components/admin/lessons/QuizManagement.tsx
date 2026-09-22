import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Lesson } from '@/types/database';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BrainCircuit, Pencil } from 'lucide-react';
import QuizEditor from '@/components/admin/QuizEditor';

interface QuizManagementProps {
    lesson: Lesson;
}

/**
 * Quiz tab of the lesson settings panel.
 *
 * This used to be a second, full quiz editor that wrote a denormalised
 * `quiz_questions.options` array plus `correct_answer` — columns that do not
 * exist, so nothing it saved ever landed. Rather than maintain two editors
 * against one schema, it now summarises the quiz and hands editing to
 * QuizEditor, which is the single implementation backed by `quiz_options`.
 */
export default function QuizManagement({ lesson }: QuizManagementProps) {
    const { t } = useLanguage();
    const [editorOpen, setEditorOpen] = useState(false);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['lesson', lesson.id, 'quiz-summary'],
        queryFn: async () => {
            const { data: quiz, error } = await supabase
                .from('quizzes')
                .select('id, passing_score, attempts_allowed, quiz_questions(id)')
                .eq('lesson_id', lesson.id)
                .maybeSingle();

            if (error) throw error;
            return quiz;
        },
    });

    const questionCount = ((data as any)?.quiz_questions || []).length;

    const handleClose = () => {
        setEditorOpen(false);
        refetch();
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <BrainCircuit className="w-5 h-5 text-primary" />
                        {t('اختبار الدرس', 'Lesson Quiz')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-6">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : !data ? (
                        <div className="text-center py-6 space-y-4">
                            <p className="text-muted-foreground text-sm">
                                {t('لا يوجد اختبار لهذا الدرس', 'No quiz for this lesson')}
                            </p>
                            <Button onClick={() => setEditorOpen(true)}>
                                <BrainCircuit className="w-4 h-4 me-2" />
                                {t('إنشاء اختبار', 'Create Quiz')}
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-1 text-sm">
                                <p className="font-medium">
                                    {questionCount} {t('سؤال', 'questions')}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    {t('درجة النجاح', 'Pass score')}: {(data as any).passing_score ?? 60}%
                                    {' · '}
                                    {t('المحاولات', 'Attempts')}: {(data as any).attempts_allowed ?? 3}
                                </p>
                            </div>
                            <Button variant="outline" onClick={() => setEditorOpen(true)}>
                                <Pencil className="w-4 h-4 me-2" />
                                {t('تعديل الأسئلة', 'Edit Questions')}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <QuizEditor lessonId={lesson.id} isOpen={editorOpen} onClose={handleClose} />
        </>
    );
}
