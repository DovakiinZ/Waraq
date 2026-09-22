import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { verifiedInsert, verifiedUpdate, verifiedDelete } from '@/lib/adminDb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, BrainCircuit, Save } from 'lucide-react';
import { toast } from 'sonner';

interface QuizEditorProps {
    lessonId: string;
    isOpen: boolean;
    onClose: () => void;
}

type QuestionType = 'mcq' | 'true_false' | 'multi_select';

// Answers live in the `quiz_options` table, not on the question row.
interface OptionDraft {
    id?: string;
    text_ar: string;
    text_en: string;
    is_correct: boolean;
}

interface Question {
    id?: string;
    type: QuestionType;
    question_ar: string;
    question_en: string;
    explanation_ar: string;
    explanation_en: string;
    sort_order: number;
    options: OptionDraft[];
    // Options deleted in the UI, removed from the database on save.
    removedOptionIds?: string[];
}

const blankOption = (): OptionDraft => ({ text_ar: '', text_en: '', is_correct: false });

const trueFalseOptions = (): OptionDraft[] => [
    { text_ar: 'صح', text_en: 'True', is_correct: true },
    { text_ar: 'خطأ', text_en: 'False', is_correct: false },
];

export default function QuizEditor({ lessonId, isOpen, onClose }: QuizEditorProps) {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [quizId, setQuizId] = useState<string | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);

    useEffect(() => {
        if (isOpen && lessonId) {
            fetchQuiz();
        }
    }, [isOpen, lessonId]);

    const fetchQuiz = async () => {
        setLoading(true);
        try {
            const { data: quiz } = await supabase
                .from('quizzes')
                .select('id')
                .eq('lesson_id', lessonId)
                .maybeSingle();

            if (quiz) {
                setQuizId(quiz.id);

                const { data: qData, error } = await supabase
                    .from('quiz_questions')
                    .select('*, quiz_options(*)')
                    .eq('quiz_id', quiz.id)
                    .order('sort_order', { ascending: true });

                if (error) throw error;

                setQuestions(
                    (qData || []).map((q: any) => ({
                        id: q.id,
                        type: (q.type || 'mcq') as QuestionType,
                        question_ar: q.question_ar || '',
                        question_en: q.question_en || '',
                        explanation_ar: q.explanation_ar || '',
                        explanation_en: q.explanation_en || '',
                        sort_order: q.sort_order ?? 0,
                        options: ((q.quiz_options || []) as any[])
                            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                            .map((o) => ({
                                id: o.id,
                                text_ar: o.text_ar || '',
                                text_en: o.text_en || '',
                                is_correct: !!o.is_correct,
                            })),
                        removedOptionIds: [],
                    }))
                );
            } else {
                setQuizId(null);
                setQuestions([]);
            }
        } catch (error) {
            console.error('Error loading quiz:', error);
            toast.error(t('فشل تحميل الاختبار', 'Failed to load the quiz'));
        } finally {
            setLoading(false);
        }
    };

    const handleCreateQuiz = async () => {
        setSaving(true);
        try {
            const result = await verifiedInsert(
                'quizzes',
                { lesson_id: lessonId, title_ar: 'Quiz', title_en: 'Quiz' },
                { successMessage: { ar: 'تم إنشاء الاختبار', en: 'Quiz created' } }
            );

            if (result.success && result.data) {
                setQuizId(result.data.id);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleAddQuestion = () => {
        setQuestions([
            ...questions,
            {
                type: 'mcq',
                question_ar: '',
                question_en: '',
                explanation_ar: '',
                explanation_en: '',
                sort_order: questions.length + 1,
                options: [blankOption(), blankOption(), blankOption(), blankOption()],
                removedOptionIds: [],
            },
        ]);
    };

    const handleUpdateQuestion = (index: number, field: keyof Question, value: any) => {
        const updated = [...questions];
        updated[index] = { ...updated[index], [field]: value };
        setQuestions(updated);
    };

    const handleChangeType = (index: number, type: QuestionType) => {
        const updated = [...questions];
        const q = updated[index];
        // Switching type replaces the choices, so remember what to delete on save.
        const removed = [...(q.removedOptionIds || []), ...q.options.map((o) => o.id).filter(Boolean) as string[]];
        updated[index] = {
            ...q,
            type,
            options: type === 'true_false'
                ? trueFalseOptions()
                : [blankOption(), blankOption(), blankOption(), blankOption()],
            removedOptionIds: removed,
        };
        setQuestions(updated);
    };

    const handleUpdateOption = (qIndex: number, optIndex: number, field: keyof OptionDraft, value: any) => {
        const updated = [...questions];
        const options = [...updated[qIndex].options];
        options[optIndex] = { ...options[optIndex], [field]: value };
        updated[qIndex] = { ...updated[qIndex], options };
        setQuestions(updated);
    };

    // mcq / true_false allow exactly one correct answer; multi_select allows many.
    const handleMarkCorrect = (qIndex: number, optIndex: number, checked: boolean) => {
        const updated = [...questions];
        const q = updated[qIndex];
        const options = q.options.map((o, i) =>
            q.type === 'multi_select'
                ? (i === optIndex ? { ...o, is_correct: checked } : o)
                : { ...o, is_correct: i === optIndex }
        );
        updated[qIndex] = { ...q, options };
        setQuestions(updated);
    };

    const handleAddOption = (qIndex: number) => {
        const updated = [...questions];
        updated[qIndex] = { ...updated[qIndex], options: [...updated[qIndex].options, blankOption()] };
        setQuestions(updated);
    };

    const handleRemoveOption = (qIndex: number, optIndex: number) => {
        const updated = [...questions];
        const q = updated[qIndex];
        const target = q.options[optIndex];
        updated[qIndex] = {
            ...q,
            options: q.options.filter((_, i) => i !== optIndex),
            removedOptionIds: target.id ? [...(q.removedOptionIds || []), target.id] : q.removedOptionIds,
        };
        setQuestions(updated);
    };

    const handleSaveQuestion = async (index: number) => {
        if (!quizId) return;
        const q = questions[index];

        if (!q.question_ar.trim()) {
            toast.error(t('الرجاء إدخال نص السؤال', 'Please enter question text'));
            return;
        }

        const filled = q.options.filter((o) => o.text_ar.trim());
        if (filled.length < 2) {
            toast.error(t('أضف خيارين على الأقل', 'Add at least two options'));
            return;
        }
        if (!filled.some((o) => o.is_correct)) {
            toast.error(t('حدد الإجابة الصحيحة', 'Mark the correct answer'));
            return;
        }

        setSaving(true);
        try {
            const questionRow = {
                type: q.type,
                question_ar: q.question_ar.trim(),
                question_en: q.question_en.trim() || null,
                explanation_ar: q.explanation_ar.trim() || null,
                explanation_en: q.explanation_en.trim() || null,
                sort_order: q.sort_order,
            };

            let questionId = q.id;
            if (questionId) {
                await verifiedUpdate('quiz_questions', questionId, questionRow);
            } else {
                const result = await verifiedInsert('quiz_questions', { quiz_id: quizId, ...questionRow });
                if (!result.success || !result.data) return;
                questionId = result.data.id;
            }

            // Reconcile the choices: delete removed, update existing, insert new.
            for (const removedId of q.removedOptionIds || []) {
                await verifiedDelete('quiz_options', removedId, { showErrorToast: false });
            }

            const savedOptions: OptionDraft[] = [];
            for (let i = 0; i < filled.length; i++) {
                const opt = filled[i];
                const optionRow = {
                    text_ar: opt.text_ar.trim(),
                    text_en: opt.text_en.trim() || null,
                    is_correct: opt.is_correct,
                    sort_order: i,
                };
                if (opt.id) {
                    await verifiedUpdate('quiz_options', opt.id, optionRow);
                    savedOptions.push(opt);
                } else {
                    const inserted = await verifiedInsert('quiz_options', {
                        question_id: questionId,
                        ...optionRow,
                    });
                    savedOptions.push({ ...opt, id: inserted.data?.id });
                }
            }

            const updated = [...questions];
            updated[index] = { ...q, id: questionId, options: savedOptions, removedOptionIds: [] };
            setQuestions(updated);

            toast.success(t('تم حفظ السؤال', 'Question saved'));
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteQuestion = async (index: number) => {
        const q = questions[index];
        if (q.id) {
            if (!confirm(t('هل أنت متأكد من حذف هذا السؤال؟', 'Are you sure you want to delete this question?'))) return;
            setSaving(true);
            // Remove the choices first in case the FK is not ON DELETE CASCADE.
            for (const opt of q.options) {
                if (opt.id) await verifiedDelete('quiz_options', opt.id, { showErrorToast: false });
            }
            await verifiedDelete('quiz_questions', q.id);
            setSaving(false);
        }
        setQuestions(questions.filter((_, i) => i !== index));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('إدارة الاختبار', 'Manage Quiz')}</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
                ) : !quizId ? (
                    <div className="text-center p-12 border-2 border-dashed rounded-xl">
                        <BrainCircuit className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">{t('لا يوجد اختبار لهذا الدرس', 'No quiz for this lesson')}</p>
                        <Button onClick={handleCreateQuiz} disabled={saving}>
                            <Plus className="w-4 h-4 me-2" />
                            {t('إنشاء اختبار', 'Create Quiz')}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="font-medium">{questions.length} {t('أسئلة', 'Questions')}</h3>
                            <Button size="sm" onClick={handleAddQuestion}><Plus className="w-4 h-4 me-2" /> {t('سؤال جديد', 'New Question')}</Button>
                        </div>

                        <Accordion type="single" collapsible className="w-full">
                            {questions.map((q, idx) => (
                                <AccordionItem key={q.id || `new-${idx}`} value={`item-${idx}`}>
                                    <AccordionTrigger className="hover:no-underline">
                                        <span className="truncate max-w-[200px] text-start">
                                            {q.question_ar || t('سؤال جديد', 'New Question')}
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 bg-secondary/10 rounded-md space-y-4">
                                        <div className="space-y-2">
                                            <Label>{t('نوع السؤال', 'Question Type')}</Label>
                                            <Select
                                                value={q.type}
                                                onValueChange={(v) => handleChangeType(idx, v as QuestionType)}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="mcq">{t('اختيار من متعدد', 'Multiple Choice')}</SelectItem>
                                                    <SelectItem value="true_false">{t('صح / خطأ', 'True / False')}</SelectItem>
                                                    <SelectItem value="multi_select">{t('إجابات متعددة', 'Multi-select')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>{t('السؤال (عربي)', 'Question (AR)')}</Label>
                                                <Input value={q.question_ar} onChange={(e) => handleUpdateQuestion(idx, 'question_ar', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('السؤال (إنجليزي)', 'Question (EN)')}</Label>
                                                <Input value={q.question_en} onChange={(e) => handleUpdateQuestion(idx, 'question_en', e.target.value)} />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>
                                                {q.type === 'multi_select'
                                                    ? t('الخيارات — حدد كل الإجابات الصحيحة', 'Options — mark every correct answer')
                                                    : t('الخيارات — حدد الإجابة الصحيحة', 'Options — mark the correct answer')}
                                            </Label>
                                            {q.options.map((opt, optIdx) => (
                                                <div key={opt.id || `opt-${optIdx}`} className="flex items-center gap-2">
                                                    <input
                                                        type={q.type === 'multi_select' ? 'checkbox' : 'radio'}
                                                        name={`correct-${idx}`}
                                                        checked={opt.is_correct}
                                                        onChange={(e) => handleMarkCorrect(idx, optIdx, e.target.checked)}
                                                        className="w-4 h-4 shrink-0"
                                                    />
                                                    <Input
                                                        value={opt.text_ar}
                                                        onChange={(e) => handleUpdateOption(idx, optIdx, 'text_ar', e.target.value)}
                                                        placeholder={t('الخيار (عربي)', 'Option (AR)')}
                                                        disabled={q.type === 'true_false'}
                                                    />
                                                    <Input
                                                        value={opt.text_en}
                                                        onChange={(e) => handleUpdateOption(idx, optIdx, 'text_en', e.target.value)}
                                                        placeholder={t('الخيار (إنجليزي)', 'Option (EN)')}
                                                        disabled={q.type === 'true_false'}
                                                    />
                                                    {q.type !== 'true_false' && q.options.length > 2 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="shrink-0"
                                                            onClick={() => handleRemoveOption(idx, optIdx)}
                                                        >
                                                            <Trash2 className="w-4 h-4 text-destructive" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                            {q.type !== 'true_false' && (
                                                <Button variant="outline" size="sm" onClick={() => handleAddOption(idx)}>
                                                    <Plus className="w-4 h-4 me-2" />
                                                    {t('إضافة خيار', 'Add Option')}
                                                </Button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>{t('شرح الإجابة (عربي)', 'Explanation (AR)')}</Label>
                                                <Textarea value={q.explanation_ar} onChange={(e) => handleUpdateQuestion(idx, 'explanation_ar', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('شرح الإجابة (إنجليزي)', 'Explanation (EN)')}</Label>
                                                <Textarea value={q.explanation_en} onChange={(e) => handleUpdateQuestion(idx, 'explanation_en', e.target.value)} />
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button variant="destructive" size="sm" onClick={() => handleDeleteQuestion(idx)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" onClick={() => handleSaveQuestion(idx)} disabled={saving}>
                                                <Save className="w-4 h-4 me-2" />
                                                {t('حفظ السؤال', 'Save Question')}
                                            </Button>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
