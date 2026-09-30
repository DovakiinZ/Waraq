import { useState, useEffect } from 'react';
import { Lesson, LessonQuiz, LessonQuizQuestion, QuizQuestionType } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, GripVertical, Check, Globe, FileText, Video } from 'lucide-react';

import QuizManagement from './QuizManagement';

interface LessonSettingsProps {
    lesson: Lesson;
    onUpdate: (data: Partial<Lesson>) => void;
}

export default function LessonSettings({ lesson, onUpdate }: LessonSettingsProps) {
    const { t } = useLanguage();
    const [localLesson, setLocalLesson] = useState(lesson);

    useEffect(() => {
        setLocalLesson(lesson);
    }, [lesson]);

    const handleLessonChange = (field: keyof Lesson, value: any) => {
        setLocalLesson(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveLesson = async () => {
        try {
            await onUpdate(localLesson);
            toast.success(t('تم حفظ الإعدادات', 'Settings saved'));
        } catch (error) {
            toast.error(t('فشل الحفظ', 'Save failed'));
        }
    };

    return (
        <Tabs defaultValue="general" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="general">{t('عام', 'General')}</TabsTrigger>
                <TabsTrigger value="publish">{t('نشر', 'Publish')}</TabsTrigger>
                <TabsTrigger value="quiz">{t('الاختبار', 'Quiz')}</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 pt-4">
                {/* ... existing fields ... */}
                <div className="space-y-2">
                    <Label>{t('عنوان الدرس (عربي)', 'Lesson Title (AR)')}</Label>
                    <Input
                        value={localLesson.title_ar || ''}
                        onChange={e => handleLessonChange('title_ar', e.target.value)}
                        dir="rtl"
                    />
                </div>
                <div className="space-y-2">
                    <Label>{t('عنوان الدرس (إنجليزي)', 'Lesson Title (EN)')}</Label>
                    <Input
                        value={(localLesson as any).title_en || ''}
                        onChange={e => handleLessonChange('title_en' as any, e.target.value)}
                        dir="ltr"
                    />
                </div>
                <div className="space-y-2">
                    <Label>{t('مدة الدرس (دقائق)', 'Duration (mins)')}</Label>
                    <Input
                        type="number"
                        value={localLesson.duration_minutes || ''}
                        onChange={e => handleLessonChange('duration_minutes', parseInt(e.target.value) || 0)}
                    />
                </div>
                <div className="space-y-2">
                    <Label>{t('رابط الفيديو الأصلي (يوتيوب)', 'Original Video URL')}</Label>
                    <Input
                        value={localLesson.video_url || ''}
                        onChange={e => handleLessonChange('video_url', e.target.value)}
                        placeholder="https://youtube.com/..."
                    />
                    {/* The public lesson page used to show a padlock over a black
                        box when this was empty, which told visitors the video was
                        withheld rather than absent. That box is gone now, so the
                        teacher is the one who needs to know. */}
                    {!localLesson.video_url && (
                        <p className="text-xs text-muted-foreground flex items-start gap-1.5 pt-1">
                            <Video className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>
                                {t(
                                    'لا يوجد فيديو لهذا الدرس. أضف رابط يوتيوب ليظهر مشغّل الفيديو للطلاب والزوار — بدونه يعرض الدرس النص فقط.',
                                    'This lesson has no video. Add a YouTube link to show a player to students and visitors — without one the lesson shows text only.'
                                )}
                            </span>
                        </p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>{t('ترتيب الدرس', 'Order Index')}</Label>
                    <Input
                        type="number"
                        value={(localLesson as any).sort_order || 0}
                        onChange={e => handleLessonChange('sort_order' as any, parseInt(e.target.value) || 0)}
                    />
                </div>

                <div className="border-t border-border pt-4 mt-4 space-y-3">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                        {t('الأهداف التعليمية', 'Learning Objectives')}
                    </Label>
                    <Textarea
                        value={(localLesson as any).objectives_ar || ''}
                        onChange={e => handleLessonChange('objectives_ar' as any, e.target.value)}
                        placeholder={t('اكتب الأهداف (سطر لكل هدف)', 'Write objectives (one per line)')}
                        dir="rtl"
                        className="min-h-[60px] resize-none text-sm"
                    />
                </div>

                <Button onClick={handleSaveLesson} className="w-full mt-4">
                    {t('حفظ التغييرات', 'Save Changes')}
                </Button>
            </TabsContent>

            {/* Publish Tab */}
            <TabsContent value="publish" className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>{t('نشر الدرس', 'Publish Lesson')}</Label>
                        <p className="text-xs text-muted-foreground">
                            {t('اجعل هذا الدرس مرئياً للطلاب', 'Make this lesson visible to students')}
                        </p>
                    </div>
                    <Switch
                        checked={localLesson.is_published}
                        onCheckedChange={c => {
                            handleLessonChange('is_published', c);
                            onUpdate({ is_published: c });
                        }}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>{t('درس مدفوع', 'Paid Lesson')}</Label>
                        <p className="text-xs text-muted-foreground">
                            {t('تطلب اشتراكاً لمشاهدة هذا الدرس', 'Requires subscription to view this lesson')}
                        </p>
                    </div>
                    <Switch
                        checked={localLesson.is_paid}
                        onCheckedChange={c => {
                            handleLessonChange('is_paid', c);
                            onUpdate({ is_paid: c });
                        }}
                    />
                </div>
                <div className="flex items-center justify-between py-2">
                    <div>
                        <Label className="text-sm">{t('معاينة مجانية', 'Free Preview')}</Label>
                        <p className="text-xs text-muted-foreground">{t('متاح للجميع', 'Available to all')}</p>
                    </div>
                    <Switch
                        checked={localLesson.is_free_preview || false}
                        onCheckedChange={c => handleLessonChange('is_free_preview', c)}
                    />
                </div>

                <Button onClick={handleSaveLesson} className="w-full mt-4">
                    {t('حفظ التغييرات', 'Save Changes')}
                </Button>
            </TabsContent>

            {/* Quiz Tab */}
            <TabsContent value="quiz" className="pt-4">
                <QuizManagement lesson={lesson} />
            </TabsContent>
        </Tabs>
    );
}
