import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LogOut, Menu, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useState } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import logo from '@/assets/logo.png';
import {
  type UserRole,
  type NavItem,
  roleNavItems,
  roleBasePath,
  roleLabel,
  studentBottomNavItems,
} from '@/config/nav';
import { useDarkMode } from '@/hooks/useDarkMode';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  role: UserRole;
}

export default function MobileLayout({ role }: MobileLayoutProps) {
  const { t, direction } = useLanguage();
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isDark, toggle: toggleDarkMode } = useDarkMode();

  const navItems = roleNavItems[role];
  const basePath = roleBasePath[role];
  const label = roleLabel[role];
  const isStudent = role === 'student';

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
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 h-14 flex items-center justify-between safe-area-top">
        <Link to={basePath}>
          <img src={logo} alt="Waraq Academy" className="h-14" />
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleDarkMode}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md"
          >
            {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>
          {!isStudent && (
            <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className={cn(
        "flex-1",
        isStudent ? 'pb-16' : '',
        // Disable default padding for the lesson editor to allow it to be full-screen
        location.pathname.includes('/lessons/') && !location.pathname.endsWith('/lessons') && "px-0 py-0"
      )}>
        <div className={cn("px-4 py-4", location.pathname.includes('/lessons/') && !location.pathname.endsWith('/lessons') && "px-0 py-0")}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>

      {/* Student: Bottom Navigation */}
      {isStudent && (
        <nav className="fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border safe-area-bottom">
          <div className="flex items-center justify-around h-16">
            {studentBottomNavItems.map((item) => {
              const active = isActive(item.path, item.exact);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${active
                      ? 'text-primary'
                      : 'text-muted-foreground'
                    }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">
                    {t(item.label.ar, item.label.en)}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Teacher/Admin: Drawer (Sheet) */}
      {!isStudent && (
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent
            side={direction === 'rtl' ? 'right' : 'left'}
            className="w-72 p-0 safe-area-inset"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>{t('القائمة', 'Menu')}</SheetTitle>
            </SheetHeader>

            {/* Drawer logo */}
            <div className="flex items-center h-14 px-4 border-b border-border">
              <Link to={basePath} onClick={() => setDrawerOpen(false)}>
                <img src={logo} alt="Waraq Academy" className="h-14" />
              </Link>
            </div>

            {/* Drawer nav */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setDrawerOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors
                    ${isActive(item.path, item.exact)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }
                  `}
                >
                  <item.icon className="w-4 h-4" />
                  {t(item.label.ar, item.label.en)}
                </Link>
              ))}
            </nav>

            {/* Drawer user section */}
            <div className="mt-auto p-3 border-t border-border">
              <div className="px-3 py-2 mb-2">
                <p className="text-sm font-medium text-foreground truncate">
                  {profile?.full_name || profile?.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(label.ar, label.en)}
                </p>
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
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
