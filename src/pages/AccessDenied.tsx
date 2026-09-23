import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ShieldX, ArrowRight, ArrowLeft } from 'lucide-react';
import logo from '@/assets/logo.png';

export default function AccessDenied() {
    const { t, direction } = useLanguage();
    const { isSuperAdmin, isTeacher, signOut } = useAuth();
    const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

    // Determine where to redirect based on role
    const dashboardPath = isSuperAdmin ? '/admin' : isTeacher ? '/teacher' : '/';

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="text-center max-w-md">
                <Link to="/">
                    <img src={logo} alt="Waraq Academy" className="h-24 mx-auto mb-6" />
                </Link>

                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                    <ShieldX className="w-8 h-8 text-destructive" />
                </div>

                <h1 className="text-2xl font-semibold text-foreground mb-2">
                    {t('غير مصرح بالدخول', 'Access Denied')}
                </h1>

                <p className="text-muted-foreground mb-6">
                    {t(
                        'ليس لديك صلاحية للوصول إلى هذه الصفحة. يرجى التواصل مع المسؤول إذا كنت تعتقد أن هذا خطأ.',
                        'You do not have permission to access this page. Please contact the administrator if you believe this is an error.'
                    )}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild variant="outline">
                        <Link to={dashboardPath}>
                            {t('العودة للوحة التحكم', 'Back to Dashboard')}
                            <ArrowIcon className="w-4 h-4 ms-2" />
                        </Link>
                    </Button>

                    <Button variant="ghost" onClick={() => signOut()}>
                        {t('تسجيل الخروج', 'Sign Out')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
