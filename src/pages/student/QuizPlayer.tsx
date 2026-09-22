import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuizQuestions, useQuizDetail } from '@/hooks/useQueryHooks';
import { Loader2, CheckCircle, XCircle, RefreshCw, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface QuizPlayerProps {
    quizId?: string;
    lessonId?: string;
}

// The student's picks per question, as a set of quiz_options ids.
type AnswerMap = Record<string, string[]>;

export default function QuizPlayer({ quizId: propQuizId }: QuizPlayerProps) {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const params = useParams<{ quizId: string }>();
    const quizId = propQuizId || params.quizId;

    const { data: questions = [], isLoading: loading } = useQuizQuestions(quizId);
    const { data: quiz } = useQuizDetail(quizId);

    const [answers, setAnswers] = useState<AnswerMap>({});
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [score, setScore] = useState(0);
    const [passed, setPassed] = useState(false);

    const passingScore = quiz?.passing_score ?? 60;

    const optionText = (opt: any) =>
        language === 'ar' ? opt.text_ar : (opt.text_en || opt.text_ar);

    const sortedOptions = (q: any) =>
        [...(q.quiz_options || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    const correctIds = (q: any) =>
        sortedOptions(q).filter((o: any) => o.is_correct).map((o: any) => o.id);

    // Correct only when the picked set matches the correct set exactly —
    // which is what makes multi_select grade properly.
    const isQuestionCorrect = (q: any) => {
        const picked = answers[q.id] || [];
        const expected = correctIds(q);
        return expected.length > 0 &&
            picked.length === expected.length &&
            expected.every((id: string) => picked.includes(id));
    };

    const handleAnswer = (q: any, optionId: string, checked: boolean) => {
        if (submitted) return;
        setAnswers(prev => {
            if (q.type === 'multi_select') {
                const picked = prev[q.id] || [];
                return {
                    ...prev,
                    [q.id]: checked ? [...picked, optionId] : picked.filter(id => id !== optionId),
                };
            }
            return { ...prev, [q.id]: [optionId] };
        });
    };

    const handleSubmit = async () => {
        const answered = questions.filter((q: any) => (answers[q.id] || []).length > 0);
        if (answered.length < questions.length) {
            toast.error(t('الرجاء الإجابة على جميع الأسئلة', 'Please answer all questions'));
            return;
        }

        const correctCount = questions.filter((q: any) => isQuestionCorrect(q)).length;
        const scorePercent = Math.round((correctCount / questions.length) * 100);
        const didPass = scorePercent >= passingScore;

        setSubmitting(true);
        try {
            // Record the attempt — the old player graded locally and saved nothing,
            // so progress and certificate eligibility never saw the result.
            if (user?.id && quizId) {
                const { error } = await supabase.from('quiz_attempts').insert({
                    quiz_id: quizId,
                    student_id: user.id,
                    score_percent: scorePercent,
                    answers,
                    passed: didPass,
                    completed_at: new Date().toISOString(),
                });
                if (error) throw error;
            }
        } catch (err) {
            console.error('Failed to save quiz attempt:', err);
            toast.error(t('تعذر حفظ نتيجة الاختبار', 'Could not save your quiz result'));
        } finally {
            setSubmitting(false);
        }

        setScore(scorePercent);
        setPassed(didPass);
        setSubmitted(true);
    };

    const handleRetry = () => {
        setAnswers({});
        setSubmitted(false);
        setScore(0);
        setPassed(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (loading) {
        return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    if (questions.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">{t('لا توجد أسئلة في هذا الاختبار', 'No questions in this quiz')}</div>;
    }

    if (submitted) {
        return (
            <div className="text-center py-12 animate-in zoom-in-95 duration-300">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Award className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-3xl font-bold mb-2">{score}%</h2>
                <p className="text-muted-foreground mb-8">
                    {passed ? t('ممتاز! لقد اجتزت الاختبار', 'Excellent! You passed the quiz') : t('حاول مرة أخرى لتحسين نتيجتك', 'Try again to improve your score')}
                </p>

                <div className="max-w-2xl mx-auto text-start space-y-6 mb-12">
                    {questions.map((q: any, idx: number) => {
                        const isCorrect = isQuestionCorrect(q);
                        const picked = answers[q.id] || [];
                        const options = sortedOptions(q);
                        const yourAnswer = options
                            .filter((o: any) => picked.includes(o.id))
                            .map(optionText)
                            .join('، ');
                        const correctAnswer = options
                            .filter((o: any) => o.is_correct)
                            .map(optionText)
                            .join('، ');
                        return (
                            <div key={q.id} className={`p-4 rounded-lg border ${isCorrect ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:bg-red-900/20'}`}>
                                <div className="flex gap-3">
                                    {isCorrect ? <CheckCircle className="w-5 h-5 text-green-600 shrink-0" /> : <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
                                    <div className="flex-1">
                                        <p className="font-medium mb-1">{idx + 1}. {t(q.question_ar, q.question_en)}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {t('إجابتك:', 'Your answer:')} {yourAnswer}
                                        </p>
                                        {!isCorrect && (
                                            <p className="text-sm font-medium text-green-700 mt-1">
                                                {t('الإجابة الصحيحة:', 'Correct answer:')} {correctAnswer}
                                            </p>
                                        )}
                                        {(q.explanation_ar || q.explanation_en) && (
                                            <div className="mt-2 text-xs opacity-80 border-t border-current/20 pt-2">
                                                {t(q.explanation_ar || '', q.explanation_en || q.explanation_ar || '')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <Button onClick={handleRetry} variant="outline">
                    <RefreshCw className="w-4 h-4 me-2" />
                    {t('إعادة المحاولة', 'Retry Quiz')}
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {questions.map((q: any, idx: number) => {
                const options = sortedOptions(q);
                const picked = answers[q.id] || [];
                return (
                    <div key={q.id} className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                {idx + 1}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-medium mb-1">{t(q.question_ar, q.question_en)}</h3>
                                {q.type === 'multi_select' && (
                                    <p className="text-xs text-muted-foreground mb-3">
                                        {t('اختر كل الإجابات الصحيحة', 'Select every correct answer')}
                                    </p>
                                )}

                                {q.type === 'multi_select' ? (
                                    <div className="space-y-3">
                                        {options.map((option: any) => (
                                            <div key={option.id} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`q${q.id}-opt${option.id}`}
                                                    checked={picked.includes(option.id)}
                                                    onCheckedChange={(checked) => handleAnswer(q, option.id, checked === true)}
                                                />
                                                <Label htmlFor={`q${q.id}-opt${option.id}`} className="font-normal cursor-pointer flex-1 p-2 rounded hover:bg-secondary/50 transition-colors">
                                                    {optionText(option)}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <RadioGroup
                                        value={picked[0] || ''}
                                        onValueChange={(val) => handleAnswer(q, val, true)}
                                        className="space-y-3"
                                    >
                                        {options.map((option: any) => (
                                            <div key={option.id} className="flex items-center space-x-2 space-x-reverse">
                                                <RadioGroupItem value={option.id} id={`q${q.id}-opt${option.id}`} />
                                                <Label htmlFor={`q${q.id}-opt${option.id}`} className="font-normal cursor-pointer flex-1 p-2 rounded hover:bg-secondary/50 transition-colors">
                                                    {optionText(option)}
                                                </Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}

            <div className="flex justify-end pt-6 border-t border-border">
                <Button size="lg" onClick={handleSubmit} disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                    {t('تسليم الإجابات', 'Submit Answers')}
                </Button>
            </div>
        </div>
    );
}
