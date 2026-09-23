/**
 * TeacherApplication - Public teacher registration + application form.
 * Creates auth account + profile (is_active: false) + application record.
 * Teacher can log in immediately but is restricted until admin approves.
 *
 * Styled in the arcade (green + white) language to match the landing page.
 * The submit flow, zod rules, field ids, field order and grade values are
 * unchanged; validation messages are now bilingual, which they were not
 * before (the schema was Arabic-only), so the schema is built inside the
 * component where `t` is available.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/layout/Layout';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GraduationCap, CheckCircle, ArrowRight, ArrowLeft, Eye, EyeOff, Check } from 'lucide-react';
import { A, PIXEL_STRIP } from '@/components/arcade/theme';
import { ArcadeButton, ArcadeCard, ArcadeField, ArcadeLink } from '@/components/arcade/primitives';

const GRADE_OPTIONS = [
    { value: 'kindergarten', ar: 'تمهيدي', en: 'Kindergarten' },
    { value: 'primary', ar: 'ابتدائي', en: 'Primary (1-6)' },
    { value: 'middle', ar: 'متوسط', en: 'Middle (7-9)' },
    { value: 'high', ar: 'ثانوي', en: 'High School (10-12)' },
];

export default function TeacherApplication() {
    const { t, language, direction } = useLanguage();
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
    const [showPassword, setShowPassword] = useState(false);

    // Built here rather than at module scope so the messages can be bilingual.
    const applicationSchema = useMemo(
        () =>
            z
                .object({
                    full_name: z
                        .string()
                        .min(3, t('الاسم مطلوب (3 أحرف على الأقل)', 'Name is required (at least 3 characters)')),
                    email: z.string().email(t('بريد إلكتروني غير صالح', 'Invalid email address')),
                    password: z
                        .string()
                        .min(6, t('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'Password must be at least 6 characters')),
                    confirm_password: z.string(),
                    phone: z.string().min(6, t('رقم الهاتف مطلوب', 'Phone number is required')),
                    bio: z
                        .string()
                        .min(20, t('يرجى كتابة نبذة عنك (20 حرف على الأقل)', 'Please write a short bio (at least 20 characters)')),
                    profession: z.string().min(2, t('المهنة مطلوبة', 'Profession is required')),
                    major: z.string().optional(),
                    grades_taught: z
                        .string()
                        .min(1, t('يرجى اختيار مرحلة واحدة على الأقل', 'Please pick at least one stage')),
                })
                .refine((data) => data.password === data.confirm_password, {
                    message: t('كلمات المرور غير متطابقة', 'Passwords do not match'),
                    path: ['confirm_password'],
                }),
        [t],
    );

    type ApplicationFormData = z.infer<typeof applicationSchema>;

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<ApplicationFormData>({
        resolver: zodResolver(applicationSchema),
        defaultValues: {
            full_name: '',
            email: '',
            password: '',
            confirm_password: '',
            phone: '',
            bio: '',
            profession: '',
            major: '',
            grades_taught: '',
        },
    });

    const handleGradeToggle = (gradeValue: string, checked: boolean) => {
        const updated = checked
            ? [...selectedGrades, gradeValue]
            : selectedGrades.filter((g) => g !== gradeValue);
        setSelectedGrades(updated);
        setValue('grades_taught', updated.join(','), { shouldValidate: true });
    };

    const onSubmit = async (data: ApplicationFormData) => {
        setSubmitting(true);
        try {
            // 1. Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        full_name: data.full_name,
                        role: 'teacher',
                    },
                },
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Failed to create account');

            // 2. Create profile (is_active: false — pending approval)
            const { error: profileError } = await (supabase.from('profiles') as any)
                .insert({
                    id: authData.user.id,
                    email: data.email,
                    full_name: data.full_name,
                    role: 'teacher',
                    is_active: false,
                    bio_ar: data.bio,
                    language_pref: 'ar',
                })
                .select()
                .single();

            if (profileError) {
                console.error('Profile creation error:', profileError);
                // Profile might be auto-created by trigger, update it instead
                await (supabase.from('profiles') as any)
                    .update({
                        full_name: data.full_name,
                        role: 'teacher',
                        is_active: false,
                        bio_ar: data.bio,
                    })
                    .eq('id', authData.user.id);
            }

            // 3. Create application record
            const { error: appError } = await supabase
                .from('teacher_applications')
                .insert({
                    full_name: data.full_name,
                    email: data.email,
                    phone: data.phone,
                    bio: data.bio,
                    profession: data.profession,
                    major: data.major || null,
                    grades_taught: data.grades_taught,
                    status: 'pending',
                });

            if (appError) {
                console.error('Application insert error:', appError);
                // Don't throw — account is created, application is secondary
            }

            // Sign out so they can log in fresh
            await supabase.auth.signOut();

            setSubmitted(true);
        } catch (err: any) {
            console.error('Registration error:', err);
            if (err.message?.includes('already registered')) {
                toast.error(t(
                    'هذا البريد الإلكتروني مسجل بالفعل. جرب تسجيل الدخول.',
                    'This email is already registered. Try signing in.'
                ));
            } else {
                toast.error(
                    t('حدث خطأ في إنشاء الحساب', 'An error occurred creating your account'),
                    { description: err.message }
                );
            }
        } finally {
            setSubmitting(false);
        }
    };

    const BackArrow = direction === 'rtl' ? ArrowRight : ArrowLeft;
    const PasswordIcon = showPassword ? EyeOff : Eye;

    const SectionHeading = ({ children }: { children: React.ReactNode }) => (
        <h2 className="text-[18px] font-black tracking-tight" style={{ color: A.ink }}>
            {children}
        </h2>
    );

    if (submitted) {
        return (
            <Layout>
                <div className="flex min-h-[60vh] items-center justify-center px-5 py-16">
                    <div className="w-full max-w-[520px]">
                        <ArcadeCard className="p-9 text-center">
                            <span
                                className="mx-auto flex h-16 w-16 items-center justify-center border-2"
                                style={{ background: A.accent, color: A.onAccent, borderColor: A.line }}
                            >
                                <CheckCircle className="h-8 w-8" />
                            </span>
                            <h1
                                className="mt-6 text-[28px] font-black leading-tight tracking-tight"
                                style={{ color: A.ink }}
                            >
                                {t('تم إنشاء حسابك', 'Your account is created')}
                            </h1>
                            <p
                                className="mx-auto mt-4 max-w-[44ch] text-[15px] font-medium leading-relaxed"
                                style={{ color: A.inkSoft }}
                            >
                                {t(
                                    'حسابك قيد المراجعة من الإدارة. يمكنك تسجيل الدخول لمتابعة حالة طلبك وتعديل ملفك الشخصي.',
                                    'Your account is under review. You can log in to check your application status and edit your profile.',
                                )}
                            </p>
                            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                                <ArcadeLink to="/login" variant="solid">
                                    {t('تسجيل الدخول', 'Log in')}
                                </ArcadeLink>
                                <ArcadeLink to="/" variant="outline">
                                    <BackArrow className="h-4 w-4" />
                                    {t('الصفحة الرئيسية', 'Homepage')}
                                </ArcadeLink>
                            </div>
                        </ArcadeCard>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div dir={direction}>
                {/* Intro band */}
                <div className="relative overflow-hidden" style={{ background: A.grad }}>
                    <div
                        className="pointer-events-none absolute inset-0 opacity-[0.16]"
                        style={{
                            backgroundImage: `radial-gradient(${A.onInk} 1px, transparent 1px)`,
                            backgroundSize: '18px 18px',
                        }}
                        aria-hidden
                    />
                    <div className="relative mx-auto max-w-[760px] px-5 py-14 text-center lg:py-16">
                        <span
                            className="mx-auto flex h-14 w-14 items-center justify-center border-2"
                            style={{ background: A.accent, color: A.onAccent, borderColor: A.accent }}
                        >
                            <GraduationCap className="h-7 w-7" />
                        </span>
                        <h1
                            className="mt-6 text-[30px] font-black leading-tight tracking-tight sm:text-[40px]"
                            style={{ color: A.onInk }}
                        >
                            {t('انضم كمعلّم في ورق أكاديمي', 'Teach with Waraq Academy')}
                        </h1>
                        <p
                            className="mx-auto mt-4 max-w-[54ch] text-[16px] font-medium leading-relaxed"
                            style={{ color: A.onInkMuted }}
                        >
                            {t(
                                'أنشئ حسابك وأخبرنا عن نفسك. نراجع طلبك، وبعد الموافقة تبدأ بنشر موادك وتحديد أسعارك.',
                                'Create your account and tell us about yourself. We review your application, and once approved you publish your subjects and set your prices.',
                            )}
                        </p>
                    </div>
                    <div className="h-[6px] w-full opacity-40" style={{ background: PIXEL_STRIP }} aria-hidden />
                </div>

                <div className="mx-auto max-w-[760px] px-5 py-12 lg:py-16">
                    <ArcadeCard className="p-6 sm:p-9">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-9">
                            {/* Account section */}
                            <div>
                                <SectionHeading>{t('بيانات الحساب', 'Account details')}</SectionHeading>
                                <div className="mt-5 space-y-5">
                                    <ArcadeField
                                        id="full_name"
                                        label={`${t('الاسم الكامل', 'Full name')} *`}
                                        error={errors.full_name?.message}
                                    >
                                        <input
                                            id="full_name"
                                            className="arc-input"
                                            aria-invalid={!!errors.full_name}
                                            {...register('full_name')}
                                        />
                                    </ArcadeField>

                                    <ArcadeField
                                        id="email"
                                        label={`${t('البريد الإلكتروني', 'Email')} *`}
                                        error={errors.email?.message}
                                    >
                                        <input
                                            id="email"
                                            className="arc-input"
                                            type="email"
                                            dir="ltr"
                                            autoComplete="email"
                                            aria-invalid={!!errors.email}
                                            {...register('email')}
                                        />
                                    </ArcadeField>

                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                        <ArcadeField
                                            id="password"
                                            label={`${t('كلمة المرور', 'Password')} *`}
                                            error={errors.password?.message}
                                        >
                                            <div className="relative">
                                                <input
                                                    id="password"
                                                    className="arc-input pe-12"
                                                    type={showPassword ? 'text' : 'password'}
                                                    dir="ltr"
                                                    autoComplete="new-password"
                                                    aria-invalid={!!errors.password}
                                                    {...register('password')}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="arc-focus absolute top-1/2 -translate-y-1/2 end-3"
                                                    style={{ color: A.inkSoft }}
                                                    aria-label={
                                                        showPassword
                                                            ? t('إخفاء كلمة المرور', 'Hide password')
                                                            : t('إظهار كلمة المرور', 'Show password')
                                                    }
                                                    tabIndex={-1}
                                                >
                                                    <PasswordIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </ArcadeField>

                                        <ArcadeField
                                            id="confirm_password"
                                            label={`${t('تأكيد كلمة المرور', 'Confirm password')} *`}
                                            error={errors.confirm_password?.message}
                                        >
                                            <input
                                                id="confirm_password"
                                                className="arc-input"
                                                type={showPassword ? 'text' : 'password'}
                                                dir="ltr"
                                                autoComplete="new-password"
                                                aria-invalid={!!errors.confirm_password}
                                                {...register('confirm_password')}
                                            />
                                        </ArcadeField>
                                    </div>

                                    <ArcadeField
                                        id="phone"
                                        label={`${t('رقم الهاتف', 'Phone number')} *`}
                                        error={errors.phone?.message}
                                    >
                                        <input
                                            id="phone"
                                            className="arc-input"
                                            type="tel"
                                            dir="ltr"
                                            autoComplete="tel"
                                            aria-invalid={!!errors.phone}
                                            {...register('phone')}
                                        />
                                    </ArcadeField>
                                </div>
                            </div>

                            {/* Professional section */}
                            <div style={{ borderTop: `2px solid ${A.line}`, paddingTop: '2rem' }}>
                                <SectionHeading>{t('المعلومات المهنية', 'Professional info')}</SectionHeading>
                                <div className="mt-5 space-y-5">
                                    <ArcadeField
                                        id="profession"
                                        label={`${t('مهنتك أو ماذا تدرّس؟', 'Your profession, or what do you teach?')} *`}
                                        error={errors.profession?.message}
                                    >
                                        <input
                                            id="profession"
                                            className="arc-input"
                                            aria-invalid={!!errors.profession}
                                            {...register('profession')}
                                        />
                                    </ArcadeField>

                                    <ArcadeField id="major" label={t('تخصصك الجامعي', 'Your university major')}>
                                        <input id="major" className="arc-input" {...register('major')} />
                                    </ArcadeField>

                                    <ArcadeField
                                        id="bio"
                                        label={`${t('نبذة عنك', 'About you')} *`}
                                        error={errors.bio?.message}
                                    >
                                        <textarea
                                            id="bio"
                                            className="arc-input"
                                            rows={4}
                                            placeholder={t(
                                                'أخبرنا عن نفسك وخبرتك التعليمية',
                                                'Tell us about yourself and your teaching experience',
                                            )}
                                            aria-invalid={!!errors.bio}
                                            {...register('bio')}
                                        />
                                    </ArcadeField>

                                    {/* Grades. Native checkbox for keyboard and screen-reader
                                        support, visually replaced by a square arcade marker. */}
                                    <fieldset>
                                        <legend className="text-[13px] font-black" style={{ color: A.ink }}>
                                            {t('المراحل التي تدرّسها', 'Stages you teach')} *
                                        </legend>
                                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            {GRADE_OPTIONS.map((grade) => {
                                                const checked = selectedGrades.includes(grade.value);
                                                return (
                                                    <label
                                                        key={grade.value}
                                                        className="flex cursor-pointer items-center gap-3 border-2 p-3.5 transition-colors"
                                                        style={{
                                                            background: checked ? A.wash : A.surface,
                                                            borderColor: A.line,
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only"
                                                            checked={checked}
                                                            onChange={(e) =>
                                                                handleGradeToggle(grade.value, e.target.checked)
                                                            }
                                                        />
                                                        <span
                                                            className="flex h-[18px] w-[18px] shrink-0 items-center justify-center border-2"
                                                            style={{
                                                                background: checked ? A.accent : A.surface,
                                                                borderColor: A.line,
                                                                color: A.onAccent,
                                                            }}
                                                            aria-hidden
                                                        >
                                                            {checked && <Check className="h-3 w-3" strokeWidth={4} />}
                                                        </span>
                                                        <span
                                                            className="text-[14px] font-bold"
                                                            style={{ color: A.ink }}
                                                        >
                                                            {language === 'ar' ? grade.ar : grade.en}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        {errors.grades_taught && (
                                            <p
                                                className="mt-2 text-[12px] font-bold"
                                                style={{ color: 'hsl(var(--destructive))' }}
                                                role="alert"
                                            >
                                                {errors.grades_taught.message}
                                            </p>
                                        )}
                                    </fieldset>
                                </div>
                            </div>

                            <ArcadeButton
                                type="submit"
                                variant="solid"
                                size="lg"
                                className="w-full"
                                loading={submitting}
                            >
                                {submitting
                                    ? t('جارٍ إنشاء الحساب', 'Creating account')
                                    : t('إنشاء الحساب وإرسال الطلب', 'Create account and submit')}
                            </ArcadeButton>
                        </form>
                    </ArcadeCard>

                    <p className="mt-7 text-center text-[14px] font-medium" style={{ color: A.inkSoft }}>
                        {t('لديك حساب بالفعل؟', 'Already have an account?')}{' '}
                        <Link to="/login" className="arc-link arc-focus">
                            {t('تسجيل الدخول', 'Log in')}
                        </Link>
                    </p>
                </div>
            </div>
        </Layout>
    );
}
