import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, GraduationCap, User2, School } from 'lucide-react';
import { toast } from 'sonner';
import type { StudentGender, StudentStage, Profile } from '@/types/database';
import logo from '@/assets/logo.png';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const onboardingSchema = z.object({
    gender: z.enum(['male', 'female', 'unspecified']),
    stage: z.enum(['kindergarten', 'primary', 'middle', 'high'], {
        required_error: 'يرجى اختيار المرحلة الدراسية',
    }),
    grade: z.number().nullable().optional(),
});

type OnboardingForm = z.infer<typeof onboardingSchema>;

const GRADE_OPTIONS: Record<StudentStage, { value: number; ar: string; en: string }[]> = {
    kindergarten: [
        { value: 0, ar: 'التمهيدي (KG)', en: 'Kindergarten' },
    ],
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

export default function StudentOnboarding() {
    const { profile, refreshProfile } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<OnboardingForm>({
        resolver: zodResolver(onboardingSchema),
        defaultValues: {
            gender: 'unspecified',
            stage: undefined,
            grade: null,
        }
    });

    const selectedStage = watch('stage');
    const selectedGender = watch('gender');
    const selectedGrade = watch('grade');

    const onSubmit = async (data: OnboardingForm) => {
        if (!profile?.id) return;

        setSaving(true);
        try {
            const { error } = await (supabase
                .from('profiles') as any)
                .update({
                    gender: data.gender,
                    student_stage: data.stage,
                    grade: data.grade,
                })
                .eq('id', profile.id);

            if (error) throw error;

            await refreshProfile();
            toast.success(t('تم حفظ البيانات بنجاح! تصفح المتجر الآن', 'Profile saved! Browse the marketplace now'));
            navigate('/student/marketplace', { replace: true });
        } catch (err: any) {
            console.error('Onboarding save error:', err);
            toast.error(t('فشل حفظ البيانات — حاول مرة أخرى', 'Failed to save — please try again'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/3 flex items-center justify-center p-4" dir="rtl">
            <div className="w-full max-w-lg">
                {/* Logo */}
                <div className="text-center mb-6">
                    <img src={logo} alt="Waraq Academy" className="h-16 mx-auto mb-3" />
                    <h1 className="text-2xl font-bold text-foreground">
                        {t('أهلاً بك في ورق أكاديمي! 🎉', 'Welcome to Waraq Academy! 🎉')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2">
                        {t('أخبرنا عن نفسك لتخصيص تجربتك التعليمية', 'Tell us about yourself to personalize your learning')}
                    </p>
                </div>

                {/* Form Card */}
                <form onSubmit={handleSubmit(onSubmit)} className="bg-background rounded-2xl border border-border shadow-lg p-6 space-y-6">

                    {/* ===== GENDER ===== */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <User2 className="w-4 h-4 text-primary" />
                            {t('الجنس', 'Gender')}
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                            {([
                                { value: 'male' as const, ar: 'ذكر', en: 'Male', icon: '👦' },
                                { value: 'female' as const, ar: 'أنثى', en: 'Female', icon: '👧' },
                                { value: 'unspecified' as const, ar: 'غير محدد', en: 'Unspecified', icon: '🙂' },
                            ]).map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setValue('gender', opt.value)}
                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm ${selectedGender === opt.value
                                        ? 'border-primary bg-primary/5 text-primary font-semibold shadow-sm'
                                        : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:bg-primary/3'
                                        }`}
                                >
                                    <span className="text-xl">{opt.icon}</span>
                                    {t(opt.ar, opt.en)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ===== STAGE ===== */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <School className="w-4 h-4 text-primary" />
                            {t('المرحلة الدراسية', 'School Stage')}
                            <span className="text-destructive">*</span>
                        </Label>
                        <div className="grid grid-cols-4 gap-2">
                            {([
                                { value: 'kindergarten' as const, ar: 'تمهيدي', en: 'KG', icon: '🎨' },
                                { value: 'primary' as const, ar: 'ابتدائي', en: 'Primary', icon: '🌱' },
                                { value: 'middle' as const, ar: 'متوسط', en: 'Middle', icon: '📖' },
                                { value: 'high' as const, ar: 'ثانوي', en: 'High', icon: '🎓' },
                            ]).map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        setValue('stage', opt.value);
                                        setValue('grade', null);
                                    }}
                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm ${selectedStage === opt.value
                                        ? 'border-primary bg-primary/5 text-primary font-semibold shadow-sm'
                                        : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:bg-primary/3'
                                        }`}
                                >
                                    <span className="text-xl">{opt.icon}</span>
                                    {t(opt.ar, opt.en)}
                                </button>
                            ))}
                        </div>
                        {errors.stage && (
                            <p className="text-xs text-destructive mt-1">{t(errors.stage.message || '', errors.stage.message || '')}</p>
                        )}
                    </div>

                    {/* ===== GRADE (conditional) ===== */}
                    {selectedStage && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <GraduationCap className="w-4 h-4 text-primary" />
                                {t('الصف الدراسي (اختياري)', 'Grade (optional)')}
                            </Label>
                            <Select
                                value={selectedGrade?.toString() || ''}
                                onValueChange={(v) => setValue('grade', v ? parseInt(v) : null)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t('اختر الصف...', 'Select grade...')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {GRADE_OPTIONS[selectedStage].map((g) => (
                                        <SelectItem key={g.value} value={g.value.toString()}>
                                            {t(g.ar, g.en)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* ===== SUBMIT ===== */}
                    <Button
                        type="submit"
                        className="w-full h-12 text-base font-semibold"
                        disabled={saving || !selectedStage}
                    >
                        {saving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            t('ابدأ رحلتك التعليمية 🚀', 'Start Learning 🚀')
                        )}
                    </Button>
                </form>

                <p className="text-xs text-muted-foreground text-center mt-4">
                    {t('يمكنك تعديل هذه البيانات لاحقاً من ملفك الشخصي', 'You can update this later from your profile')}
                </p>
            </div>
        </div>
    );
}
