import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LogOut, Sun, Moon, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobileLayout } from '@/hooks/use-mobile';
import MobileLayout from '@/layouts/MobileLayout';
import { Logo } from '@/components/brand/Logo';
import { roleNavItems } from '@/config/nav';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useTeacherGuideSteps } from '@/components/setup/useGuideSteps';

const navItems = roleNavItems.teacher;

// A pending (is_active=false) teacher can open every page. Approval gates
// PUBLISHING only — migration 113's trigger refuses it in the database. This
// layout used to redirect pending teachers away from everything but the
// dashboard and profile, which since migration 118 (every new teacher starts
// pending) meant a new teacher could not create a course at all.

export default function TeacherLayout() {
    const { t, language } = useLanguage();
    const { profile, signOut } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const isMobile = useIsMobileLayout();
    const { isDark, toggle: toggleDarkMode } = useDarkMode();

    const isPending = profile?.is_active === false;
    const { steps: setupSteps } = useTeacherGuideSteps();
    const setupDone = setupSteps.filter((s) => s.done).length;
    const showSetup = setupSteps.length > 0 && setupDone < setupSteps.length;

    if (isMobile) {
        return <MobileLayout role="teacher" />;
    }

    const isActive = (path: string, exact?: boolean) => {
        if (exact) return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    const handleSignOut = async () => {
        await signOut();
        // signOut() handles navigation to /login internally
    };

    return (
        <div className="min-h-screen bg-secondary/30">
            <div className="flex">
                {/* Desktop Sidebar */}
                <aside className="sticky top-0 z-40 h-screen w-64 bg-background border-e border-border">
                    <div className="flex flex-col h-full">
                        <div className="flex items-center h-14 px-4 border-b border-border">
                            {/* Logo hard-codes its text colour, so the variant must follow dark mode */}
                            <Link to="/teacher" aria-label={t('ورق أكاديمي', 'Waraq Academy')}>
                                <Logo size={32} lang={language} variant={isDark ? 'dark' : 'light'} />
                            </Link>
                        </div>

                        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                            {isPending && (
                                <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                                    <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                                    <span className="text-xs text-amber-700 dark:text-amber-400">
                                        {t('قيد المراجعة', 'Pending Review')}
                                    </span>
                                </div>
                            )}
                            {showSetup && (
                                <Link
                                    to="/teacher/start"
                                    className={`flex items-center justify-between gap-3 px-3 py-2 mb-2 rounded-md text-sm font-semibold border transition-colors ${isActive('/teacher/start') ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:bg-secondary'}`}
                                >
                                    <span>{t('ابدأ هنا', 'Start here')}</span>
                                    <span className="text-xs tabular-nums" dir="ltr">{setupDone}/{setupSteps.length}</span>
                                </Link>
                            )}
                            {navItems.map((item) => {
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`
                                            flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors
                                            ${isActive(item.path, item.exact)
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                            }
                                        `}
                                    >
                                        <item.icon className="w-4 h-4" />
                                        {t(item.label.ar, item.label.en)}
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="p-3 border-t border-border">
                            <div className="px-3 py-2 mb-2 flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || profile?.email}</p>
                                    <p className="text-xs text-muted-foreground">{t('معلم', 'Teacher')}</p>
                                </div>
                                <button
                                    onClick={toggleDarkMode}
                                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary flex-shrink-0"
                                >
                                    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                </button>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                                onClick={handleSignOut}
                            >
                                <LogOut className="w-4 h-4" />
                                {t('تسجيل الخروج', 'Sign Out')}
                            </Button>
                        </div>
                    </div>
                </aside>

                <main className="flex-1 min-h-screen">
                    <div className="p-4 lg:p-6">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
