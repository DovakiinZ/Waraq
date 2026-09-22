import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, AlertCircle } from 'lucide-react';

/**
 * Hands a Supabase session from the mobile app to this web app.
 *
 * The Flutter app opens the admin panel in a WebView. The WebView has its own
 * cookie/localStorage jar, so the user would otherwise have to log in a second
 * time. The app instead navigates here with the tokens in the URL **hash**:
 *
 *   /auth/bridge#at=...&rt=...&redirect=%2Fadmin
 *
 * The parameters are deliberately NOT called access_token/refresh_token: the
 * client is created with detectSessionInUrl, and supabase-js would try to
 * consume those names itself (and throw on the missing expires_in) before we
 * ever run.
 *
 * The hash is never sent to the server, so the tokens stay on the device. We
 * call setSession() with them, drop them from the address bar, and continue to
 * the requested page.
 *
 * `redirect` is restricted to in-app paths so this cannot be used as an open
 * redirect that leaks a session to another origin.
 */
export default function AuthBridge() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const run = async () => {
            const hash = window.location.hash.startsWith('#')
                ? window.location.hash.slice(1)
                : window.location.hash;
            const params = new URLSearchParams(hash);

            const accessToken = params.get('at');
            const refreshToken = params.get('rt');

            const requested = params.get('redirect') || '/admin';
            // Only same-app absolute paths. Reject "//evil.com" and "https://…".
            const redirect = requested.startsWith('/') && !requested.startsWith('//')
                ? requested
                : '/admin';

            if (!accessToken || !refreshToken) {
                setError(t('رابط الدخول غير صالح', 'Invalid sign-in link'));
                return;
            }

            const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });

            if (sessionError) {
                console.error('AuthBridge setSession failed:', sessionError);
                setError(t('تعذر تسجيل الدخول', 'Could not sign you in'));
                return;
            }

            // Clear the tokens out of the address bar before moving on.
            window.history.replaceState({}, '', window.location.pathname);
            navigate(redirect, { replace: true });
        };

        run();
    }, [navigate, t]);

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            {error ? (
                <div className="text-center space-y-3">
                    <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
                    <p className="text-muted-foreground">{error}</p>
                </div>
            ) : (
                <div className="text-center space-y-3">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground">
                        {t('جارٍ فتح لوحة الإدارة...', 'Opening the admin panel...')}
                    </p>
                </div>
            )}
        </div>
    );
}
