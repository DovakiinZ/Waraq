import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import logo from '@/assets/logo.png';

export default function AcceptInvite() {
    const { token } = useParams<{ token: string }>();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const [invite, setInvite] = useState<{
        email: string;
        full_name: string;
    } | null>(null);
    const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'expired'>('loading');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        async function validateInvite() {
            if (!token) {
                setStatus('invalid');
                return;
            }

            const { data, error } = await supabase
                .from('teacher_invites')
                .select('email, full_name, status, expires_at')
                .eq('token', token)
                .single();

            if (error || !data) {
                setStatus('invalid');
                return;
            }

            if (data.status === 'accepted') {
                setStatus('invalid');
                return;
            }

            if (new Date(data.expires_at) < new Date()) {
                setStatus('expired');
                return;
            }

            setInvite({ email: data.email, full_name: data.full_name });
            setStatus('valid');
        }

        validateInvite();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError(t('كلمات المرور غير متطابقة', 'Passwords do not match'));
            return;
        }

        if (password.length < 6) {
            setError(t('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'Password must be at least 6 characters'));
            return;
        }

        setIsSubmitting(true);

        try {
            // Create user account
            const { error: signUpError } = await supabase.auth.signUp({
                email: invite!.email,
                password,
                options: {
                    data: {
                        full_name: invite!.full_name,
                        role: 'teacher'
                    }
                }
            });

            if (signUpError) {
                setError(signUpError.message);
                setIsSubmitting(false);
                return;
            }

            // Mark invite as accepted
            await supabase
                .from('teacher_invites')
                .update({ status: 'accepted' })
                .eq('token', token);

            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(t('حدث خطأ، يرجى المحاولة مرة أخرى', 'An error occurred, please try again'));
            setIsSubmitting(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (status === 'invalid' || status === 'expired') {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <Link to="/">
                        <img src={logo} alt="Waraq Academy" className="h-24 mx-auto mb-6" />
                    </Link>

                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-8 h-8 text-destructive" />
                    </div>

                    <h1 className="text-2xl font-semibold text-foreground mb-2">
                        {status === 'expired'
                            ? t('انتهت صلاحية الدعوة', 'Invitation Expired')
                            : t('رابط غير صالح', 'Invalid Link')
                        }
                    </h1>

                    <p className="text-muted-foreground mb-6">
                        {status === 'expired'
                            ? t('انتهت صلاحية هذه الدعوة. يرجى التواصل مع المسؤول للحصول على دعوة جديدة.', 'This invitation has expired. Please contact the administrator for a new invitation.')
                            : t('رابط الدعوة غير صالح أو تم استخدامه مسبقاً.', 'This invitation link is invalid or has already been used.')
                        }
                    </p>

                    <Button asChild>
                        <Link to="/">{t('العودة للرئيسية', 'Back to Home')}</Link>
                    </Button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>

                    <h1 className="text-2xl font-semibold text-foreground mb-2">
                        {t('تم إنشاء حسابك بنجاح', 'Account Created Successfully')}
                    </h1>

                    <p className="text-muted-foreground">
                        {t('جاري تحويلك لصفحة تسجيل الدخول...', 'Redirecting to login page...')}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <Link to="/">
                        <img src={logo} alt="Waraq Academy" className="h-24 mx-auto mb-4" />
                    </Link>
                    <h1 className="text-xl font-semibold text-foreground">
                        {t('إكمال التسجيل', 'Complete Registration')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('مرحباً', 'Welcome')}, <strong>{invite?.full_name}</strong>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('البريد الإلكتروني', 'Email')}</Label>
                        <Input value={invite?.email || ''} disabled />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">{t('كلمة المرور', 'Password')}</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('أدخل كلمة المرور', 'Enter password')}
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">{t('تأكيد كلمة المرور', 'Confirm Password')}</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t('أعد إدخال كلمة المرور', 'Re-enter password')}
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            t('إنشاء الحساب', 'Create Account')
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
