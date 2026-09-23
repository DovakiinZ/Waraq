// Student registration, styled in the arcade (green + white) language to match
// the landing page. Split layout: a gradient brand panel beside the form at
// desktop, form only on mobile.
//
// Only presentation changed here. The auth flow, validation rules, field ids,
// field order and autoComplete values are all preserved, since analytics and
// browser autofill depend on them.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowRight, ArrowLeft, Eye, EyeOff, AlertCircle, CheckCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import { A, PIXEL_STRIP } from '@/components/arcade/theme';
import { ArcadeBrand, ArcadeButton, ArcadeCard, ArcadeField, ArcadeLink } from '@/components/arcade/primitives';

export default function Register() {
    const { signUp, role, isAuthenticated, redirectByRole, isLoading: authLoading } = useAuth();
    const { t, direction } = useLanguage();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // If already authenticated, redirect based on role
    useEffect(() => {
        if (!authLoading && isAuthenticated && role) {
            redirectByRole(role);
        }
    }, [authLoading, isAuthenticated, role, redirectByRole]);

    const validateForm = () => {
        if (fullName.trim().length < 2) {
            setError(t('الاسم يجب أن يكون حرفين على الأقل', 'Name must be at least 2 characters'));
            return false;
        }

        if (password.length < 6) {
            setError(t('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'Password must be at least 6 characters'));
            return false;
        }

        if (password !== confirmPassword) {
            setError(t('كلمتا المرور غير متطابقتين', 'Passwords do not match'));
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setError('');

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const { error: signUpError } = await signUp(email, password, fullName);

            if (signUpError) {
                if (signUpError.message.includes('already registered')) {
                    setError(t('هذا البريد الإلكتروني مسجل بالفعل', 'This email is already registered'));
                } else if (signUpError.message.includes('Password')) {
                    setError(t('كلمة المرور ضعيفة جداً', 'Password is too weak'));
                } else {
                    setError(signUpError.message);
                }
                return;
            }

            // Success
            setSuccess(true);
            toast.success(t('تم إنشاء الحساب بنجاح', 'Account created successfully'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

    // Success state
    if (success) {
        return (
            <div
                className="flex min-h-[100dvh] flex-col items-center justify-center p-5 font-arabic"
                style={{ background: A.bg }}
            >
                <div className="w-full max-w-md">
                    <div className="mb-8 flex justify-center">
                        <ArcadeBrand size={40} />
                    </div>

                    <ArcadeCard className="p-8 text-center">
                        <span
                            className="mx-auto flex h-14 w-14 items-center justify-center border-2"
                            style={{ background: A.accent, color: A.onAccent, borderColor: A.line }}
                        >
                            <CheckCircle className="h-7 w-7" />
                        </span>
                        <h2 className="mt-5 text-[24px] font-black" style={{ color: A.ink }}>
                            {t('تم إنشاء الحساب', 'Account created')}
                        </h2>
                        <p
                            className="mx-auto mt-3 max-w-[38ch] text-[15px] font-medium leading-relaxed"
                            style={{ color: A.inkSoft }}
                        >
                            {t(
                                'تحقق من بريدك الإلكتروني لتأكيد حسابك، ثم سجّل الدخول.',
                                'Check your email to confirm your account, then sign in.',
                            )}
                        </p>
                        <div className="mt-7">
                            <ArcadeLink to="/login" variant="solid" className="w-full">
                                {t('الذهاب لتسجيل الدخول', 'Go to sign in')}
                                <ArrowIcon className="h-4 w-4" />
                            </ArcadeLink>
                        </div>
                    </ArcadeCard>
                </div>
            </div>
        );
    }

    return (
        <div
            className="grid min-h-[100dvh] font-arabic lg:grid-cols-[0.9fr_1.1fr]"
            style={{ background: A.bg }}
        >
            {/* Brand panel. Desktop only: on mobile it would push the form
                below the fold for no benefit. */}
            <aside
                className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex"
                style={{ background: A.grad }}
            >
                <ArcadeBrand size={40} onDark />

                <div>
                    <h2
                        className="text-[38px] font-black leading-[1.1] tracking-tight"
                        style={{ color: A.onInk }}
                    >
                        {t('ارفع مستواك', 'Level up in every')}
                        <br />
                        <span style={{ color: A.accent }}>
                            {t('في كل مادة', 'school subject')}
                        </span>
                    </h2>

                    <ul className="mt-9 space-y-4">
                        {[
                            { ar: 'مواد مرتّبة حسب مرحلتك الدراسية', en: 'Subjects ordered by your grade' },
                            { ar: 'دروس بالفيديو وتمارين واختبارات قصيرة', en: 'Video lessons, exercises and short quizzes' },
                            { ar: 'شهادة قابلة للتحقق عند إتمام المادة', en: 'A verifiable certificate when you finish' },
                        ].map((item) => (
                            <li key={item.en} className="flex items-start gap-3">
                                <span
                                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center"
                                    style={{ background: A.accent, color: A.onAccent }}
                                >
                                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                </span>
                                <span
                                    className="text-[15px] font-semibold leading-relaxed"
                                    style={{ color: A.onInkMuted }}
                                >
                                    {t(item.ar, item.en)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="h-[6px] w-full opacity-40" style={{ background: PIXEL_STRIP }} aria-hidden />
            </aside>

            {/* Form */}
            <main className="flex items-center justify-center p-5 py-12 lg:p-12">
                <div className="w-full max-w-[420px]">
                    {/* Compact brand lockup, mobile only. */}
                    <ArcadeBrand size={36} className="mb-8 lg:hidden" />

                    <h1
                        className="text-[30px] font-black leading-tight tracking-tight sm:text-[36px]"
                        style={{ color: A.ink }}
                    >
                        {t('إنشاء حساب طالب', 'Create a student account')}
                    </h1>
                    <p className="mt-3 text-[15px] font-medium" style={{ color: A.inkSoft }}>
                        {t('انضم إلى ورق أكاديمي اليوم.', 'Join Waraq Academy today.')}
                    </p>

                    {/* Teacher route. Uses Link, not <a>, so it does not reload
                        the whole app. */}
                    <div
                        className="mt-6 border-2 p-3.5"
                        style={{ background: A.wash, borderColor: A.line }}
                    >
                        <p className="text-[13px] font-semibold" style={{ color: A.ink }}>
                            {t('هل أنت معلّم؟', 'Are you a teacher?')}{' '}
                            <Link to="/apply/teacher" className="arc-link arc-focus">
                                {t('قدّم كمعلّم من هنا', 'Teach with us here')}
                            </Link>
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                        <ArcadeField id="fullName" label={t('الاسم الكامل', 'Full name')}>
                            <input
                                id="fullName"
                                className="arc-input"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder={t('أدخل اسمك الكامل', 'Enter your full name')}
                                required
                                disabled={isSubmitting}
                                autoComplete="name"
                            />
                        </ArcadeField>

                        <ArcadeField id="email" label={t('البريد الإلكتروني', 'Email')}>
                            <input
                                id="email"
                                className="arc-input"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t('أدخل بريدك الإلكتروني', 'Enter your email')}
                                required
                                disabled={isSubmitting}
                                autoComplete="email"
                            />
                        </ArcadeField>

                        <ArcadeField
                            id="password"
                            label={t('كلمة المرور', 'Password')}
                            hint={t('6 أحرف على الأقل', 'At least 6 characters')}
                        >
                            <div className="relative">
                                <input
                                    id="password"
                                    className="arc-input pe-12"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={t('كلمة مرور قوية', 'Strong password')}
                                    required
                                    disabled={isSubmitting}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="arc-focus absolute end-3 top-1/2 -translate-y-1/2"
                                    style={{ color: A.inkSoft }}
                                    aria-label={
                                        showPassword
                                            ? t('إخفاء كلمة المرور', 'Hide password')
                                            : t('إظهار كلمة المرور', 'Show password')
                                    }
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </ArcadeField>

                        <ArcadeField id="confirmPassword" label={t('تأكيد كلمة المرور', 'Confirm password')}>
                            <input
                                id="confirmPassword"
                                className="arc-input"
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder={t('أعد إدخال كلمة المرور', 'Re-enter password')}
                                required
                                disabled={isSubmitting}
                                autoComplete="new-password"
                            />
                        </ArcadeField>

                        {error && (
                            <div
                                className="flex items-start gap-2.5 border-2 p-3"
                                style={{
                                    borderColor: 'hsl(var(--destructive))',
                                    background: 'hsl(var(--destructive) / 0.08)',
                                }}
                                role="alert"
                            >
                                <AlertCircle
                                    className="mt-0.5 h-4 w-4 shrink-0"
                                    style={{ color: 'hsl(var(--destructive))' }}
                                />
                                <p
                                    className="text-[13px] font-bold"
                                    style={{ color: 'hsl(var(--destructive))' }}
                                >
                                    {error}
                                </p>
                            </div>
                        )}

                        <ArcadeButton
                            type="submit"
                            variant="solid"
                            className="w-full"
                            loading={isSubmitting}
                        >
                            {!isSubmitting && t('إنشاء الحساب', 'Create account')}
                            {isSubmitting && t('جارٍ الإنشاء', 'Creating')}
                            {!isSubmitting && <ArrowIcon className="h-4 w-4" />}
                        </ArcadeButton>
                    </form>

                    <p className="mt-7 text-[14px] font-medium" style={{ color: A.inkSoft }}>
                        {t('لديك حساب بالفعل؟', 'Already have an account?')}{' '}
                        <Link to="/login" className="arc-link arc-focus">
                            {t('تسجيل الدخول', 'Log in')}
                        </Link>
                    </p>

                    <p className="mt-3 text-[14px] font-medium">
                        <Link to="/" className="arc-focus" style={{ color: A.inkSoft }}>
                            {t('العودة للرئيسية', 'Back to home')}
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
