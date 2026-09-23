import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    Menu,
    X,
    LayoutDashboard,
    BookOpen,
    Award,
    MessageSquare,
    User,
    LogOut,
    Settings,
} from 'lucide-react';
import logo from '@/assets/logo.png';

const drawerNavItems = [
    { path: '/student', icon: LayoutDashboard, label: { ar: 'الرئيسية', en: 'Home' }, exact: true },
    { path: '/student/subjects', icon: BookOpen, label: { ar: 'موادي', en: 'My Subjects' } },
    { path: '/student/certificates', icon: Award, label: { ar: 'شهاداتي', en: 'Certificates' } },
    { path: '/student/messages', icon: MessageSquare, label: { ar: 'الرسائل', en: 'Messages' } },
    { path: '/student/profile', icon: User, label: { ar: 'الملف الشخصي', en: 'Profile' } },
];

export default function MobileHeader() {
    const { t, toggleLanguage, language } = useLanguage();
    const { profile, signOut } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const isActive = (path: string, exact?: boolean) => {
        if (exact) return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    const handleSignOut = async () => {
        setDrawerOpen(false);
        await signOut();
        // signOut() handles navigation to /login internally
    };

    return (
        <>
            {/* ── Sticky Header Bar ── */}
            <header
                className="sticky top-0 z-50 flex items-center justify-between bg-background/95 backdrop-blur-md border-b border-border/60"
                style={{ height: 56 }}
            >
                {/* Hamburger */}
                <button
                    onClick={() => setDrawerOpen(true)}
                    className="flex items-center justify-center w-14 h-14 text-foreground active:bg-secondary/60 transition-colors"
                    aria-label="Open menu"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {/* Logo */}
                <Link to="/student" className="flex items-center">
                    <img src={logo} alt="Waraq Academy" className="h-10" />
                </Link>
            </header>

            {/* ── Full-screen Drawer ── */}
            {/* Overlay */}
            <div
                className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={() => setDrawerOpen(false)}
            />

            {/* Drawer Panel */}
            <aside
                className={`fixed top-0 z-[70] h-full w-[280px] bg-background shadow-2xl flex flex-col transition-transform duration-300 ease-out ${drawerOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'
                    }`}
                style={{ insetInlineStart: 0 }}
            >
                {/* Drawer Header */}
                <div className="flex items-center justify-between h-14 px-4 border-b border-border/60">
                    <img src={logo} alt="Waraq Academy" className="h-10" />
                    <button
                        onClick={() => setDrawerOpen(false)}
                        className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-secondary transition-colors"
                        aria-label="Close menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* User Info */}
                <div className="px-4 py-4 border-b border-border/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">
                                {profile?.full_name || profile?.email}
                            </p>
                            <p className="text-xs text-muted-foreground">{t('طالب', 'Student')}</p>
                        </div>
                    </div>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
                    {drawerNavItems.map((item) => {
                        const active = isActive(item.path, item.exact);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setDrawerOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${active
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-[0.98]'
                                    }`}
                            >
                                <item.icon className="w-[18px] h-[18px]" />
                                {t(item.label.ar, item.label.en)}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer Actions */}
                <div className="p-4 border-t border-border/40 space-y-2">
                    {/* Language toggle */}
                    <button
                        onClick={() => {
                            toggleLanguage();
                            setDrawerOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                        <Settings className="w-[18px] h-[18px]" />
                        {language === 'ar' ? 'English' : 'عربي'}
                    </button>

                    {/* Sign Out */}
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                        <LogOut className="w-[18px] h-[18px]" />
                        {t('تسجيل الخروج', 'Sign Out')}
                    </button>
                </div>
            </aside>
        </>
    );
}
