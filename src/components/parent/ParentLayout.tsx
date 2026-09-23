import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    LayoutDashboard,
    Users,
    LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.png';

const navItems = [
    { path: '/parent', icon: LayoutDashboard, label: { ar: 'لوحة التحكم', en: 'Dashboard' }, exact: true },
    { path: '/parent/students', icon: Users, label: { ar: 'أبنائي', en: 'My Students' } },
];

export default function ParentLayout() {
    const { t } = useLanguage();
    const { profile, signOut } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const isActive = (path: string, exact?: boolean) => {
        if (exact) return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-secondary/30">
            <div className="flex">
                {/* Sidebar */}
                <aside className="fixed lg:sticky top-0 z-40 h-screen w-64 bg-background border-e border-border hidden lg:block">
                    <div className="flex flex-col h-full">
                        <div className="flex items-center h-14 px-4 border-b border-border">
                            <Link to="/parent">
                                <img src={logo} alt="Waraq Academy" className="h-14" />
                            </Link>
                        </div>

                        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${isActive(item.path, item.exact)
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                        }`}
                                >
                                    <item.icon className="w-4 h-4" />
                                    {t(item.label.ar, item.label.en)}
                                </Link>
                            ))}
                        </nav>

                        <div className="p-3 border-t border-border">
                            <div className="px-3 py-2 mb-2">
                                <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || profile?.email}</p>
                                <p className="text-xs text-muted-foreground">{t('ولي أمر', 'Parent')}</p>
                            </div>
                            <Button
                                variant="ghost" size="sm"
                                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                                onClick={handleSignOut}
                            >
                                <LogOut className="w-4 h-4" />
                                {t('تسجيل الخروج', 'Sign Out')}
                            </Button>
                        </div>
                    </div>
                </aside>

                {/* Main content */}
                <main className="flex-1 min-h-screen">
                    <div className="p-4 lg:p-6">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
