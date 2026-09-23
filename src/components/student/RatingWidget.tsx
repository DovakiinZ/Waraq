import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface RatingWidgetProps {
    lessonId: string;
    title?: string;
}

export default function RatingWidget({ lessonId, title }: RatingWidgetProps) {
    const { t } = useLanguage();
    const { profile } = useAuth();
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [existingId, setExistingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (profile?.id && lessonId) {
            fetchRating();
        }
    }, [lessonId, profile?.id]);

    const fetchRating = async () => {
        const { data, error } = await supabase
            .from('ratings')
            .select('*')
            .eq('user_id', profile!.id)
            .eq('entity_type', 'lesson')
            .eq('entity_id', lessonId)
            .single();

        if (data) {
            setRating(data.stars);
            setComment(data.comment || '');
            setExistingId(data.id);
        }

        if (error && error.code !== 'PGRST116') {
            // PGRST116 is "not found" which is OK
            console.error('Error fetching rating:', error);
            toast.error(t('خطأ في تحميل التقييم', 'Error loading rating'));
        }
    };

    const handleSave = async () => {
        if (!rating || !profile?.id) return;
        setSaving(true);

        const payload = {
            user_id: profile.id,
            entity_type: 'lesson' as const,
            entity_id: lessonId,
            stars: rating,
            comment: comment.trim() || null
        };

        const { error } = existingId
            ? await supabase.from('ratings').update(payload).eq('id', existingId)
            : await supabase.from('ratings').insert(payload);

        setSaving(false);

        if (!error) {
            toast.success(t('تم إرسال التقييم بنجاح', 'Rating submitted successfully'));
            setIsOpen(false);
        } else {
            console.error('Error saving rating:', error);
            toast.error(t('فشل في حفظ التقييم', 'Failed to save rating'));
        }
    };

    if (!isOpen && !rating) {
        return (
            <div className="text-center py-6 border-t border-border mt-8">
                <p className="text-muted-foreground mb-3">{t('ما رأيك في هذا المحتوى؟', 'How would you rate this content?')}</p>
                <div className="flex justify-center gap-1 cursor-pointer" onClick={() => setIsOpen(true)}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="w-6 h-6 text-muted-foreground hover:text-yellow-400 transition-colors" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background rounded-lg border border-border p-6 mt-8">
            <h3 className="font-semibold mb-4 text-center">
                {title || t('تقييم المحتوى', 'Rate Content')}
            </h3>

            <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                    >
                        <Star
                            className={`w-8 h-8 ${star <= (hoverRating || rating)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-muted-foreground'
                                }`}
                        />
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t('اكتب ملاحظاتك (اختياري)...', 'Write your feedback (optional)...')}
                    className="w-full"
                />

                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>
                        {t('إلغاء', 'Cancel')}
                    </Button>
                    <Button onClick={handleSave} disabled={!rating || saving}>
                        {saving ? t('جاري الحفظ...', 'Saving...') : t('إرسال التقييم', 'Submit Rating')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
