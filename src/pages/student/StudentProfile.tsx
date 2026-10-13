import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STAGES, GRADE_OPTIONS, GENDERS, type StageKey } from '@/lib/studentStages';
import { Loader2, User, Check } from 'lucide-react';

export default function StudentProfile() {
    const { t } = useLanguage();
    const { profile, refreshProfile } = useAuth();

    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [stage, setStage] = useState<StageKey | null>((profile?.student_stage as StageKey) ?? null);
    const [gender, setGender] = useState(profile?.gender ?? 'unspecified');
    const [grade, setGrade] = useState<number | null>(profile?.grade ?? null);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        if (!profile?.id) return;

        setIsSaving(true);
        setSaved(false);

        const { error } = await (supabase.from('profiles') as any)
            .update({
                full_name: fullName,
                student_stage: stage,
                gender,
                // Clearing the stage must clear the grade: a grade without a
                // stage is meaningless and would survive a stage change.
                grade: stage ? grade : null,
            })
            .eq('id', profile.id);

        if (error) {
            setIsSaving(false);
            toast.error(t('فشل الحفظ', 'Could not save'), { description: error.message });
            return;
        }

        await refreshProfile();
        setIsSaving(false);
        setSaved(true);

        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="max-w-xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">
                    {t('ملفي الشخصي', 'My Profile')}
                </h1>
                <p className="text-muted-foreground mt-1">
                    {t('إدارة معلوماتك الشخصية', 'Manage your personal information')}
                </p>
            </div>

            <div className="bg-background rounded-lg border border-border p-6 space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                        {profile?.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt={profile.full_name || ''}
                                className="w-full h-full rounded-full object-cover"
                            />
                        ) : (
                            <User className="w-8 h-8 text-muted-foreground" />
                        )}
                    </div>
                    <div>
                        <p className="font-medium text-foreground">{profile?.full_name || t('طالب', 'Student')}</p>
                        <p className="text-sm text-muted-foreground">{profile?.email}</p>
                    </div>
                </div>

                {/* Form */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="fullName">{t('الاسم الكامل', 'Full Name')}</Label>
                        <Input
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder={t('أدخل اسمك الكامل', 'Enter your full name')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>{t('المرحلة الدراسية', 'School stage')}</Label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {STAGES.map((s) => (
                                <button
                                    key={s.key}
                                    type="button"
                                    aria-pressed={stage === s.key}
                                    onClick={() => {
                                        setStage(s.key);
                                        // A grade from the previous stage is invalid under
                                        // the new one, so it goes with it.
                                        setGrade(null);
                                    }}
                                    className={`rounded-md border-2 p-2.5 text-sm transition-colors ${
                                        stage === s.key
                                            ? 'border-primary bg-primary/5 font-semibold text-primary'
                                            : 'border-border text-muted-foreground hover:border-primary/40'
                                    }`}
                                >
                                    {t(s.ar, s.en)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('الجنس', 'Gender')}</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {GENDERS.map((g) => (
                                <button
                                    key={g.value}
                                    type="button"
                                    aria-pressed={gender === g.value}
                                    onClick={() => setGender(g.value)}
                                    className={`rounded-md border-2 p-2.5 text-sm transition-colors ${
                                        gender === g.value
                                            ? 'border-primary bg-primary/5 font-semibold text-primary'
                                            : 'border-border text-muted-foreground hover:border-primary/40'
                                    }`}
                                >
                                    {t(g.ar, g.en)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {stage && (
                        <div className="space-y-2">
                            <Label>{t('الصف الدراسي (اختياري)', 'Grade (optional)')}</Label>
                            <Select
                                value={grade?.toString() ?? ''}
                                onValueChange={(v) => setGrade(v ? parseInt(v, 10) : null)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t('اختر الصف...', 'Select grade...')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {GRADE_OPTIONS[stage].map((g) => (
                                        <SelectItem key={g.value} value={g.value.toString()}>
                                            {t(g.ar, g.en)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>{t('البريد الإلكتروني', 'Email')}</Label>
                        <Input
                            value={profile?.email || ''}
                            disabled
                            className="bg-secondary/50"
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('البريد الإلكتروني غير قابل للتغيير', 'Email cannot be changed')}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('نوع الحساب', 'Account Type')}</Label>
                        <Input
                            value={t('طالب', 'Student')}
                            disabled
                            className="bg-secondary/50"
                        />
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full sm:w-auto"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : saved ? (
                            <>
                                <Check className="w-4 h-4 me-2" />
                                {t('تم الحفظ', 'Saved')}
                            </>
                        ) : (
                            t('حفظ التغييرات', 'Save Changes')
                        )}
                    </Button>
                </div>
            </div>

            {/* Account Info */}
            <div className="bg-background rounded-lg border border-border p-6">
                <h2 className="font-medium text-foreground mb-4">
                    {t('معلومات الحساب', 'Account Information')}
                </h2>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('تاريخ الانضمام', 'Joined')}</span>
                        <span className="text-foreground">
                            {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('اللغة المفضلة', 'Preferred Language')}</span>
                        <span className="text-foreground">
                            {profile?.language_pref === 'ar' ? 'العربية' : 'English'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
