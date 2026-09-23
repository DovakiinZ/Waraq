// Sign in, styled in the arcade (green + white) language to match Register and
// the landing page. Same split layout so the two auth pages feel like a pair.
//
// Only presentation changed. The auth flow, error mapping, forgot-password
// flow, field ids, field order and autoComplete values are all preserved.
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { roleBasePath } from '@/config/nav';
import { ArrowRight, ArrowLeft, Eye, EyeOff, AlertCircle, CheckCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import { A, PIXEL_STRIP } from '@/components/arcade/theme';
import { ArcadeButton, ArcadeCard, ArcadeField } from '@/components/arcade/primitives';
import logo from '@/assets/logo.png';

export default function Login() {
    const { signIn, resetPassword, role, isAuthenticated, isBootstrapped, isLoading: authLoading } = useAuth();
    const { t, direction } = useLanguage();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Forgot password state
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotSubmitting, setForgotSubmitting] = useState(false);
    const [forgotSuccess, setForgotSuccess] = useState(false);

    // If already authenticated and bootstrapped, redirect to the correct dashboard
    useEffect(() => {
        if (!authLoading && isBootstrapped && isAuthenticated && role) {
            navigate(roleBasePath[role] ?? '/', { replace: true });
        }
    }, [authLoading, isBootstrapped, isAuthenticated, role, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setError('');
        setIsSubmitting(true);

        try {
            const { error: signInError } = await signIn(email, password);

            if (signInError) {
                // Map common error codes to user-friendly messages
                if (signInError.message.includes('Invalid login credentials')) {
                    setError(t('البريد الإلكتروني أو كلمة المرور غير صحيحة', 'Invalid email or password'));
                } else if (signInError.message.includes('Email not confirmed')) {
                    setError(t('يرجى تأكيد بريدك الإلكتروني أولاً', 'Please confirm your email first'));
                } else if (signInError.message.includes('Network')) {
                    setError(t('خطأ في الاتصال، حاول مرة أخرى', 'Network error, please try again'));
                } else {
                    setError(signInError.message);
                }
                return;
            }

            // Success - the auth state change will trigger redirect
            toast.success(t('تم تسجيل الدخول بنجاح', 'Signed in successfully'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (forgotSubmitting) return;

        setForgotSubmitting(true);

        try {
            const { error } = await resetPassword(forgotEmail);

            if (error) {
                toast.error(t('فشل إرسال رابط إعادة التعيين', 'Failed to send reset link'), {
                    description: error.message,
                });
                return;
            }

            setForgotSuccess(true);
            toast.success(t('تم إرسال رابط إعادة التعيين', 'Reset link sent'), {
                description: t('تحقق من بريدك الإلكتروني', 'Check your email'),
            });
        } finally {
            setForgotSubmitting(false);
        }
    };

    const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

    const BrandLockup = ({ onDark }: { onDark?: boolean }) => (
        <Link to="/" className="arc-focus flex items-center gap-2.5">
            <img
                src={logo}
                alt=""
                className="h-9 w-9 object-contain"
                style={{
                    border: `2px solid ${onDark ? A.onInk : A.line}`,
                    background: onDark ? 'transparent' : A.surface,
                }}
            />
            <span
                className="text-[17px] font-black"
                style={{ color: onDark ? A.onInk : A.ink }}
            >
                {t('أكاديمية أيمن', 'Ayman Academy')}
            </span>
        </Link>
    );

    // Forgot password flow, presented on its own so the primary form stays
    // uncluttered.
    if (showForgotPassword) {
        return (
            <div
                className="flex min-h-[100dvh] flex-col items-center justify-center p-5 font-arabic"
                style={{ background: A.bg }}
            >
                <div className="w-full max-w-[420px]">
                    <div className="mb-8 flex justify-center">
                        <BrandLockup />
                    </div>

                    {forgotSuccess ? (
                        <ArcadeCard className="p-8 text-center">
                            <span
                                className="mx-auto flex h-14 w-14 items-center justify-center border-2"
                                style={{ background: A.accent, color: A.onAccent, borderColor: A.line }}
                            >
                                <CheckCircle className="h-7 w-7" />
                            </span>
                            <h2 className="mt-5 text-[22px] font-black" style={{ color: A.ink }}>
                                {t('تحقق من بريدك', 'Check your email')}
                            </h2>
                            <p
                                className="mx-auto mt-3 max-w-[38ch] text-[15px] font-medium leading-relaxed"
                                style={{ color: A.inkSoft }}
                            >
                                {t(
                                    'أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.',
                                    'We sent a password reset link to your email.',
                                )}
                            </p>
                            <div className="mt-7">
                                <ArcadeButton
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                        setShowForgotPassword(false);
                                        setForgotSuccess(false);
                                        setForgotEmail('');
                                    }}
                                >
                                    {t('العودة لتسجيل الدخول', 'Back to sign in')}
                                </ArcadeButton>
                            </div>
                        </ArcadeCard>
                    ) : (
                        <ArcadeCard className="p-8">
                            <h1
                                className="text-[26px] font-black leading-tight tracking-tight"
                                style={{ color: A.ink }}
                            >
                                {t('نسيت كلمة المرور', 'Forgot password')}
                            </h1>
                            <p
                                className="mt-3 text-[15px] font-medium leading-relaxed"
                                style={{ color: A.inkSoft }}
                            >
                                {t(
                                    'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.',
                                    'Enter your email and we will send you a reset link.',
                                )}
                            </p>

                            <form onSubmit={handleForgotPassword} className="mt-7 space-y-5">
                                <ArcadeField id="forgot-email" label={t('البريد الإلكتروني', 'Email')}>
                                    <input
                                        id="forgot-email"
                                        className="arc-input"
                                        type="email"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        placeholder={t('أدخل بريدك الإلكتروني', 'Enter your email')}
                                        required
                                        disabled={forgotSubmitting}
                                        autoComplete="email"
                                    />
                                </ArcadeField>

                                <ArcadeButton
                                    type="submit"
                                    variant="solid"
                                    className="w-full"
                                    loading={forgotSubmitting}
                                >
                                    {forgotSubmitting
                                        ? t('جارٍ الإرسال', 'Sending')
                                        : t('إرسال الرابط', 'Send reset link')}
                                </ArcadeButton>

                                <ArcadeButton
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => setShowForgotPassword(false)}
                                >
                                    {t('العودة لتسجيل الدخول', 'Back to sign in')}
                                </ArcadeButton>
                            </form>
                        </ArcadeCard>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            className="grid min-h-[100dvh] font-arabic lg:grid-cols-[0.9fr_1.1fr]"
            style={{ background: A.bg }}
        >
            {/* Brand panel, desktop only. */}
            <aside
                className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex"
                style={{ background: A.grad }}
            >
                <BrandLockup onDark />

                <div>
                    <h2
                        className="text-[38px] font-black leading-[1.1] tracking-tight"
                        style={{ color: A.onInk }}
                    >
                        {t('أكمل من حيث', 'Pick up where')}
                        <br />
                        <span style={{ color: A.accent }}>{t('توقّفت', 'you left off')}</span>
                    </h2>

                    <ul className="mt-9 space-y-4">
                        {[
                            { ar: 'تقدّمك في كل درس محفوظ', en: 'Your progress in every lesson is saved' },
                            { ar: 'موادك ومعلّموك في مكان واحد', en: 'Your subjects and teachers in one place' },
                            { ar: 'شهاداتك متاحة للتحقق في أي وقت', en: 'Your certificates stay verifiable anytime' },
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
                    <div className="mb-8 lg:hidden">
                        <BrandLockup />
                    </div>

                    <h1
                        className="text-[30px] font-black leading-tight tracking-tight sm:text-[36px]"
                        style={{ color: A.ink }}
                    >
                        {t('تسجيل الدخول', 'Sign in')}
                    </h1>
                    <p className="mt-3 text-[15px] font-medium" style={{ color: A.inkSoft }}>
                        {t('أدخل بياناتك للمتابعة.', 'Enter your details to continue.')}
                    </p>

                    <form onSubmit={handleSubmit} className="mt-7 space-y-5">
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

                        <ArcadeField id="password" label={t('كلمة المرور', 'Password')}>
                            <div className="relative">
                                <input
                                    id="password"
                                    className="arc-input pe-12"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={t('أدخل كلمة المرور', 'Enter your password')}
                                    required
                                    disabled={isSubmitting}
                                    autoComplete="current-password"
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

                        <div className="text-end">
                            <button
                                type="button"
                                onClick={() => setShowForgotPassword(true)}
                                className="arc-link arc-focus text-[13px]"
                            >
                                {t('نسيت كلمة المرور؟', 'Forgot password?')}
                            </button>
                        </div>

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
                            {!isSubmitting && t('دخول', 'Sign in')}
                            {isSubmitting && t('جارٍ الدخول', 'Signing in')}
                            {!isSubmitting && <ArrowIcon className="h-4 w-4" />}
                        </ArcadeButton>
                    </form>

                    <p className="mt-7 text-[14px] font-medium" style={{ color: A.inkSoft }}>
                        {t('ليس لديك حساب؟', "Don't have an account?")}{' '}
                        <Link to="/register" className="arc-link arc-focus">
                            {t('إنشاء حساب طالب', 'Create a student account')}
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
