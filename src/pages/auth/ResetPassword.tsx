import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';

export default function ResetPassword() {
    const { updatePassword, isAuthenticated } = useAuth();
    const { t, direction } = useLanguage();
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

    const validateForm = () => {
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
            const { error: updateError } = await updatePassword(password);

            if (updateError) {
                if (updateError.message.includes('should be different')) {
                    setError(t('كلمة المرور الجديدة يجب أن تختلف عن القديمة', 'New password must be different from the old one'));
                } else {
                    setError(updateError.message);
                }
                return;
            }

            // Success
            setSuccess(true);
            toast.success(t('تم تغيير كلمة المرور بنجاح', 'Password changed successfully'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Show success message
    if (success) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-8">
                        <Link to="/">
                            <img src={logo} alt="Waraq Academy" className="h-24 mx-auto mb-4" />
                        </Link>
                    </div>

                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
                        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                        <h2 className="text-lg font-semibold text-foreground mb-2">
                            {t('تم تغيير كلمة المرور!', 'Password Changed!')}
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            {t(
                                'يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.',
                                'You can now sign in with your new password.'
                            )}
                        </p>
                        <Link to="/login">
                            <Button className="w-full">
                                {t('الذهاب لتسجيل الدخول', 'Go to Sign In')}
                                <ArrowIcon className="w-4 h-4 ms-2" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link to="/">
                        <img src={logo} alt="Waraq Academy" className="h-24 mx-auto mb-4" />
                    </Link>
                    <h1 className="text-xl font-semibold text-foreground">
                        {t('إعادة تعيين كلمة المرور', 'Reset Password')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('أدخل كلمة المرور الجديدة', 'Enter your new password')}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password">{t('كلمة المرور الجديدة', 'New Password')}</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t('كلمة مرور قوية', 'Strong password')}
                                required
                                disabled={isSubmitting}
                                autoComplete="new-password"
                                className="pe-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('6 أحرف على الأقل', 'At least 6 characters')}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">{t('تأكيد كلمة المرور', 'Confirm Password')}</Label>
                        <Input
                            id="confirmPassword"
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t('أعد إدخال كلمة المرور', 'Re-enter password')}
                            required
                            disabled={isSubmitting}
                            autoComplete="new-password"
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            t('تغيير كلمة المرور', 'Change Password')
                        )}
                    </Button>
                </form>

                {/* Back to login */}
                <div className="mt-6 text-center">
                    <Link
                        to="/login"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {t('العودة لتسجيل الدخول', 'Back to Sign In')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
